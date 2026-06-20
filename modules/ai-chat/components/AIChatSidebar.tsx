"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../hooks/useAIChat";
import { FileModification } from "@/app/api/ai-modify/route";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, Sparkles, User, Trash2, Copy, Check, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";

interface AIChatSidebarProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
  onApplyChange?: (change: FileModification) => void | Promise<void>;
}

export const AIChatSidebar = ({
  messages,
  isLoading,
  onSendMessage,
  onClearChat,
  onApplyChange,
}: AIChatSidebarProps) => {
  const [input, setInput] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  // Track which change (by message index + change index) is currently being applied
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleApply = async (change: FileModification, key: string) => {
    if (!onApplyChange || applyingKey) return;
    setApplyingKey(key);
    try {
      await onApplyChange(change);
      setAppliedKey(key);
      setTimeout(() => setAppliedKey(null), 2500);
    } finally {
      setApplyingKey(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">AI Assistant</h2>
            <p className="text-xs text-muted-foreground">Full project context</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearChat}
          className="h-8 w-8"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 w-full">
        <div className="space-y-6 w-full px-4 py-4">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={cn(
                "flex flex-col space-y-2 w-full min-w-0",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              {/* Message Header */}
              <div className="flex items-center gap-2 max-w-full overflow-hidden">
                {message.role === "assistant" ? (
                  <>
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 shrink-0">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-medium truncate">Assistant</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-muted shrink-0">
                      <User className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-medium truncate">You</span>
                  </>
                )}
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {/* Message Content */}
              <div
                className={cn(
                  "rounded-lg p-3 text-sm min-w-0 break-words overflow-hidden max-w-full",
                  message.role === "user"
                    ? "bg-muted/50 max-w-[90%]"
                    : "bg-background border self-stretch shadow-sm"
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-full min-w-0 overflow-hidden [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all [&_p]:break-words [&_pre]:p-0">
                  <ReactMarkdown
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const code = String(children).replace(/\n$/, "");
                        const isInline = !match && !className;

                        return !isInline && match ? (
                          <div className="relative group overflow-x-auto max-w-full rounded-lg">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              onClick={() => handleCopyCode(code)}
                            >
                              {copiedCode === code ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                            <SyntaxHighlighter
                              // @ts-expect-error - Style types are incompatible
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              wrapLines
                              wrapLongLines
                              customStyle={{
                                margin: 0,
                                borderRadius: "0.5rem",
                                fontSize: "0.75rem",
                                maxWidth: "100%",
                                overflowX: "auto",
                              }}
                              {...props}
                            >
                              {code}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code
                            className="px-1 py-0.5 rounded bg-muted text-xs font-mono"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      p({ children }) {
                        return <p className="text-sm leading-relaxed">{children}</p>;
                      },
                      ul({ children }) {
                        return <ul className="text-sm space-y-1 list-disc pl-4">{children}</ul>;
                      },
                      ol({ children }) {
                        return <ol className="text-sm space-y-1 list-decimal pl-4">{children}</ol>;
                      },
                      h1({ children }) {
                        return <h1 className="text-base font-bold mt-4 mb-2">{children}</h1>;
                      },
                      h2({ children }) {
                        return <h2 className="text-sm font-bold mt-3 mb-2">{children}</h2>;
                      },
                      h3({ children }) {
                        return <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>;
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Suggested Changes */}
                {message.suggestedChanges && message.suggestedChanges.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Separator className="my-3" />
                    <p className="text-xs font-semibold text-muted-foreground">
                      Suggested Changes ({message.suggestedChanges.length})
                    </p>
                    {message.suggestedChanges.map((change, idx) => {
                      const key = `${message.id}-${idx}`;
                      const isApplying = applyingKey === key;
                      const isApplied = appliedKey === key;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-2 min-w-0 overflow-hidden"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-xs truncate">{change.filePath}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {change.changeType}
                            </p>
                          </div>
                          {onApplyChange && (
                            <Button
                              size="sm"
                              variant={isApplied ? "outline" : "default"}
                              onClick={() => handleApply(change, key)}
                              disabled={isApplying || !!applyingKey}
                              className="h-7 text-xs shrink-0 min-w-[64px]"
                            >
                              {isApplying ? (
                                <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Applying…</>
                              ) : isApplied ? (
                                <><Check className="w-3 h-3 mr-1" />Applied</>
                              ) : (
                                "Apply"
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-medium">Assistant</span>
              </div>
              <div className="rounded-lg border p-3 ml-8">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" />
                  </div>
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background p-4 space-y-2">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your project..."
            className="min-h-[80px] pr-12 resize-none text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8 rounded-md"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Press <kbd className="px-1 py-0.5 rounded bg-muted text-xs">⌘ Enter</kbd> or{" "}
          <kbd className="px-1 py-0.5 rounded bg-muted text-xs">Ctrl Enter</kbd> to send
        </p>
      </div>
    </div>
  );
};
