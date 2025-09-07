// api/recipe-feedback.js
export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("Allow", ["POST"]);
      return response.status(405).json({ error: "Method Not Allowed" });
    }

    const { type } = request.body || {};

    if (!type || (type !== 'like' && type !== 'dislike')) {
      return response.status(400).json({ 
        error: 'Invalid feedback type. Must be "like" or "dislike"' 
      });
    }

    // For now, just return success
    // In a real implementation, you might want to store this in a database
    // or use Vercel's KV storage for persistence
    
    console.log(`Recipe feedback received: ${type}`);
    
    return response.status(200).json({ success: true });
  } catch (err) {
    console.error('Recipe feedback error:', err);
    return response.status(500).json({ 
      success: false, 
      error: err?.message || "Server error" 
    });
  }
}
