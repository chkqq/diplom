import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is missing in .env file");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/generate-diagram", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const systemPrompt = `
You generate diagrams strictly in JSON format.

Return ONLY valid JSON.
No explanations.
No markdown.
No text outside JSON.

Format:
{
  "shapes": [
    {
      "id": "string",
      "type": "rectangle" | "ellipse",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "text": string
    }
  ],
  "edges": [
    {
      "id": "string",
      "source": "string",
      "target": "string"
    }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "Empty AI response" });
    }

    // 🧹 очищаем markdown если модель вдруг его добавила
    const cleaned = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("❌ JSON parse failed");
      console.error("RAW AI RESPONSE:", content);
      return res.status(500).json({ error: "Invalid JSON from AI" });
    }

    // 🛡 простая валидация структуры
    if (!Array.isArray(parsed.shapes) || !Array.isArray(parsed.edges)) {
      console.error("❌ Invalid diagram structure:", parsed);
      return res.status(500).json({ error: "Invalid diagram format" });
    }

    res.json({
      shapes: parsed.shapes ?? [],
      edges: parsed.edges ?? [],
    });

  } catch (error) {
    console.error("🔥 SERVER ERROR:", error);
    res.status(500).json({ error: "AI generation failed" });
  }
});

app.listen(3001, () => {
  console.log("🚀 AI server running on http://localhost:3001");
});
