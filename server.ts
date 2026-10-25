import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini AI
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({}) : null;

  // Real Chat API endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { prompt, systemPersona, modelName, history, attachments } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on server' });
      }

      let systemPrompt = `You are the local language model '${modelName || 'Qwen 2.5 7B Instruct'}' running in Lastic Productions Private AI Studio. 
Your persona is: ${systemPersona || 'Helpful Assistant'}.
Guidelines:
- Respond naturally, helpfully, conversationally, and directly to the user.
- If the user says "hi" or greets you, greet them warmly and naturally, offering assistance.
- If the user asks for code, provide clean, idiomatic code with brief explanations.
- Never output rigid filler like "Here is a thoughtful analysis from your persona regarding..." unless explicitly asked for a formal critique.`;

      let fullUserMessage = prompt;
      if (attachments && attachments.length > 0) {
        const fileContext = attachments
          .map((a: any) => `--- File: ${a.name} ---\n${a.content}`)
          .join('\n\n');
        fullUserMessage = `${prompt}\n\n[Attached Context Files]:\n${fileContext}`;
      }

      // Convert history to contents format if provided
      const contents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history.slice(-6)) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            contents.push({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }],
            });
          }
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: fullUserMessage }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      res.json({
        text: response.text || 'No response generated.',
      });
    } catch (err: any) {
      console.error('API /api/chat error:', err);
      res.status(500).json({ error: err?.message || 'Inference failed' });
    }
  });

  // Streaming endpoint (Server-Sent Events for real-time token output)
  app.post('/api/chat/stream', async (req, res) => {
    try {
      const { prompt, systemPersona, modelName, history, attachments } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on server' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');

      let systemPrompt = `You are the local language model '${modelName || 'Qwen 2.5 7B Instruct'}' running in Lastic Productions Private AI Studio. 
Your persona is: ${systemPersona || 'Helpful Assistant'}.
Guidelines:
- Respond naturally, helpfully, conversationally, and directly to the user.
- If the user says "hi" or greets you, greet them warmly and naturally, offering assistance.
- If the user asks for code, provide clean, idiomatic code with brief explanations.
- Never output rigid filler like "Here is a thoughtful analysis from your persona regarding..." unless explicitly asked for a formal critique.`;

      let fullUserMessage = prompt;
      if (attachments && attachments.length > 0) {
        const fileContext = attachments
          .map((a: any) => `--- File: ${a.name} ---\n${a.content}`)
          .join('\n\n');
        fullUserMessage = `${prompt}\n\n[Attached Context Files]:\n${fileContext}`;
      }

      const contents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history.slice(-6)) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            contents.push({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }],
            });
          }
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: fullUserMessage }],
      });

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (err: any) {
      console.error('API /api/chat/stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'Streaming failed' });
      } else {
        res.write(`data: ${JSON.stringify({ error: err?.message || 'Stream interrupted' })}\n\n`);
        res.end();
      }
    }
  });

  // Health / Capabilities endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      appUrl: process.env.APP_URL || 'http://localhost:3000',
    });
  });

  // In development, mount Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lastic Productions Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
