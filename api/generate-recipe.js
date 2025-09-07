// api/generate-recipe.js
import { GoogleGenAI } from "@google/genai";

// Vercel Node.js Functions expose request.body/query/cookies for you.
// (No need for body-parser; just send application/json from the client.)
export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("Allow", ["POST"]);
      return response.status(405).json({ error: "Method Not Allowed" });
    }

    const { 
      ingredients, 
      servingSize, 
      goalType, 
      cuisine, 
      dietaryRestrictions, 
      unitSystem, 
      recipeCount 
    } = request.body || {};

    // Validate required fields
    if (!ingredients || !servingSize || !goalType || !cuisine || !recipeCount) {
      return response.status(400).json({ 
        error: 'Missing required fields: ingredients, servingSize, goalType, cuisine, recipeCount' 
      });
    }

    // Build a comprehensive prompt for Nourish 'N' Flourish
    const calorieRange = goalType === 'cut' ? 'under 250 calories' : 
                        goalType === 'no_goal' ? '250-400 calories (balanced)' : 
                        'above 400 calories';
    
    let dietaryInstructions = '';
    if (dietaryRestrictions && dietaryRestrictions.trim()) {
      dietaryInstructions = `

DIETARY RESTRICTIONS TO FOLLOW:
- ${dietaryRestrictions.trim()}
- ALL recipes must strictly comply with these restrictions
- Do NOT use any ingredients that violate these restrictions
- Ensure all cooking methods and ingredients are compliant`;
    }
    
    const prompt = `You are a professional chef and nutritionist for Nourish 'N' Flourish. Create exactly ${recipeCount} unique recipes using ONLY these ingredients: ${ingredients}${dietaryInstructions}

CRITICAL REQUIREMENTS:
- Use ONLY the ingredients listed above
- Do NOT add any ingredients not in the list
- Create EXACTLY ${recipeCount} recipes; no more, no less. 
- Each recipe must be ${calorieRange}
- Each recipe must be ${goalType === 'cut' ? 'cut-friendly' : goalType === 'no_goal' ? 'balanced and nutritious' : 'bulk-friendly'}
- Provide detailed, step-by-step cooking instructions
- Include specific ingredient quantities and cooking methods
- ${dietaryRestrictions && dietaryRestrictions.trim() ? 'STRICTLY follow all dietary restrictions provided' : ''}
- CUISINE REQUIREMENT: ALL recipes MUST be ${cuisine} cuisine. Use authentic ${cuisine} cooking methods, spices, and techniques. Do NOT create generic recipes - make them truly ${cuisine} authentic.

FORMAT EACH RECIPE EXACTLY LIKE THIS:

=== RECIPE 1 ===
Recipe Title: [Creative, descriptive name]
Cuisine: [Specific cuisine type]
Prep Time + Cook Time: [e.g., 15 minutes + 25 minutes]
Number of Servings (per average adult) + Serving Size: [e.g., 2 servings (1 plate)]
Caloric Amount per general serving for adults: [specific number]
Balance Factor: [MUST include ALL categories: protein, carbs, fiber, vitamins, fats - e.g., 30% protein, 35% carbs, 15% fiber, 10% vitamins, 10% fats]
Goal Type: [${goalType === 'cut' ? 'cut-friendly' : goalType === 'no_goal' ? 'balanced and nutritious' : 'bulk-friendly'}]
Cooking Required: [Yes/No - specify if this recipe requires cooking or can be made without heat]
Required Tools: [List specific tools needed: pan, blender, peeler, knife, cutting board, etc.]

List of Ingredients:
- [ingredient name] - [amount/quantity in ${unitSystem === 'metric' ? 'metric units (g, ml, kg)' : 'customary units (oz, cups, tbsp, tsp)'}] (protein/carbs/fiber/vitamins/fats)
- [ingredient name] - [amount/quantity in ${unitSystem === 'metric' ? 'metric units (g, ml, kg)' : 'customary units (oz, cups, tbsp, tsp)'}] (protein/carbs/fiber/vitamins/fats)
- [continue with all ingredients used]

Actual recipe steps:
1. [Detailed step using specific ingredients and quantities]
2. [Detailed step using specific ingredients and quantities]
3. [Continue with all steps]

Substitutes: [Specific substitution suggestions]

Cultural Background: [Write 2-3 COMPLETE sentences about THIS SPECIFIC DISH's history, cultural significance, and ethnic symbolism. Make it unique to this recipe. Do NOT cut off mid-sentence. Provide the FULL cultural background without truncation.]

CRITICAL REQUIREMENTS:
- You MUST include the "List of Ingredients:" section with ONLY the ingredients actually used in this specific recipe
- Each ingredient MUST show its exact amount/quantity in ${unitSystem === 'metric' ? 'metric units (g, ml, kg)' : 'customary units (oz, cups, tbsp, tsp)'} and ALL applicable dietary classes (protein, carbs, fiber, vitamins, fats)
- Each Cultural Background MUST be unique to that specific dish, not generic
- Cultural Background MUST be complete and not truncated - write full sentences until the end
- Do NOT skip any sections
- EVERY recipe MUST include ALL dietary categories (protein, carbs, fiber, vitamins, fats) in the Balance Factor
- Ensure each recipe has a balanced nutritional profile with all categories represented
- IMPORTANT: Only list ingredients that are actually used in the cooking steps of this recipe

=== RECIPE 2 ===
[Repeat exact same format]

=== RECIPE 3 ===
[Repeat exact same format]

=== RECIPE 4 ===
[Repeat exact same format]

=== RECIPE 5 ===
[Repeat exact same format]

=== RECIPE 6 ===
[Repeat exact same format]

=== RECIPE 7 ===
[Repeat exact same format]

Remember: Use ONLY these ingredients: ${ingredients}. Each recipe must be unique and include detailed cooking instructions. ${dietaryRestrictions && dietaryRestrictions.trim() ? `All recipes must comply with: ${dietaryRestrictions.trim()}` : ''}

CUISINE ENFORCEMENT: Every single recipe MUST be authentic ${cuisine} cuisine. Use traditional ${cuisine} cooking techniques, authentic ${cuisine} spices and seasonings, and follow ${cuisine} culinary traditions. Do NOT create generic recipes - make them genuinely ${cuisine} authentic.`;

    // The SDK picks up GEMINI_API_KEY or GOOGLE_API_KEY automatically from env.
    const ai = new GoogleGenAI({});

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash", // Using the model from your original setup
      contents: prompt,
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8000,
      }
    });

    // result.text contains the model text
    const generatedText = result?.text || "";
    
    if (!generatedText) {
      throw new Error('No response from AI model');
    }

    // Parse the generated text into structured recipes (simplified version)
    const recipes = parseRecipesFromText(generatedText, goalType, ingredients, unitSystem, parseInt(recipeCount));

    return response.status(200).json({ 
      success: true, 
      recipes: recipes,
      rawResponse: generatedText 
    });

  } catch (err) {
    console.error('Recipe generation error:', err);
    return response.status(500).json({ 
      success: false, 
      error: err?.message || "Server error" 
    });
  }
}

// Simplified recipe parsing function
function parseRecipesFromText(text, goalType, originalIngredients, unitSystem, recipeCount) {
  const recipes = [];
  
  // Split by recipe sections
  const recipeSections = text.split(/=== RECIPE \d+ ===/).filter(section => section.trim());
  
  recipeSections.forEach((section, index) => {
    if (section.trim().length < 100) return;
    
    try {
      const recipe = parseSingleRecipe(section, goalType, originalIngredients, unitSystem);
      if (recipe) {
        recipes.push(recipe);
      }
    } catch (error) {
      console.error(`Error parsing recipe ${index + 1}:`, error);
    }
  });
  
  return recipes.slice(0, recipeCount);
}

function parseSingleRecipe(text, goalType, originalIngredients, unitSystem) {
  // Extract recipe information using regex patterns
  const titleMatch = text.match(/Recipe Title:\s*(.+?)(?:\n|$)/i);
  const cuisineMatch = text.match(/Cuisine:\s*(.+?)(?:\n|$)/i);
  const timeMatch = text.match(/Prep Time.*?Cook Time:\s*(.+?)(?:\n|$)/i);
  const servingsMatch = text.match(/Number of Servings.*?Serving Size:\s*(.+?)(?:\n|$)/i);
  const caloriesMatch = text.match(/Caloric Amount.*?(\d+)/i);
  const balanceMatch = text.match(/Balance Factor:\s*(.+?)(?:\n|$)/i);
  const cookingMatch = text.match(/Cooking Required:\s*(.+?)(?:\n|$)/i);
  const toolsMatch = text.match(/Required Tools:\s*(.+?)(?:\n|$)/i);
  
  if (!titleMatch) return null;
  
  const title = titleMatch[1].trim();
  const cuisine = cuisineMatch ? cuisineMatch[1].trim() : 'Global';
  const timeInfo = timeMatch ? timeMatch[1].trim() : '15 minutes + 20 minutes';
  const servingsInfo = servingsMatch ? servingsMatch[1].trim() : '2 servings (1 plate)';
  const calories = caloriesMatch ? parseInt(caloriesMatch[1]) : (goalType === 'cut' ? 220 : goalType === 'no_goal' ? 325 : 450);
  const balanceFactor = balanceMatch ? balanceMatch[1].trim() : '40% carbs, 30% protein, 30% fats';
  const requiresCooking = cookingMatch ? cookingMatch[1].trim().toLowerCase().includes('yes') : true;
  const tools = toolsMatch ? toolsMatch[1].trim() : 'Basic kitchen tools';
  
  // Extract ingredients (simplified)
  const ingredients = extractIngredients(text, unitSystem, originalIngredients);
  
  // Extract steps
  const steps = extractSteps(text);
  
  // Extract substitutes and history
  const substitutes = extractSubstitutes(text);
  const history = extractHistory(text);
  
  return {
    title,
    cuisine,
    prepTime: timeInfo.split('+')[0]?.trim() || '15 minutes',
    cookTime: timeInfo.split('+')[1]?.trim() || '20 minutes',
    servings: servingsInfo.split('(')[0]?.trim() || '2',
    servingSize: servingsInfo.match(/\(([^)]+)\)/)?.[1] || '1 plate',
    calories,
    balanceFactor,
    goalType,
    requiresCooking,
    tools,
    ingredients,
    steps,
    substitutes,
    history
  };
}

function extractIngredients(text, unitSystem, originalIngredients) {
  const patterns = [
    /List of Ingredients:(.*?)(?=Actual recipe steps|Recipe steps|Steps:|Instructions:|$)/is,
    /Ingredients:(.*?)(?=Instructions:|Steps:|$)/is,
  ];
  
  let ingredientMatches = null;
  for (const pattern of patterns) {
    ingredientMatches = text.match(pattern);
    if (ingredientMatches) break;
  }
  
  if (!ingredientMatches) {
    // Fallback to original ingredients
    return originalIngredients.split(/[,\n]/).filter(item => item.trim()).map(item => ({
      name: item.trim(),
      amount: getDefaultAmount(item.trim(), unitSystem),
      category: [getDietaryCategory(item.trim(), 'ingredient')]
    }));
  }
  
  const ingredientText = ingredientMatches[1];
  const lines = ingredientText.split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    const match = line.match(/[-•*]\s*(.+?)(?:\s*\(([^)]+)\))?/);
    if (match) {
      const ingredientName = match[1].trim();
      const category = match[2]?.trim() || 'ingredient';
      
      const amountMatch = ingredientName.match(/^(.+?)\s*-\s*(.+)$/);
      let name = ingredientName;
      let amount = '1 portion';
      
      if (amountMatch) {
        name = amountMatch[1].trim();
        amount = amountMatch[2].trim();
      }
      
      return {
        name: name,
        amount: amount,
        category: [getDietaryCategory(name, category)]
      };
    }
    return null;
  }).filter(ing => ing && ing.name && ing.name.length > 2);
}

function extractSteps(text) {
  const patterns = [
    /Actual recipe steps:(.*?)(?=Substitutes|Cultural Background|History|=== RECIPE|$)/is,
    /Instructions:(.*?)(?=Substitutes|Cultural Background|History|=== RECIPE|$)/is,
  ];
  
  let stepsMatch = null;
  for (const pattern of patterns) {
    stepsMatch = text.match(pattern);
    if (stepsMatch) break;
  }
  
  if (!stepsMatch) {
    return ["Follow the recipe instructions provided by the AI"];
  }
  
  const stepsText = stepsMatch[1];
  const lines = stepsText.split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    return line.trim().replace(/^\d+\.\s*/, '').replace(/^[-•*]\s*/, '');
  }).filter(step => step.length > 5);
}

function extractSubstitutes(text) {
  const patterns = [
    /Substitutes:(.*?)(?=Cultural Background|History|=== RECIPE|$)/is,
    /Substitutions:(.*?)(?=Cultural Background|History|=== RECIPE|$)/is,
  ];
  
  let substitutesMatch = null;
  for (const pattern of patterns) {
    substitutesMatch = text.match(pattern);
    if (substitutesMatch) break;
  }
  
  return substitutesMatch ? substitutesMatch[1].trim() : "Feel free to substitute ingredients based on your preferences and dietary needs.";
}

function extractHistory(text) {
  const patterns = [
    /Cultural Background:(.*?)(?==== RECIPE|$)/is,
    /History:(.*?)(?==== RECIPE|$)/is,
  ];
  
  let historyMatch = null;
  for (const pattern of patterns) {
    historyMatch = text.match(pattern);
    if (historyMatch) break;
  }
  
  let history = historyMatch ? historyMatch[1].trim() : "";
  
  if (history) {
    history = history.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  if (!history || history.length < 30) {
    const titleMatch = text.match(/Recipe Title:\s*(.+?)(?:\n|$)/i);
    const cuisineMatch = text.match(/Cuisine:\s*(.+?)(?:\n|$)/i);
    
    const title = titleMatch ? titleMatch[1].trim() : "this dish";
    const cuisine = cuisineMatch ? cuisineMatch[1].trim() : "global";
    
    history = `This ${title.toLowerCase()} represents a modern interpretation of ${cuisine.toLowerCase()} culinary traditions. The dish showcases how traditional cooking methods can be adapted to contemporary tastes while maintaining authentic flavors and cultural significance.`;
  }
  
  return history;
}

function getDefaultAmount(ingredientName, unitSystem) {
  const name = ingredientName.toLowerCase();
  
  if (unitSystem === 'metric') {
    if (name.includes('oil') || name.includes('butter')) return '15ml';
    if (name.includes('salt') || name.includes('pepper')) return '5g';
    if (name.includes('chicken') || name.includes('beef')) return '150g';
    if (name.includes('rice') || name.includes('pasta')) return '100g';
    return '100g';
  } else {
    if (name.includes('oil') || name.includes('butter')) return '1 tbsp';
    if (name.includes('salt') || name.includes('pepper')) return '1 tsp';
    if (name.includes('chicken') || name.includes('beef')) return '5 oz';
    if (name.includes('rice') || name.includes('pasta')) return '1/2 cup';
    return '1/2 cup';
  }
}

function getDietaryCategory(ingredientName, originalCategory) {
  const name = ingredientName.toLowerCase();
  
  if (['protein', 'carbs', 'fiber', 'vitamins', 'fats', 'minerals'].includes(originalCategory.toLowerCase())) {
    return originalCategory;
  }
  
  if (name.includes('chicken') || name.includes('beef') || name.includes('fish') || name.includes('egg')) {
    return 'protein';
  }
  if (name.includes('rice') || name.includes('pasta') || name.includes('bread')) {
    return 'carbs';
  }
  if (name.includes('spinach') || name.includes('broccoli') || name.includes('lettuce')) {
    return 'fiber';
  }
  if (name.includes('tomato') || name.includes('carrot') || name.includes('bell pepper')) {
    return 'vitamins';
  }
  if (name.includes('oil') || name.includes('avocado') || name.includes('cheese')) {
    return 'fats';
  }
  
  return 'ingredient';
}
