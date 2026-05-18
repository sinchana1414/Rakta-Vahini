import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Gemini AI Endpoints
app.post('/api/ai/explain-eligibility', async (req, res) => {
  const { lastDonationDate, name } = req.body;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Explain blood donation eligibility for ${name}. Their last donation was on ${lastDonationDate}. 
      The rule is a 90-day wait period. Be encouraging and helpful. Keep it short (2-3 sentences).`,
    });
    res.json({ text: response.text });
  } catch (error) {
    res.status(500).json({ error: 'AI explanation failed' });
  }
});

app.post('/api/ai/guidance', async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide 3 quick, bulleted health tips for blood donors in rural India. 
      Focus on hydration, rest, and local diet suggestions. Keep it simple and actionable.`,
    });
    res.json({ text: response.text });
  } catch (error) {
    res.status(500).json({ error: 'AI guidance failed' });
  }
});

app.post('/api/ai/emergency-broadcast', async (req, res) => {
  const { bloodGroup, hospital, area } = req.body;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a professional, urgent blood request message for social media/WhatsApp.
      Details: Blood Group ${bloodGroup}, Hospital: ${hospital}, Area: ${area}. 
      Include a call to action but DO NOT include a phone number placeholders (the app handles calling).`,
    });
    res.json({ text: response.text });
  } catch (error) {
    res.status(500).json({ error: 'AI broadcast generation failed' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
