"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, User, X, Brain, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";
import Image from "next/image";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";
import { FileModification } from "@/app/api/ai-modify/route";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
  timestamp: Date;
  suggestedChanges?: FileModification[];
}

interface AIChatSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  templateData: TemplateFolder | null;
  currentFile?: string;
  onApplyModification?: (modification: FileModification) => Promise<void>;
}

export const AIChatSidePanel: React.FC<AIChatSidePanelProps> = ({
  isOpen,
  onClose,
  templateData,
  currentFile,
  onApplyModification,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
      id: Date.now().toString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build project context
      const fileContents: Array<{ path: string; content: string; type: string }> = [];
      const extractFiles = (folder: TemplateFolder, basePath = ""): void => {
        folder.items.forEach((item) => {
          if ("folderName" in item) {
            const folderPath = basePath ? `${basePath}/${item.folderName}` : item.folderName;
            extractFiles(item, folderPath);
          } else {
            const filePath = basePath ? `${basePath}/${item.filename}.${item.fileExtension}` : `${item.filename}.${item.fileExtension}`;
            fileContents.push({
              path: filePath,
              content: item.content || "",
              type: item.fileExtension,
            });
          }
        });
      };

      if (templateData) {
        extractFiles(templateData);
      }

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input.trim(),
          chatHistory: messages.slice(-10).map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          projectContext: {
            structure: {},
            framework: "Unknown",
            language: "TypeScript",
            totalFiles: fileContents.length,
          },
          fileContents,
          currentFile,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Convert CodeChange to FileModification format
        const suggestedChanges: FileModification[] = (data.suggestedChanges || []).map((change: any) => ({
          filePath: change.file,
          originalContent: "",
          modifiedContent: change.content || "",
          changeDescription: `${change.action === "create" ? "Create" : "Modify"} file`,
          changeType: change.action === "create" ? "create" as const : "update" as const,
        }));

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
            id: Date.now().toString(),
            suggestedChanges,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I encountered an error while processing your request. Please try again.",
            timestamp: new Date(),
            id: Date.now().toString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Please check your internet connection and try again.",
          timestamp: new Date(),
          id: Date.now().toString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChange = async (modification: FileModification) => {
    if (onApplyModification) {
      try {
        await onApplyModification(modification);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `✅ Successfully applied changes to \`${modification.filePath}\``,
            timestamp: new Date(),
            id: Date.now().toString(),
          },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `❌ Failed to apply changes: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
            id: Date.now().toString(),
          },
        ]);
      }
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/35 transition-opacity duration-300 sm:bg-black/10 xl:pointer-events-none xl:bg-transparent",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Side Panel */}
      <div
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl transition-[transform,opacity] duration-300 ease-out",
          "inset-x-0 bottom-0 h-[min(88dvh,760px)] rounded-t-2xl",
          "sm:inset-x-3 sm:bottom-3 sm:h-[calc(100dvh-5rem)] sm:rounded-xl",
          "xl:inset-x-auto xl:bottom-3 xl:right-3 xl:top-16 xl:h-auto xl:max-h-[calc(100dvh-5rem)] xl:w-[26rem] xl:max-w-[calc(100vw_-_20rem)] xl:rounded-2xl",
          isOpen
            ? "translate-y-0 opacity-100 xl:translate-x-0"
            : "pointer-events-none translate-y-full opacity-0 xl:translate-y-0 xl:translate-x-[calc(100%+1rem)]"
        )}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />
          <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full border sm:h-10 sm:w-10">
                <Image src={"/logo.svg"} alt="Logo" width={28} height={28} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  AI Assistant
                </h2>
                <p className="hidden text-sm text-zinc-400 sm:block">
                  Ask about your project or request a code change
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              aria-label="Close AI chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto bg-zinc-950">
          <div className="space-y-4 p-3 sm:space-y-5 sm:p-5">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-zinc-500 py-16">
                <div className="relative w-16 h-16 border rounded-full flex flex-col justify-center items-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-zinc-300">
                  AI Assistant
                </h3>
                <p className="mx-auto mb-6 max-w-md leading-relaxed text-zinc-400">
                  Ask a question about the code, or describe a change you want me to make.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="space-y-4">
                <div
                  className={cn(
                    "group flex items-start gap-2 sm:gap-4",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="relative w-10 h-10 border rounded-full flex flex-col justify-center items-center">
                      <Brain className="h-5 w-5 text-zinc-400" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "min-w-0 max-w-[88%] rounded-xl shadow-sm sm:max-w-[85%]",
                      msg.role === "user"
                        ? "bg-zinc-900/70 text-white p-4 rounded-br-md"
                        : "bg-zinc-900/80 backdrop-blur-sm text-zinc-100 p-3 sm:p-5 rounded-bl-md border border-zinc-800/50"
                    )}
                  >
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: ({ children, className }) => {
                            const isInline = !className;
                            if (isInline) {
                              return (
                                <code className="bg-zinc-800 px-1 py-0.5 rounded text-sm">
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <div className="bg-zinc-800 rounded-lg p-4 my-4">
                                <pre className="text-sm text-zinc-100 overflow-x-auto">
                                  <code className={className}>{children}</code>
                                </pre>
                              </div>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Suggested Changes */}
                    {msg.suggestedChanges && msg.suggestedChanges.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-zinc-300">
                          💡 Suggested File Changes ({msg.suggestedChanges.length}):
                        </p>
                        {msg.suggestedChanges.map((change, idx) => (
                          <div
                            key={idx}
                            className="bg-zinc-800/50 border border-zinc-700 rounded p-3 text-sm space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-medium text-zinc-200">
                                {change.filePath}
                              </span>
                              {onApplyModification && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApplyChange(change)}
                                  className="h-7 text-xs gap-1"
                                >
                                  <Check className="h-3 w-3" />
                                  Apply
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  change.changeType === "create"
                                    ? "bg-green-900/30 text-green-400 border border-green-800"
                                    : "bg-blue-900/30 text-blue-400 border border-blue-800"
                                }`}
                              >
                                {change.changeType}
                              </span>
                              <span className="text-xs text-zinc-400">
                                {change.changeDescription}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-zinc-500 mt-3">
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <Avatar className="h-9 w-9 border border-zinc-700 bg-zinc-800 shrink-0">
                      <AvatarFallback className="bg-zinc-700 text-zinc-300">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-4 justify-start">
                <div className="relative w-10 h-10 border rounded-full flex flex-col justify-center items-center">
                  <Brain className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 p-5 rounded-xl rounded-bl-md flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span className="text-sm text-zinc-300">
                    Analyzing your entire codebase...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSendMessage}
          className="shrink-0 border-t border-zinc-800 bg-zinc-900/80 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-4"
        >
          <div className="flex items-end gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Ask about your code or request a change..."
              className="min-h-[64px] flex-1 resize-none bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 sm:min-h-[80px]"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-16 w-14 shrink-0 sm:h-20 sm:w-20"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Press Enter to send • Shift+Enter for new line
          </p>
        </form>
      </div>
    </>
  );
};
