"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useChat } from "@/components/hooks/use-chat";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Send,
  Trash2,
  Volume2,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-start">
        <Skeleton className="h-12 w-[60%] rounded-lg" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-8 w-[40%] rounded-lg" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-16 w-[75%] rounded-lg" />
      </div>
    </div>
  );
}

export function ChatDrawerContent() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isLoading } = useChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [lastMessageWasAudio, setLastMessageWasAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPreviewingAudio, setIsPreviewingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer && messagesEndRef.current) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Effect to play audio response when a new assistant message arrives after an audio message
  useEffect(() => {
    if (lastMessageWasAudio && messages.length > 0 && !isLoading) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        playAssistantResponse(lastMessage.content);
        setLastMessageWasAudio(false);
      }
    }
  }, [messages, isLoading, lastMessageWasAudio]);

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (audioBlob) {
      await handleSendAudio();
      return;
    }

    if (!input.trim()) return;

    await sendMessage(input);
    setInput("");
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setRecordingDuration(0);

      // Start a timer to track recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setAudioBlob(audioBlob);

        // Create URL for preview
        if (previewAudioRef.current) {
          previewAudioRef.current.src = URL.createObjectURL(audioBlob);
        }

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Erro ao acessar microfone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }

      setIsRecording(false);
    }

    setAudioBlob(null);
    setRecordingDuration(0);

    // Release any preview URL
    if (previewAudioRef.current && previewAudioRef.current.src) {
      URL.revokeObjectURL(previewAudioRef.current.src);
      previewAudioRef.current.src = "";
    }
  };

  const toggleAudioPreview = () => {
    if (!previewAudioRef.current) return;

    if (isPreviewingAudio) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    } else {
      previewAudioRef.current.play();
    }

    setIsPreviewingAudio(!isPreviewingAudio);
  };

  const handleSendAudio = async () => {
    if (!audioBlob) return;

    try {
      // Set transcribing state to show skeleton
      setIsTranscribing(true);

      // Create form data to send the audio file
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      // Upload and transcribe the audio
      const response = await fetch("/api/audio/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Falha ao transcrever áudio");
      }

      const { text } = await response.json();

      // Mark that this message was from audio so we'll auto-play the response
      setLastMessageWasAudio(true);

      // Send the transcribed text to the chat
      await sendMessage(text);

      // Reset audio blob and preview
      setAudioBlob(null);
      if (previewAudioRef.current && previewAudioRef.current.src) {
        URL.revokeObjectURL(previewAudioRef.current.src);
        previewAudioRef.current.src = "";
      }
    } catch (error) {
      console.error("Erro ao enviar áudio:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const playAssistantResponse = async (messageContent: string) => {
    try {
      setIsPlaying(true);

      const response = await fetch("/api/audio/synthesize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: messageContent }),
      });

      if (!response.ok) {
        throw new Error("Falha ao sintetizar fala");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();

        audioRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (error) {
      console.error("Erro ao reproduzir resposta:", error);
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="h-full flex flex-col bg-background border-l overflow-hidden shadow-xl">
      <div className="shrink-0 border-b p-4">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="relative">
            <Bot
              className={cn(
                "h-5 w-5 text-primary",
                isLoading || isTranscribing
                  ? "animate-bounce"
                  : isPlaying
                  ? "animate-wiggle"
                  : "animate-pulse"
              )}
            />
            {(isLoading || isTranscribing) && (
              <span className="absolute -bottom-1 -right-1 h-2 w-2 bg-primary rounded-full animate-ping" />
            )}
            {isPlaying && (
              <span className="absolute -top-1 -right-1 flex space-x-1">
                <span
                  className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
            )}
          </span>
          Assistente IA
          {isPlaying && (
            <span className="ml-2 text-xs text-primary animate-pulse">
              Falando...
            </span>
          )}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Faça perguntas, solicite informações ou peça ajuda com tarefas
        </p>

        {messages.length === 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-full"
              onClick={() =>
                setInput("Agende um horário para a próxima semana")
              }
            >
              Agendar horário
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-full"
              onClick={() => setInput("Mostre meus próximos agendamentos")}
            >
              Ver agendamentos
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-full"
              onClick={() => setInput("Como adiciono um novo serviço?")}
            >
              Adicionar serviço
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4" ref={scrollAreaRef}>
          <div className="flex flex-col gap-4 py-4">
            {messages.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="bg-primary/5 p-4 rounded-full mb-4">
                  <Bot className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  Bem-vindo ao seu Assistente IA
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-6">
                  Posso ajudar você a gerenciar agendamentos, responder
                  perguntas e fornecer informações sobre seus serviços.
                </p>
                <p className="text-xs text-muted-foreground">
                  Experimente fazer uma pergunta ou use as sugestões abaixo
                </p>
              </div>
            ) : isLoading && messages.length === 0 ? (
              <MessageSkeleton />
            ) : (
              messages.map((message, i) => (
                <div
                  key={i}
                  className={`flex ${
                    message.role === "assistant"
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 mr-2 mt-1">
                      <div className="bg-primary/5 h-8 w-8 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === "assistant"
                        ? "bg-secondary group flex flex-col"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {message.content}
                    {message.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-end opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => playAssistantResponse(message.content)}
                        disabled={isPlaying}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
            {(isLoading || isTranscribing) && messages.length > 0 && (
              <div className="flex justify-start">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-2">
                    <div className="bg-primary/5 h-8 w-8 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary animate-bounce" />
                    </div>
                  </div>
                  <div className="bg-secondary rounded-lg px-4 py-2">
                    <div className="flex space-x-1 items-center h-6">
                      <div
                        className="h-2 w-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="h-2 w-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="h-2 w-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>
      <div className="shrink-0 p-4 border-t mt-auto">
        {isRecording ? (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex-1 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">
                Gravando... {formatTime(recordingDuration)}
              </span>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
            >
              <MicOff className="h-4 w-4 mr-1" />
              Parar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelRecording}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : audioBlob ? (
          <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg mb-2">
            <div className="flex-1 flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAudioPreview}
                className="h-8 w-8 p-0 rounded-full"
              >
                {isPreviewingAudio ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <div className="h-10 flex-1 bg-primary/10 rounded-full relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium">
                    Mensagem de áudio pronta
                  </span>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelRecording}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || isRecording || isTranscribing}
            className={cn(audioBlob ? "opacity-50" : "")}
          />
          {!audioBlob && (
            <Button
              type="button"
              variant="outline"
              onClick={toggleRecording}
              disabled={isLoading || isTranscribing}
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="submit"
            disabled={
              isLoading ||
              isRecording ||
              isTranscribing ||
              (!input.trim() && !audioBlob)
            }
          >
            {isLoading || isTranscribing ? (
              "Processando..."
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
      <audio ref={audioRef} className="hidden" />
      <audio
        ref={previewAudioRef}
        className="hidden"
        onEnded={() => setIsPreviewingAudio(false)}
      />
    </div>
  );
}
