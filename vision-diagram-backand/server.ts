import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Ollama } from "ollama";

// Определяем интерфейсы для типов данных
interface Shape {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

interface Edge {
  id: string;
  source: string;
  target: string;
}

interface Diagram {
  shapes: Shape[];
  edges: Edge[];
}

interface GenerateDiagramRequest {
  prompt: string;
}

interface OllamaResponse {
  message: {
    content: string;
  };
}

interface OllamaModel {
  name: string;
}

interface OllamaListResponse {
  models: OllamaModel[];
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Инициализация клиента Ollama
// По умолчанию подключается к http://127.0.0.1:11434
const ollama = new Ollama({ 
  host: 'http://127.0.0.1:11434' // Это ссылка, которую вы искали
});

// Проверка подключения к Ollama
async function checkOllamaConnection(): Promise<boolean> {
  try {
    const models = await ollama.list() as OllamaListResponse;
    console.log("✅ Connected to Ollama. Available models:", models.models.map((m: OllamaModel) => m.name).join(', '));
    return true;
  } catch (error) {
    console.error("❌ Cannot connect to Ollama. Make sure Ollama is running (ollama serve)");
    console.error("Error details:", (error as Error).message);
    return false;
  }
}

// Проверяем подключение при запуске
checkOllamaConnection();

app.post("/generate-diagram", async (req: Request<{}, {}, GenerateDiagramRequest>, res: Response) => {
  const { prompt } = req.body;

  try {
    // Формируем запрос к модели
    const systemPrompt = `You are a diagram generator. 
    
    Generate a JSON diagram based on the user's description.
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
    }) as OllamaResponse;

    // Парсим ответ
    const textOutput = response.message.content;
    
    let diagram: Diagram = { shapes: [], edges: [] };
    try {
      // Пробуем распарсить JSON из ответа
      diagram = JSON.parse(textOutput) as Diagram;
    } catch (e) {
      console.warn("Failed to parse AI output, returning fallback diagram.");
      console.warn("Raw output:", textOutput);
      
      // Пытаемся извлечь JSON из текста, если модель вернула лишний текст
      const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          diagram = JSON.parse(jsonMatch[0]) as Diagram;
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
      details: (err as Error).message 
    });
  }
});

// Функция для создания запасной диаграммы
function getFallbackDiagram(prompt: string): Diagram {
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

const PORT: number = 5000;
app.listen(PORT, () => console.log(`✅ AI Diagram Server running on port ${PORT}`));