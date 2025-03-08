import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  completion: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    try {
      setIsLoading(true);

      // Add user message
      const userMessage: Message = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);

      // Call Bedrock API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao enviar mensagem");
      }

      const data: ChatResponse = await response.json();

      // Add assistant message
      const assistantMessage: Message = {
        role: "assistant",
        content: data.completion,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      return assistantMessage;
    } catch (error) {
      console.error("Erro no chat:", error);
      // You might want to show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    sendMessage,
    isLoading,
  };
}
