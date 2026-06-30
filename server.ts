import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.resolve();

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Google Gen AI
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // POST route for Gemini Thinking with automatic fallback
  app.post('/api/gemini-thinking', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Le prompt est requis.' });
    }

    let response;
    let usedModel = 'gemini-3.1-pro-preview';
    let fallbackUsed = false;

    try {
      // Attempt with high reasoning model (gemini-3.1-pro-preview)
      response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: {
            // @ts-ignore
            thinkingLevel: 'HIGH',
            thinkingBudget: 4096
          }
        }
      });
    } catch (error: any) {
      console.warn('Primary model gemini-3.1-pro-preview failed, attempting fallback to gemini-3.5-flash:', error.message || error);
      fallbackUsed = true;
      usedModel = 'gemini-3.5-flash';
      
      try {
        // Fallback to gemini-3.5-flash (highly reliable and quota-friendly on free tier)
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            thinkingConfig: {
              // @ts-ignore
              thinkingLevel: 'LOW'
            }
          }
        });
      } catch (fallbackError: any) {
        console.error('Gemini API Fallback Error:', fallbackError);
        return res.status(500).json({ 
          error: `Erreur Gemini : ${fallbackError.message || 'Impossible de communiquer avec le modèle de secours.'}` 
        });
      }
    }

    try {
      const candidate = response.candidates?.[0];
      const text = response.text;
      
      // Extract thoughts if available
      let thoughtText = '';
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          // @ts-ignore
          if (part.thought) {
            // @ts-ignore
            thoughtText += part.text || '';
          }
        }
      }

      // Add a small helpful message to indicate if fallback was used
      let finalThoughts = thoughtText;
      if (fallbackUsed && !finalThoughts) {
        finalThoughts = "[Note du Conseiller : Utilisation du modèle rapide gemini-3.5-flash en raison de limites de quota temporaires sur le modèle de raisonnement profond.]";
      }
      
      res.json({
        text: text || "Désolé, je n'ai pas pu générer de réponse.",
        thoughts: finalThoughts || "",
        model: usedModel
      });
    } catch (parseError: any) {
      console.error('Error parsing response:', parseError);
      res.status(500).json({ error: 'Une erreur est survenue lors du traitement de la réponse.' });
    }
  });

  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.resolve(currentDir, 'dist'));

  if (!isProd) {
    // Integrate Vite dev server as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(currentDir, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(currentDir, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Echec du lancement du serveur:', err);
});
