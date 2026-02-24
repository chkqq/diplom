const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Ollama } = require("ollama");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Инициализация клиента Ollama
// По умолчанию подключается к http://127.0.0.1:11434
const ollama = new Ollama({ 
  host: 'http://127.0.0.1:11434' // Это ссылка, которую вы искали
});

// Проверка подключения к Ollama
async function checkOllamaConnection() {
  try {
    const models = await ollama.list();
    console.log("✅ Connected to Ollama. Available models:", models.models.map(m => m.name).join(', '));
    return true;
  } catch (error) {
    console.error("❌ Cannot connect to Ollama. Make sure Ollama is running (ollama serve)");
    console.error("Error details:", error.message);
    return false;
  }
}

// Проверяем подключение при запуске
checkOllamaConnection();

app.post("/generate-diagram", async (req, res) => {
  const { prompt } = req.body;

  try {
    // Формируем запрос к модели
    const systemPrompt = `You are a diagram generator. Generate a JSON diagram based on the user's description.
Output format MUST be valid JSON with this structure:
{
  "shapes": [
    { "id": string, "type": string, "x": number, "y": number, "width": number, "height": number, "text": string }
  ],
  "edges": [
    { "id": string, "source": string, "target": string }
  ]
}
Return ONLY the JSON without any additional text or explanations.`;

    const userPrompt = `Generate a JSON diagram based on this description: "${prompt}".`;

    // Отправляем запрос к Ollama
    const response = await ollama.chat({
      model: 'llama3.1', // или другая модель, которая у вас установлена
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      format: 'json', // Важно: просим вернуть JSON
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
      }
    });

    // Парсим ответ
    const textOutput = response.message.content;
    
    let diagram = { shapes: [], edges: [] };
    try {
      // Пробуем распарсить JSON из ответа
      diagram = JSON.parse(textOutput);
    } catch (e) {
      console.warn("Failed to parse AI output, returning fallback diagram.");
      console.warn("Raw output:", textOutput);
      
      // Пытаемся извлечь JSON из текста, если модель вернула лишний текст
      const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          diagram = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          // Если не получилось, возвращаем fallback
          diagram = getFallbackDiagram(prompt);
        }
      } else {
        diagram = getFallbackDiagram(prompt);
      }
    }

    res.json(diagram);
  } catch (err) {
    console.error("Error generating diagram:", err);
    res.status(500).json({ 
      error: "Failed to generate diagram", 
      details: err.message 
    });
  }
});

// Функция для создания запасной диаграммы
function getFallbackDiagram(prompt) {
  return {
    shapes: [
      { 
        id: "1", 
        type: "rectangle", 
        x: 100, 
        y: 100, 
        width: 120, 
        height: 60, 
        text: prompt.split(' ').slice(0, 3).join(' ') || "Block" 
      },
    ],
    edges: [],
  };
}

app.listen(5000, () => console.log("✅ AI Diagram Server running on port 5000"));