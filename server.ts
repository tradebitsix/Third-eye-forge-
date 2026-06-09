import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json({ limit: '50mb' })); // allow larger payloads for images

  // Initialize Gemini
  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

  // API routes FIRST
  app.post("/api/gemini/generateContent", async (req, res, next) => {
    try {
      if (!ai) {
         return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      
      const { model, contents, config } = req.body;
      const response = await ai.models.generateContent({
        model,
        contents,
        config
      });
      
      // Explicitly extract the text property as getters are dropped by res.json()
      res.json({
        text: response.text,
        candidates: response.candidates,
        usageMetadata: response.usageMetadata
      });
    } catch (e: any) {
      console.error("Gemini proxy error:", e);
      // Ensure we return JSON for the API proxy. e.status might be a string ('UNAVAILABLE'), res.status requires a number
      let statusCode = 500;
      if (typeof e.status === 'number') statusCode = e.status;
      else if (e.status === 'UNAVAILABLE') statusCode = 503;
      else if (e.status === 'PERMISSION_DENIED') statusCode = 403;
      
      res.status(statusCode).json({ error: e.message || "Internal server error" });
    }
  });

  // Global Error Handler for API routes
  app.use((err: any, req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/')) {
        console.error("API error:", err);
        return res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
    }
    next(err);
  });

  // Vite middleware for development
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
