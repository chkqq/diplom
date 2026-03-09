export interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

export function userMessage(text: string): ChatMessage {
  return { role: "user", text };
}

export function aiMessage(text: string): ChatMessage {
  return { role: "ai", text };
}
