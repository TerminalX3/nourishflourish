# AI Recipe Generator Setup Guide

## Overview
This AI-powered recipe generator integrates with Google's Gemini API to create personalized, nutritionally balanced recipes for teenagers. The system takes ingredients from your fridge and generates recipes based on your fitness goals (cut/bulk) and cuisine preferences.

## Features
- 🍳 AI-powered recipe generation using Google Gemini
- 🎯 Goal-based recipes (cut-friendly vs bulk-friendly)
- 🌍 Global cuisine options
- 📱 Responsive design for all devices
- 🖨️ Print-friendly recipe output
- ⚡ Real-time recipe generation

## Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager
- Google Gemini API key

## Setup Instructions

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API key" to create a new API key
4. Copy the generated API key (it looks like: `AIzaSyDk0xC-EXAMPLE-KEY`)

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Create .env file
touch .env
```

Add your Gemini API key to the `.env` file:

```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=3000
NODE_ENV=development
```

### 4. Start the Server

```bash
# Start in development mode (with auto-restart)
npm run dev

# Or start in production mode
npm start
```

The server will start on `http://localhost:3000`

### 5. Access the Recipe Generator

- Main website: `http://localhost:3000`
- Recipe generator: `http://localhost:3000/recipe-generator.html`
- Health check: `http://localhost:3000/api/health`

## API Endpoints

### POST /api/generate-recipes
Generates recipes based on provided ingredients and preferences.

**Request Body:**
```json
{
  "ingredients": "chicken breast, rice, tomatoes, spinach",
  "servingSize": "2",
  "goalType": "cut",
  "cuisine": "global"
}
```

**Response:**
```json
{
  "success": true,
  "recipes": [
    {
      "title": "Recipe Title",
      "cuisine": "Cuisine Type",
      "prepTime": "10 minutes",
      "cookTime": "20 minutes",
      "servings": "2",
      "servingSize": "1 bowl",
      "calories": 220,
      "balanceFactor": "40% carbs, 30% protein, 30% fats",
      "goalType": "cut",
      "ingredients": [...],
      "steps": [...],
      "substitutes": "Substitution suggestions",
      "history": "Cultural background"
    }
  ]
}
```

## File Structure

```
NourishFlourish/
├── index.html                 # Main website
├── recipe-generator.html      # AI recipe generator page
├── styles.css                 # Main website styles
├── recipe-generator.css       # Recipe generator styles
├── script.js                  # Main website JavaScript
├── recipe-generator.js        # Recipe generator JavaScript
├── server.js                  # Node.js backend server
├── package.json               # Node.js dependencies
├── SETUP.md                   # This setup guide
└── .env                       # Environment variables (create this)
```

## Customization

### Modifying the AI Prompt
Edit the `buildRecipePrompt()` function in `server.js` to customize how recipes are generated.

### Styling Changes
- Main website: Edit `styles.css`
- Recipe generator: Edit `recipe-generator.css`

### Adding New Cuisines
Add new cuisine options in `recipe-generator.html` and update the prompt generation logic in `server.js`.

## Troubleshooting

### Common Issues

1. **"Gemini API key not configured"**
   - Make sure you've created a `.env` file with your API key
   - Verify the API key is correct and active

2. **"Failed to generate recipes"**
   - Check your internet connection
   - Verify the Gemini API key has sufficient quota
   - Check the server logs for detailed error messages

3. **Server won't start**
   - Ensure Node.js version 14+ is installed
   - Run `npm install` to install dependencies
   - Check if port 3000 is already in use

### Getting Help

- Check the server logs for error messages
- Verify your API key at [Google AI Studio](https://aistudio.google.com/app/apikey)
- Ensure all dependencies are installed with `npm install`

## Security Notes

- Never commit your `.env` file to version control
- The API key is kept secure on the backend server
- Frontend never directly accesses the Gemini API

## Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Use a process manager like PM2
3. Set up a reverse proxy (nginx/Apache)
4. Configure HTTPS
5. Set up proper environment variables on your hosting platform

## License

This project is part of Nourish 'N' Flourish and is licensed under MIT.
