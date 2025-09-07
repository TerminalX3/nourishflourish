// Recipe Generator JavaScript

class RecipeGenerator {
    constructor() {
        this.form = document.getElementById('recipeForm');
        this.loadingSection = document.getElementById('loadingSection');
        this.resultsSection = document.getElementById('results');
        this.recipesContainer = document.getElementById('recipesContainer');
        this.generateButton = document.querySelector('.generate-button');
        this.newRecipeBtn = document.getElementById('newRecipeBtn');
        this.printRecipesBtn = document.getElementById('printRecipesBtn');
        
        this.currentRecipes = []; // Store recipes for modal display
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.newRecipeBtn.addEventListener('click', () => this.resetForm());
        this.printRecipesBtn.addEventListener('click', () => this.printRecipes());
        
        // Add smooth scrolling for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(this.form);
        const ingredients = formData.get('ingredients').trim();
        const servingSize = formData.get('servingSize');
        const goalType = formData.get('goalType');
        const cuisine = formData.get('cuisine');
        const dietaryRestrictions = formData.get('dietaryRestrictions').trim();
        const unitSystem = formData.get('unitSystem') || 'metric';
        const recipeCount = formData.get('recipeCount');
        
        if (!ingredients || !servingSize || !goalType || !cuisine || !recipeCount) {
            this.showError('Please fill in all required fields');
            return;
        }
        
        this.unitSystem = unitSystem;
        this.requestedRecipeCount = parseInt(recipeCount); // Store requested count
        
        this.showLoading();
        this.hideResults();
        
        try {
            const recipes = await this.generateRecipes(ingredients, servingSize, goalType, cuisine, dietaryRestrictions, unitSystem, recipeCount);
            this.displayRecipes(recipes);
        } catch (error) {
            console.error('Error generating recipes:', error);
            
            // Handle dietary restriction conflicts
            if (error.message && error.message.includes('Dietary restriction conflict')) {
                try {
                    const errorData = JSON.parse(error.message);
                    this.showDietaryConflictError(errorData.message, errorData.suggestions);
                } catch (e) {
                    this.showError(error.message);
                }
            } else {
                this.showError(error.message || 'Failed to generate recipes. Please check your API configuration and try again.');
            }
        } finally {
            this.hideLoading();
        }
    }

    async generateRecipes(ingredients, servingSize, goalType, cuisine, dietaryRestrictions, unitSystem, recipeCount) {
        const response = await fetch('/api/generate-recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ingredients,
                servingSize,
                goalType,
                cuisine,
                dietaryRestrictions,
                unitSystem,
                recipeCount
            })
        });

        if (!response.ok) {
            let errorData;
            try {
                const responseText = await response.text();
                if (responseText) {
                    errorData = JSON.parse(responseText);
                } else {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
            } catch (parseError) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            
            if (errorData && errorData.error === 'Dietary restriction conflict detected') {
                throw new Error(JSON.stringify({
                    message: errorData.message,
                    suggestions: errorData.suggestions
                }));
            }
            throw new Error(errorData?.error || 'Failed to generate recipes');
        }

        let data;
        try {
            const responseText = await response.text();
            if (!responseText) {
                throw new Error('Empty response from server');
            }
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            throw new Error('Invalid response format from server');
        }
        
        if (!data.success) {
            throw new Error(data.error || 'Recipe generation failed');
        }

        return data.recipes;
    }

    buildPrompt(ingredients, servingSize, goalType, cuisine) {
        const calorieRange = goalType === 'cut' ? 'under 250 calories' : 'above 400 calories';
        const goalText = goalType === 'cut' ? 'cut-friendly' : 'bulk-friendly';
        
        return `You are a great nutritionist that specializes in global cuisine and creates meals that are easy to make for teenagers - use these ingredients and these ingredients only: (${ingredients}) to curate 6 delicious recipes for the user. All recipes should be ${calorieRange} if they are cut-friendly and above 400 calories if they are bulk-friendly. Ensure the meals are balanced in terms of carbs, fats, vitamins, fiber, and protein (following the general outline of the Plate Method) and output the recipes with this framework: Recipe Title, Cuisine, Prep Time + Cook Time, Number of Servings (per average adult) + Serving Size, Caloric Amount per general serving for adults, Balance Factor (% of different dietary categories as they are balanced in the meal), whether the meal is "bulk" friendly or "cut" friendly, List of Ingredients (for each, mention what dietary class each falls into), Actual recipe steps, Substitutes for ingredients as possible, 2-3 concluding sentences about the history of the dish in relation to the cuisine. Make sure that there are no recipe repeats and that all recipes are provided in one message. Ensure that all recipes encompass a truly global cuisine (and for ethnic recipes, list their ethnic name along with the Western name).`;
    }



    displayRecipes(recipes) {
        this.currentRecipes = recipes; // Store recipes for modal display
        this.recipesContainer.innerHTML = recipes.map((recipe, index) => 
            this.createRecipeCardView(recipe, index + 1)
        ).join('');
        
        // Add notice if fewer recipes were generated than requested
        if (this.requestedRecipeCount && recipes.length < this.requestedRecipeCount) {
            const notice = `
                <div class="recipe-count-notice">
                    <i class="fas fa-info-circle"></i>
                    <p>Due to limitations in available ingredients and dietary restrictions, we were only able to generate ${recipes.length} recipe${recipes.length === 1 ? '' : 's'} instead of the requested ${this.requestedRecipeCount}.</p>
                </div>
            `;
            this.recipesContainer.innerHTML += notice;
        }
        
        this.showResults();
        this.scrollToResults();
    }



    createRecipeCardView(recipe, index) {
        // Get unique dietary categories from all ingredients
        const allCategories = new Set();
        recipe.ingredients.forEach(ingredient => {
            if (ingredient.category && Array.isArray(ingredient.category)) {
                ingredient.category.forEach(cat => allCategories.add(cat));
            } else if (ingredient.category) {
                allCategories.add(ingredient.category);
            }
        });
        
        const categoriesList = Array.from(allCategories).slice(0, 4).join(', ');
        
        return `
            <div class="recipe-card-compact" onclick="recipeGenerator.showRecipeModal(${index - 1})">
                <div class="card-front">
                    <h3 class="recipe-title-compact">${recipe.title}</h3>
                    <div class="recipe-meta-compact">
                        <span class="meta-item-compact">${recipe.cuisine}</span>
                        <span class="meta-item-compact">${recipe.requiresCooking ? 'Cook' : 'No-Cook'}</span>
                    </div>
                    <div class="recipe-preview">
                        <div class="preview-stats">
                            <span><i class="fas fa-clock"></i> ${recipe.prepTime} + ${recipe.cookTime}</span>
                            <span><i class="fas fa-fire"></i> ${recipe.calories} cal</span>
                        </div>
                        <div class="preview-categories">
                            <strong>Dietary Categories:</strong> ${categoriesList}${allCategories.size > 4 ? '...' : ''}
                        </div>
                    </div>
                    <div class="expand-hint">
                        <i class="fas fa-eye"></i> Click to view full recipe
                    </div>
                </div>
            </div>
        `;
    }

    showRecipeModal(recipeIndex) {
        if (recipeIndex >= 0 && recipeIndex < this.currentRecipes.length) {
            const recipe = this.currentRecipes[recipeIndex];
            this.createRecipeModal(recipe, recipeIndex + 1);
        }
    }

    createRecipeModal(recipe, index) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'recipe-modal-overlay';
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                this.closeRecipeModal();
            }
        };

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'recipe-modal-content';

        // Generate ingredients list with categories
        let ingredientsList = '';
        if (recipe.ingredients && recipe.ingredients.length > 0) {
            ingredientsList = recipe.ingredients.map(ingredient => {
                const categories = Array.isArray(ingredient.category) ? ingredient.category : [ingredient.category];
                const categoryIcons = categories.map(cat => `<i class="${getCategoryIcon(cat)}"></i>`).join('');
                const categoryBadges = categories.map(cat => {
                    const categoryClass = cat.toLowerCase();
                    return `<span class="category-badge ${categoryClass}">${cat}</span>`;
                }).join('');
                
                const amount = ingredient.amount || '1 portion';
                const categoriesJson = JSON.stringify(categories).replace(/"/g, '&quot;');
                
                return `<div class="ingredient-item" onclick="recipeGenerator.showIngredientModal('${ingredient.name.replace(/'/g, "\\'")}', '${amount.replace(/'/g, "\\'")}', JSON.parse('${categoriesJson}'))">
                    <div class="ingredient-icons">${categoryIcons}</div>
                    <span><strong>${ingredient.name}</strong> <span class="ingredient-amount">${amount}</span> ${categoryBadges}</span>
                </div>`;
            }).join('');
        }

        // Generate steps list
        const stepsList = recipe.steps.map((step, stepIndex) => 
            `<li>
                <div class="step-number">${stepIndex + 1}</div>
                <div class="step-content">${step}</div>
            </li>`
        ).join('');

        // Create balance pie chart
        const balanceChart = createBalancePieChart(recipe.balanceFactor);

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>${recipe.title}</h2>
                <button class="modal-close-btn" onclick="recipeGenerator.closeRecipeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="recipe-meta-modal">
                    <div class="meta-info-section">
                        <div class="meta-items-container">
                            <div class="meta-item">
                                <i class="fas fa-globe"></i>
                                <span>${recipe.cuisine}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-clock"></i>
                                <span>Prep: ${recipe.prepTime} | Cook: ${recipe.cookTime}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-users"></i>
                                <span>${recipe.servings} (${recipe.servingSize})</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-fire"></i>
                                <span>${recipe.calories} calories per serving</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-tools"></i>
                                <span>${recipe.tools || 'Basic kitchen tools'}</span>
                            </div>
                        </div>
                        <div class="balance-chart-section">
                            <h4>Nutritional Balance</h4>
                            ${balanceChart}
                        </div>
                    </div>
                </div>

                <div class="recipe-ingredients-modal">
                    <h4><i class="fas fa-carrot"></i> Ingredients</h4>
                    <div class="ingredients-list-modal">
                        ${ingredientsList}
                    </div>
                </div>

                <div class="recipe-steps-modal">
                    <h4><i class="fas fa-list-ol"></i> Instructions</h4>
                    <ol class="steps-list-modal">
                        ${stepsList}
                    </ol>
                </div>

                <div class="recipe-substitutes-modal">
                    <h4><i class="fas fa-exchange-alt"></i> Substitutes</h4>
                    <div class="substitutes-content">
                        ${recipe.substitutes}
                    </div>
                </div>

                <div class="recipe-history-modal">
                    <h4><i class="fas fa-book"></i> Cultural Background</h4>
                    <p>${recipe.history || "This recipe draws inspiration from global culinary traditions and showcases the versatility of the ingredients used."}</p>
                </div>

                <div class="modal-actions">
                    <button class="print-single-recipe-btn" onclick="recipeGenerator.printSingleRecipe(${index - 1})">
                        <i class="fas fa-print"></i>
                        Print Recipe
                    </button>
                </div>

                <div class="recipe-feedback">
                    <h4>Was this recipe helpful?</h4>
                    <div class="feedback-buttons">
                        <button class="feedback-btn like-btn" onclick="recipeGenerator.submitFeedback('like', ${index - 1})">
                            <i class="fas fa-thumbs-up"></i>
                        </button>
                        <button class="feedback-btn dislike-btn" onclick="recipeGenerator.submitFeedback('dislike', ${index - 1})">
                            <i class="fas fa-thumbs-down"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Add animation class after a brief delay
        setTimeout(() => {
            modalOverlay.classList.add('show');
        }, 10);
    }

    closeRecipeModal() {
        const modal = document.querySelector('.recipe-modal-overlay');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    createRecipeCard(recipe, index) {
        // Ensure ingredients are always displayed
        let ingredientsList = '';
        if (recipe.ingredients && recipe.ingredients.length > 0) {
            ingredientsList = recipe.ingredients.map(ingredient => {
                const categories = Array.isArray(ingredient.category) ? ingredient.category : [ingredient.category];
                const categoryIcons = categories.map(cat => `<i class="${getCategoryIcon(cat)}"></i>`).join('');
                const categoryBadges = categories.map(cat => {
                    const categoryClass = cat.toLowerCase();
                    return `<span class="category-badge ${categoryClass}">${cat}</span>`;
                }).join('');
                
                // Use the exact amount from the recipe, don't override with defaults
                const amount = ingredient.amount || '1 portion';
                
                const categoriesJson = JSON.stringify(categories).replace(/"/g, '&quot;');
                return `<div class="ingredient-item" onclick="recipeGenerator.showIngredientModal('${ingredient.name.replace(/'/g, "\\'")}', '${amount.replace(/'/g, "\\'")}', JSON.parse('${categoriesJson}'))">
                    <div class="ingredient-icons">${categoryIcons}</div>
                    <span><strong>${ingredient.name}</strong> <span class="ingredient-amount">${amount}</span> ${categoryBadges}</span>
                </div>`;
            }).join('');
        } else {
            ingredientsList = `
                <div class="ingredient-item">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span><em>Ingredients not found in AI response. Please check the raw response for details.</em></span>
                </div>
            `;
        }
        
        const stepsList = recipe.steps.map((step, stepIndex) => 
            `<li>
                <div class="step-number">${stepIndex + 1}</div>
                <div class="step-content">${step}</div>
            </li>`
        ).join('');
        
        return `
            <div class="recipe-card">
                <div class="recipe-header">
                    <h3 class="recipe-title">${recipe.title}</h3>
                    <div class="recipe-meta">
                        <span class="meta-item">${recipe.cuisine}</span>
                        <span class="meta-item">${recipe.requiresCooking ? 'Cook' : 'No-Cook'}</span>
                                                 <button class="print-recipe-btn" onclick="recipeGenerator.printSingleRecipe(${index - 1})">
                            <i class="fas fa-print"></i>
                            <span>Print Recipe</span>
                        </button>
                    </div>
                </div>
                
                <div class="recipe-details">
                    <div class="recipe-stats">
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span>Prep: ${recipe.prepTime} | Cook: ${recipe.cookTime}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            <span>${recipe.servings} (${recipe.servingSize})</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-fire"></i>
                            <span>${recipe.calories} calories per serving</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-tools"></i>
                            <span>${recipe.tools || 'Basic kitchen tools'}</span>
                        </div>
                    </div>
                    
                    <div class="recipe-balance">
                        <div class="balance-chart-container">
                            ${createBalancePieChart(recipe.balanceFactor)}
                        </div>
                    </div>
                </div>
                
                
                <div class="recipe-ingredients">
                    <h4><i class="fas fa-carrot"></i> Ingredients</h4>
                    <div class="ingredients-list">
                        ${ingredientsList}
                    </div>
                </div>
                
                <div class="recipe-steps">
                    <h4><i class="fas fa-list-ol"></i> Instructions</h4>
                    <ol class="steps-list">
                        ${stepsList}
                    </ol>
                </div>
                
                <div class="recipe-substitutes">
                    <h4><i class="fas fa-exchange-alt"></i> Substitutes</h4>
                    <div class="substitutes-list">
                        ${recipe.substitutes}
                    </div>
                </div>
                
                <div class="recipe-history">
                    <h4><i class="fas fa-book"></i> Cultural Background</h4>
                    <p>${recipe.history || "This recipe draws inspiration from global culinary traditions and showcases the versatility of the ingredients used."}</p>
                </div>
            </div>
        </div>
        `;
    }

    showLoading() {
        this.loadingSection.style.display = 'block';
        this.generateButton.classList.add('loading');
        this.generateButton.disabled = true;
    }

    hideLoading() {
        this.loadingSection.style.display = 'none';
        this.generateButton.classList.remove('loading');
        this.generateButton.disabled = false;
    }

    showResults() {
        this.resultsSection.style.display = 'block';
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
    }

    scrollToResults() {
        this.resultsSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }

    resetForm() {
        this.form.reset();
        this.hideResults();
        this.scrollToTop();
    }

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    printRecipes() {
        const printWindow = window.open('', '_blank');
        const recipesContent = this.recipesContainer.innerHTML;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Nourish 'N' Flourish - AI Generated Recipes</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .recipe-card { border: 1px solid #ccc; margin: 20px 0; padding: 20px; page-break-inside: avoid; }
                    .recipe-title { color: #2E7D32; font-size: 24px; margin-bottom: 10px; }
                    .recipe-meta { margin-bottom: 15px; }
                    .meta-item { background: #4CAF50; color: white; padding: 5px 10px; margin-right: 10px; border-radius: 15px; }
                                         .recipe-details { margin-bottom: 20px; }
                     .detail-item { margin: 5px 0; }
                     .recipe-ingredients, .recipe-steps, .recipe-substitutes, .recipe-history { margin-bottom: 20px; }
                     .balance-chart-container { margin: 20px 0; text-align: center; }
                        .balance-pie-chart { width: 300px; height: 100px; margin: 10px auto; }
                     .balance-legend { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 10px; }
                     .legend-item { display: flex; align-items: center; gap: 5px; font-size: 0.8rem; }
                     .legend-color { width: 10px; height: 10px; border-radius: 2px; }
                    .ingredients-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
                    .ingredient-item { padding: 5px; background: #f5f5f5; border-radius: 5px; }
                    .steps-list { list-style: decimal; padding-left: 20px; }
                    .substitutes-list { background: #fff3cd; padding: 15px; border-radius: 5px; }
                    .recipe-history { background: #e8f5e8; padding: 15px; border-radius: 5px; }
                    @media print { .recipe-card { page-break-inside: avoid; } }
                </style>
            </head>
            <body>
                <h1>Nourish 'N' Flourish - AI Generated Recipes</h1>
                <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                ${recipesContent}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        // Handle print window events to prevent lag
        printWindow.onbeforeunload = function() {
            setTimeout(() => {
                if (printWindow.closed) {
                    document.body.style.pointerEvents = 'auto';
                }
            }, 100);
        };
        
        printWindow.onfocus = function() {
            document.body.style.pointerEvents = 'auto';
        };
        
        printWindow.print();
    }

    printSingleRecipe(recipeIndex) {
        // Check if we have current recipes data
        if (this.currentRecipes && recipeIndex >= 0 && recipeIndex < this.currentRecipes.length) {
            const recipe = this.currentRecipes[recipeIndex];
            const printWindow = window.open('', '_blank');
            
            // Generate ingredients list for printing
            let ingredientsList = '';
            if (recipe.ingredients && recipe.ingredients.length > 0) {
                ingredientsList = recipe.ingredients.map(ingredient => {
                    const categories = Array.isArray(ingredient.category) ? ingredient.category : [ingredient.category];
                    const categoryBadges = categories.map(cat => {
                        const categoryClass = cat.toLowerCase();
                        return `<span class="category-badge ${categoryClass}">${cat}</span>`;
                    }).join('');
                    
                    const amount = ingredient.amount || '1 portion';
                    
                    return `<div class="ingredient-item">
                        <span><strong>${ingredient.name}</strong> <span class="ingredient-amount">${amount}</span> ${categoryBadges}</span>
                    </div>`;
                }).join('');
            }

            // Generate steps list for printing
            const stepsList = recipe.steps.map((step, stepIndex) => 
                `<li>
                    <div class="step-number">${stepIndex + 1}</div>
                    <div class="step-content">${step}</div>
                </li>`
            ).join('');

            // Create balance pie chart for printing (using CSS to match modal exactly)
            const balanceChart = createBalancePieChart(recipe.balanceFactor);
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${recipe.title} - Nourish 'N' Flourish</title>
                    <style>
                        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css');
                        
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            margin: 0; 
                            padding: 20px; 
                            background: #f8f9fa;
                            color: #333;
                        }
                        
                        .print-container {
                            max-width: 800px;
                            margin: 0 auto;
                            background: white;
                            padding: 40px;
                            border-radius: 15px;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                        }
                        
                        .recipe-header {
                            text-align: center;
                            margin-bottom: 30px;
                            padding-bottom: 20px;
                            border-bottom: 3px solid #4CAF50;
                        }
                        
                        .recipe-title {
                            color: #2E7D32;
                            font-size: 32px;
                            margin: 0 0 15px 0;
                            font-weight: 700;
                        }
                        
                        .recipe-meta {
                            display: flex;
                            justify-content: center;
                            gap: 15px;
                            flex-wrap: wrap;
                            margin-bottom: 20px;
                        }
                        
                        .meta-item {
                            background: linear-gradient(135deg, #4CAF50, #45a049);
                            color: white;
                            padding: 8px 16px;
                            border-radius: 20px;
                            font-size: 14px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        
                        .recipe-details {
                            margin-bottom: 30px;
                            padding: 20px;
                            background: #f8f9fa;
                            border-radius: 10px;
                        }
                        
                        .recipe-meta {
                            display: flex;
                            gap: 15px;
                            flex-wrap: wrap;
                            margin-bottom: 20px;
                        }
                        
                        .recipe-stats {
                            display: flex;
                            flex-direction: column;
                            gap: 12px;
                        }
                        
                        .detail-item {
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            font-size: 16px;
                            position: relative;
                            padding-left: 20px;
                        }
                        
                        .detail-item::before {
                            content: "•";
                            color: #4CAF50;
                            font-weight: bold;
                            position: absolute;
                            left: 0;
                            top: 0;
                        }
                        
                        .detail-item i {
                            color: #4CAF50;
                            width: 20px;
                            text-align: center;
                            font-size: 18px;
                        }
                        
                        .recipe-ingredients, .recipe-steps, .recipe-substitutes, .recipe-history {
                            margin-bottom: 30px;
                        }
                        
                        .section-title {
                            color: #2E7D32;
                            font-size: 24px;
                            margin-bottom: 15px;
                            padding-bottom: 8px;
                            border-bottom: 2px solid #4CAF50;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        }
                        
                        .section-title i {
                            color: #4CAF50;
                        }
                        
                        .ingredients-list {
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                            gap: 12px;
                        }
                        
                        .ingredient-item {
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            padding: 12px 15px;
                            background: white;
                            border-radius: 8px;
                            border-left: 4px solid #4CAF50;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        }
                        
                        .category-badge {
                            display: inline-block;
                            padding: 2px 6px;
                            border-radius: 10px;
                            font-size: 11px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.3px;
                            margin-left: 5px;
                        }
                        
                        .category-badge.protein {
                            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                            color: white;
                        }
                        
                        .category-badge.carbs {
                            background: linear-gradient(135deg, #feca57, #ff9ff3);
                            color: #2c3e50;
                        }
                        
                        .category-badge.fiber {
                            background: linear-gradient(135deg, #48dbfb, #0abde3);
                            color: white;
                        }
                        
                        .category-badge.vitamins {
                            background: linear-gradient(135deg, #1dd1a1, #10ac84);
                            color: white;
                        }
                        
                        .category-badge.fats {
                            background: linear-gradient(135deg, #ff9ff3, #f368e0);
                            color: white;
                        }
                        
                        .ingredient-amount {
                            color: #666;
                            font-size: 14px;
                            margin-left: 8px;
                            font-weight: normal;
                        }
                        
                        .steps-list {
                            list-style: none;
                            padding: 0;
                        }
                        
                        .steps-list li {
                            display: flex;
                            gap: 15px;
                            margin-bottom: 20px;
                            padding: 15px;
                            background: white;
                            border-radius: 10px;
                            border-left: 4px solid #4CAF50;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        }
                        
                        .step-number {
                            background: linear-gradient(135deg, #4CAF50, #45a049);
                            color: white;
                            width: 35px;
                            height: 35px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: 700;
                            font-size: 16px;
                            flex-shrink: 0;
                        }
                        
                        .step-content {
                            font-size: 16px;
                            line-height: 1.6;
                        }
                        
                        .substitutes-list {
                            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
                            border: 2px solid #ffc107;
                            border-radius: 10px;
                            padding: 20px;
                            font-size: 16px;
                            line-height: 1.6;
                        }
                        
                        .recipe-history {
                            background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
                            border: 2px solid #4CAF50;
                            border-radius: 10px;
                            padding: 20px;
                            font-style: italic;
                            font-size: 16px;
                            line-height: 1.6;
                            color: #2E7D32;
                        }
                        
                        @media print {
                            .meta-info-section {
                                flex-direction: column;
                                gap: 20px;
                            }
                            
                            .balance-chart-section {
                                min-width: auto;
                                width: 100% !important;
                            }
                        }
                        
                        
                        
                        .balance-legend {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 10px;
                            justify-content: center;
                            margin-top: 10px;
                        }
                        
                        .legend-item {
                            display: flex;
                            align-items: center;
                            gap: 5px;
                            font-size: 0.8rem;
                        }
                        
                        .legend-color {
                            width: 10px;
                            height: 10px;
                            border-radius: 2px;
                        }
                        
                        .footer {
                            text-align: center;
                            margin-top: 40px;
                            padding-top: 20px;
                            border-top: 2px solid #4CAF50;
                            color: #666;
                            font-size: 14px;
                        }
                        
                        @media print {
                            body { background: white; }
                            .print-container { 
                                box-shadow: none; 
                                padding: 20px;
                            }
                            .recipe-card { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <div class="recipe-header">
                            <h1 class="recipe-title">${recipe.title}</h1>
                            <div class="recipe-meta">
                                <span class="meta-item">${recipe.cuisine}</span>
                                <span class="meta-item">${recipe.requiresCooking ? 'Cook' : 'No-Cook'}</span>
                            </div>
                        </div>
                        
                        <div class="recipe-details">
                            <div class="recipe-stats">
                                <div class="detail-item">
                                    <i class="fas fa-clock"></i>
                                    <span>Prep: ${recipe.prepTime} | Cook: ${recipe.cookTime}</span>
                                </div>
                                <div class="detail-item">
                                    <i class="fas fa-users"></i>
                                    <span>${recipe.servings} (${recipe.servingSize})</span>
                                </div>
                                <div class="detail-item">
                                    <i class="fas fa-fire"></i>
                                    <span>${recipe.calories} calories per serving</span>
                                </div>
                                <div class="detail-item">
                                    <i class="fas fa-tools"></i>
                                    <span>${recipe.tools || 'Basic kitchen tools'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="recipe-ingredients">
                            <h4 class="section-title"><i class="fas fa-carrot"></i> Ingredients</h4>
                            <div class="ingredients-list">
                                ${ingredientsList}
                            </div>
                        </div>
                        
                        <div class="recipe-steps">
                            <h4 class="section-title"><i class="fas fa-list-ol"></i> Instructions</h4>
                            <ol class="steps-list">
                                ${stepsList}
                            </ol>
                        </div>
                        
                        <div class="recipe-substitutes">
                            <h4 class="section-title"><i class="fas fa-exchange-alt"></i> Substitutes</h4>
                            <div class="substitutes-list">
                                ${recipe.substitutes}
                            </div>
                        </div>
                        
                        <div class="recipe-history">
                            <h4 class="section-title"><i class="fas fa-book"></i> Cultural Background</h4>
                            <p>${recipe.history || "This recipe draws inspiration from global culinary traditions and showcases the versatility of the ingredients used."}</p>
                        </div>
                        
                        <div class="footer">
                            <p>Generated by Nourish 'N' Flourish AI Recipe Generator</p>
                            <p>Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            
            // Handle print window events to prevent lag
            printWindow.onbeforeunload = function() {
                // Clean up any potential issues
                setTimeout(() => {
                    if (printWindow.closed) {
                        // Ensure the main page is responsive after print window closes
                        document.body.style.pointerEvents = 'auto';
                    }
                }, 100);
            };
            
            printWindow.onfocus = function() {
                // Ensure main page remains responsive
                document.body.style.pointerEvents = 'auto';
            };
            
            printWindow.print();
        } else {
            // Fallback to original method for backward compatibility
            const recipeCards = this.recipesContainer.querySelectorAll('.recipe-card');
            if (recipeIndex >= 0 && recipeIndex < recipeCards.length) {
                const recipeCard = recipeCards[recipeIndex];
                const recipeTitle = recipeCard.querySelector('.recipe-title').textContent;
                
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${recipeTitle} - Nourish 'N' Flourish</title>
                        <style>
                            @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css');
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            .recipe-card { border: 1px solid #ccc; margin: 20px 0; padding: 20px; page-break-inside: avoid; }
                            .recipe-title { color: #2E7D32; font-size: 24px; margin-bottom: 10px; }
                            .recipe-meta { margin-bottom: 15px; }
                            .meta-item { background: #4CAF50; color: white; padding: 5px 10px; margin-right: 10px; border-radius: 15px; }
                            .recipe-details { margin-bottom: 20px; }
                            .detail-item { margin: 5px 0; }
                            .recipe-ingredients, .recipe-steps, .recipe-substitutes, .recipe-history { margin-bottom: 20px; }
                            .balance-chart-container { margin: 20px 0; text-align: center; }
                            .balance-pie-chart { width: 100px; height: 100px; margin: 10px auto; }
                            .balance-legend { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 10px; }
                            .legend-item { display: flex; align-items: center; gap: 5px; font-size: 0.8rem; }
                            .legend-color { width: 10px; height: 10px; border-radius: 2px; }
                            .ingredients-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
                            .ingredient-item { padding: 5px; background: #f5f5f5; border-radius: 5px; }
                            .steps-list { list-style: decimal; padding-left: 20px; }
                            .substitutes-list { background: #fff3cd; padding: 15px; border-radius: 5px; }
                            .recipe-history { background: #e8f5e8; padding: 15px; border-radius: 5px; }
                            @media print { .recipe-card { page-break-inside: avoid; } }
                        </style>
                    </head>
                    <body>
                        <h1>Nourish 'N' Flourish - AI Generated Recipes</h1>
                        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                        ${recipeCard.outerHTML}
                    </body>
                    </html>
                `);
                printWindow.document.close();
                
                // Handle print window events to prevent lag
                printWindow.onbeforeunload = function() {
                    setTimeout(() => {
                        if (printWindow.closed) {
                            document.body.style.pointerEvents = 'auto';
                        }
                    }, 100);
                };
                
                printWindow.onfocus = function() {
                    document.body.style.pointerEvents = 'auto';
                };
                
                printWindow.print();
            }
        }
    }

    showError(message) {
        // Create and show error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }

    showDietaryConflictError(message, suggestions) {
        // Create and show dietary conflict error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'dietary-conflict-error';
        
        const suggestionsHtml = suggestions && suggestions.length > 0 
            ? `<div class="suggestions">
                <strong>Suggestions:</strong>
                <ul>${suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
               </div>`
            : '';
        
        errorDiv.innerHTML = `
            <div class="error-header">
                <i class="fas fa-exclamation-triangle"></i>
                <span><strong>Dietary Restriction Conflict</strong></span>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="error-message">${message}</div>
            ${suggestionsHtml}
        `;
        
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
            padding: 20px;
            border-radius: 8px;
            max-width: 400px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        
        // Add styles for the error content
        const style = document.createElement('style');
        style.textContent = `
            .dietary-conflict-error .error-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
                font-weight: bold;
            }
            .dietary-conflict-error .error-message {
                margin-bottom: 10px;
                line-height: 1.4;
            }
            .dietary-conflict-error .suggestions {
                font-size: 0.9rem;
            }
            .dietary-conflict-error .suggestions ul {
                margin: 5px 0;
                padding-left: 20px;
            }
            .dietary-conflict-error .suggestions li {
                margin: 3px 0;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async submitFeedback(type, recipeIndex) {
        try {
            const response = await fetch('/api/recipe-feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type })
            });

            if (response.ok) {
                // Show feedback confirmation
                this.showFeedbackConfirmation(type);
                
                // Disable the feedback buttons to prevent multiple submissions
                const feedbackButtons = document.querySelectorAll('.feedback-btn');
                feedbackButtons.forEach(btn => {
                    btn.disabled = true;
                    btn.style.opacity = '0.6';
                });
            } else {
                console.error('Failed to submit feedback:', response.status, response.statusText);
                // Still show confirmation to user even if server fails
                this.showFeedbackConfirmation(type);
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            // Still show confirmation to user even if network fails
            this.showFeedbackConfirmation(type);
        }
    }

    showFeedbackConfirmation(type) {
        const message = type === 'like' ? 'Thank you! We\'re glad you liked this recipe!' : 'Thank you for your feedback! We\'ll work to improve our recipes.';
        const icon = type === 'like' ? 'fas fa-thumbs-up' : 'fas fa-thumbs-down';
        const color = type === 'like' ? '#4CAF50' : '#ff9800';
        
        // Create feedback notification
        const notification = document.createElement('div');
        notification.className = 'feedback-notification';
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    formatIngredientAmount(amount, ingredientName) {
        // Simply return the amount as provided by the AI - no more overriding
        return amount || '1 portion';
    }

    showIngredientModal(ingredientName, amount, categories) {
        console.log('Modal triggered:', ingredientName, amount, categories);
        
        // Ensure categories is an array
        const categoryArray = Array.isArray(categories) ? categories : [categories];
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'ingredient-modal-overlay';
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                this.closeIngredientModal();
            }
        };

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'ingredient-modal-content';

        // Generate detailed nutritional info using the exact categories from AI
        const nutritionalInfo = this.generateNutritionalInfo(ingredientName, amount, categoryArray);

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>${ingredientName}</h3>
                <button class="modal-close-btn" onclick="recipeGenerator.closeIngredientModal()">
                    <i class="bx bx-x"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="ingredient-details">
                    <div class="ingredient-amount-display">
                        <strong>Amount:</strong> ${amount}
                    </div>
                    <div class="nutritional-breakdown">
                        <h4>Nutritional Breakdown:</h4>
                        <div class="categories-display">
                            <strong>Dietary Categories:</strong> ${categoryArray.join(', ')}
                        </div>
                        ${nutritionalInfo}
                    </div>
                </div>
            </div>
        `;

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Add animation class after a brief delay
        setTimeout(() => {
            modalOverlay.classList.add('show');
        }, 10);
    }

    closeIngredientModal() {
        const modal = document.querySelector('.ingredient-modal-overlay');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    generateNutritionalInfo(ingredientName, amount, categories) {
        // Generate detailed nutritional information based on ingredient and categories
        const name = ingredientName.toLowerCase();
        let nutritionalInfo = '';

        // Add category-based nutritional info using EXACT categories from AI
        categories.forEach(category => {
            const cat = category.toLowerCase();
            switch (cat) {
                case 'protein':
                    nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-dumbbell"></i> <strong>Protein:</strong> Good source of protein for muscle building and repair</div>';
                    break;
                case 'carbs':
                    nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-bread-slice"></i> <strong>Carbohydrates:</strong> Provides energy and dietary fiber</div>';
                    break;
                case 'fiber':
                    nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-seedling"></i> <strong>Fiber:</strong> High in dietary fiber for digestive health</div>';
                    break;
                case 'vitamins':
                    nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-apple-alt"></i> <strong>Vitamins:</strong> Rich in essential vitamins and minerals</div>';
                    break;
                case 'fats':
                    nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-oil-can"></i> <strong>Healthy Fats:</strong> Contains beneficial fatty acids</div>';
                    break;
                case 'minerals':
                    nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-gem"></i> <strong>Minerals:</strong> Rich in essential minerals for overall health</div>';
                    break;
                default:
                    nutritionalInfo += `<div class="nutrition-item"><i class="fas fa-circle"></i> <strong>${category}:</strong> Provides essential nutrients for a balanced diet</div>`;
                    break;
            }
        });

        // Add specific ingredient information
        if (name.includes('arugula')) {
            nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-info-circle"></i> <strong>Specific:</strong> Contains vitamins A, C, K, and folate</div>';
        } else if (name.includes('spinach')) {
            nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-info-circle"></i> <strong>Specific:</strong> High in iron, calcium, and vitamin K</div>';
        } else if (name.includes('tomato')) {
            nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-info-circle"></i> <strong>Specific:</strong> Rich in lycopene and vitamin C</div>';
        } else if (name.includes('chicken')) {
            nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-info-circle"></i> <strong>Specific:</strong> Excellent source of lean protein and B vitamins</div>';
        } else if (name.includes('salmon')) {
            nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-info-circle"></i> <strong>Specific:</strong> High in omega-3 fatty acids and vitamin D</div>';
        } else if (name.includes('quinoa')) {
            nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-info-circle"></i> <strong>Specific:</strong> Complete protein with all essential amino acids</div>';
        } else if (name.includes('avocado')) {
            nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-info-circle"></i> <strong>Specific:</strong> Rich in healthy monounsaturated fats</div>';
        } else if (name.includes('sweet potato')) {
            nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-info-circle"></i> <strong>Specific:</strong> High in beta-carotene and complex carbohydrates</div>';
        } else if (name.includes('paneer')) {
            nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-info-circle"></i> <strong>Specific:</strong> Fresh Indian cheese, rich in protein and calcium</div>';
        } else if (name.includes('onion')) {
            nutritionalInfo += '<div class="nutrition-item"><i class="fas fa-info-circle"></i> <strong>Specific:</strong> Contains antioxidants and prebiotic fiber</div>';
        }

        return nutritionalInfo || '<div class="nutrition-item"><i class="fas fa-info-circle"></i> <strong>Nutritional Information:</strong> This ingredient provides essential nutrients for a balanced diet.</div>';
    }
}

// Helper function to get appropriate icon for dietary category
function getCategoryIcon(category) {
    const cat = category.toLowerCase();
    switch (cat) {
        case 'protein':
            return 'fas fa-dumbbell';
        case 'carbs':
            return 'fas fa-bread-slice';
        case 'fiber':
            return 'fas fa-seedling';
        case 'vitamins':
            return 'fas fa-apple-alt';
        case 'fats':
            return 'fas fa-oil-can';
        case 'minerals':
            return 'fas fa-gem';
        default:
            return 'fas fa-circle';
    }
}

// Helper function to create balance pie chart
function createBalancePieChart(balanceFactor) {
    // Parse the balance factor string to extract percentages
    const percentages = parseBalanceFactor(balanceFactor);
    
    // Calculate angles for the pie chart
    let currentAngle = 0;
    const angles = {};
    
    Object.keys(percentages).forEach(category => {
        const percentage = percentages[category];
        const angle = (percentage / 100) * 360;
        angles[category] = currentAngle + angle;
        currentAngle += angle;
    });
    
    // Create CSS custom properties for the pie chart
    const cssVars = Object.keys(angles).map(category => {
        const color = getCategoryColor(category);
        return `--${category}-color: ${color}; --${category}-angle: ${angles[category]}deg`;
    }).join('; ');
    
    // Create legend items
    const legendItems = Object.keys(percentages).map(category => {
        const color = getCategoryColor(category);
        return `
            <div class="legend-item">
                <div class="legend-color ${category}"></div>
                <span>${category}: ${percentages[category]}%</span>
            </div>
        `;
    }).join('');
    
    return `
        <div class="balance-pie-chart" style="${cssVars}">
        </div>
        <div class="balance-label">Balance</div>
        <div class="balance-legend">
            ${legendItems}
        </div>
    `;
}

// Helper function to create SVG pie chart for print compatibility
function createSVGPieChart(balanceFactor, isPrint = false) {
    // Parse the balance factor string to extract percentages
    const percentages = parseBalanceFactor(balanceFactor);
    
    // Calculate angles for the pie chart
    let currentAngle = 0;
    const radius = isPrint ? 80 : 40; // Larger radius for print
    const centerX = isPrint ? 200 : 50;
    const centerY = isPrint ? 100 : 50;
    const svgSize = isPrint ? 400 : 100;
    
    // Create SVG path elements for each segment
    const segments = Object.keys(percentages).map(category => {
        const percentage = percentages[category];
        const angle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        
        // Convert angles to radians
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        
        // Calculate start and end points
        const x1 = centerX + radius * Math.cos(startRad);
        const y1 = centerY + radius * Math.sin(startRad);
        const x2 = centerX + radius * Math.cos(endRad);
        const y2 = centerY + radius * Math.sin(endRad);
        
        // Large arc flag
        const largeArcFlag = angle > 180 ? 1 : 0;
        
        // Create path
        const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
        
        currentAngle += angle;
        
        const color = getCategoryColor(category);
        return `<path d="${pathData}" fill="${color}" stroke="white" stroke-width="1"/>`;
    }).join('');
    
    // Create legend items
    const legendItems = Object.keys(percentages).map(category => {
        const color = getCategoryColor(category);
        return `
            <div class="legend-item">
                <div class="legend-color ${category}"></div>
                <span>${category}: ${percentages[category]}%</span>
            </div>
        `;
    }).join('');
    
    return `
        <div class="balance-pie-chart-svg">
            <svg width="${svgSize}" height="200" viewBox="0 0 ${svgSize} 200">
                ${segments}
            </svg>
        </div>
        <div class="balance-label">Balance</div>
        <div class="balance-legend">
            ${legendItems}
        </div>
    `;
}

// Helper function to parse balance factor string
function parseBalanceFactor(balanceFactor) {
    const percentages = {
        protein: 0,
        carbs: 0,
        fiber: 0,
        vitamins: 0,
        fats: 0
    };
    
    if (!balanceFactor) {
        return { protein: 30, carbs: 40, fiber: 10, vitamins: 10, fats: 10 };
    }
    
    // Extract percentages using regex - improved pattern matching
    const patterns = [
        /(\d+)%\s*(protein|carbs|fiber|vitamins|fats)/gi,
        /(protein|carbs|fiber|vitamins|fats)\s*(\d+)%/gi,
        /(\d+)\s*%\s*(protein|carbs|fiber|vitamins|fats)/gi
    ];
    
    let foundAny = false;
    
    for (const pattern of patterns) {
        const matches = balanceFactor.match(pattern);
        if (matches) {
            foundAny = true;
            matches.forEach(match => {
                // Handle different pattern formats
                let parts;
                if (pattern.source.includes('\\d+%')) {
                    parts = match.match(/(\d+)%\s*(protein|carbs|fiber|vitamins|fats)/i);
                } else if (pattern.source.includes('%\\d+')) {
                    parts = match.match(/(protein|carbs|fiber|vitamins|fats)\s*(\d+)%/i);
                    if (parts) {
                        // Swap the order for this pattern
                        parts = [parts[0], parts[2], parts[1]];
                    }
                } else {
                    parts = match.match(/(\d+)\s*%\s*(protein|carbs|fiber|vitamins|fats)/i);
                }
                
                if (parts) {
                    const percentage = parseInt(parts[1]);
                    const category = parts[2].toLowerCase();
                    if (percentages.hasOwnProperty(category)) {
                        percentages[category] = percentage;
                    }
                }
            });
        }
    }
    
    // If no percentages found or missing categories, ensure balanced distribution
    if (!foundAny || Object.values(percentages).every(val => val === 0)) {
        return { protein: 30, carbs: 40, fiber: 10, vitamins: 10, fats: 10 };
    }
    
    // Ensure all categories have at least some percentage
    const total = Object.values(percentages).reduce((sum, val) => sum + val, 0);
    const missingCategories = Object.keys(percentages).filter(cat => percentages[cat] === 0);
    
    if (missingCategories.length > 0 && total < 100) {
        // Distribute remaining percentage among missing categories
        const remainingPercentage = 100 - total;
        const percentagePerCategory = Math.floor(remainingPercentage / missingCategories.length);
        const extraPercentage = remainingPercentage % missingCategories.length;
        
        missingCategories.forEach((category, index) => {
            percentages[category] = percentagePerCategory + (index < extraPercentage ? 1 : 0);
        });
    }
    
    // If still missing categories, redistribute to ensure all are represented
    if (Object.values(percentages).some(val => val === 0)) {
        const nonZeroCategories = Object.keys(percentages).filter(cat => percentages[cat] > 0);
        const zeroCategories = Object.keys(percentages).filter(cat => percentages[cat] === 0);
        
        if (nonZeroCategories.length > 0 && zeroCategories.length > 0) {
            // Take 2% from each non-zero category and give to zero categories
            const percentageToRedistribute = Math.min(2, Math.floor(100 / (nonZeroCategories.length * zeroCategories.length)));
            
            nonZeroCategories.forEach(cat => {
                percentages[cat] = Math.max(5, percentages[cat] - percentageToRedistribute);
            });
            
            zeroCategories.forEach(cat => {
                percentages[cat] = percentageToRedistribute;
            });
        }
    }
    
    return percentages;
}

// Helper function to get category colors
function getCategoryColor(category) {
    const colors = {
        protein: '#ff6b6b',
        carbs: '#feca57',
        fiber: '#48dbfb',
        vitamins: '#1dd1a1',
        fats: '#ff9ff3'
    };
    return colors[category] || '#ddd';
}

// Initialize the recipe generator when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.recipeGenerator = new RecipeGenerator();
    
    // Add CSS for error notification animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
});
