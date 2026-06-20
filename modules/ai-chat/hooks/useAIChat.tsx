import { useState, useCallback } from "react";
import { TemplateFolder, TemplateFile } from "@/modules/playground/lib/path-to-json";
import { FileModification } from "@/app/api/ai-modify/route";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestedChanges?: FileModification[]; // Using FileModification from AI modify API
}

export interface CodeChange {
  file: string;
  action: "modify" | "create" | "delete";
  content?: string;
  lineStart?: number;
  lineEnd?: number;
  oldCode?: string;
  newCode?: string;
}

interface ProjectContext {
  structure: Record<string, { size: number; type: string }>;
  framework: string;
  language: string;
  totalFiles: number;
}

interface FileContent {
  path: string;
  content: string;
  type: string;
}

interface UseAIChatProps {
  templateData: TemplateFolder | null;
  currentFile?: string;
  onApplyModifications?: (modifications: FileModification[]) => Promise<void>;
}

export const useAIChat = ({ templateData, currentFile, onApplyModifications }: UseAIChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Hi! I'm your AI coding assistant with full project context. I can help you:\n\n- Add new features\n- Refactor code\n- Fix bugs\n- Explain code\n- Generate components\n\nJust tell me what you need!",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Extract all files from template data
  const extractAllFiles = useCallback((folder: TemplateFolder, basePath = ""): FileContent[] => {
    const files: FileContent[] = [];

    folder.items.forEach((item) => {
      if ("folderName" in item) {
        // It's a folder, recurse
        const folderPath = basePath ? `${basePath}/${item.folderName}` : item.folderName;
        files.push(...extractAllFiles(item, folderPath));
      } else {
        // It's a file
        const filePath = basePath ? `${basePath}/${item.filename}.${item.fileExtension}` : `${item.filename}.${item.fileExtension}`;
        files.push({
          path: filePath,
          content: item.content || "",
          type: item.fileExtension,
        });
      }
    });

    return files;
  }, []);

  // Build project context
  const buildProjectContext = useCallback((): {
    projectContext: ProjectContext;
    fileContents: FileContent[];
  } => {
    if (!templateData) {
      return {
        projectContext: {
          structure: {},
          framework: "Unknown",
          language: "Unknown",
          totalFiles: 0,
        },
        fileContents: [],
      };
    }

    const allFiles = extractAllFiles(templateData);

    // Build structure map
    const structure: Record<string, { size: number; type: string }> = {};
    allFiles.forEach((file) => {
      structure[file.path] = {
        size: file.content.length,
        type: file.type,
      };
    });

    // Detect framework and language
    let framework = "Unknown";
    let language = "JavaScript";

    const packageJsonFile = allFiles.find((f) => f.path === "package.json");
    if (packageJsonFile) {
      try {
        const packageJson = JSON.parse(packageJsonFile.content);
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        if (deps.next) framework = "Next.js";
        else if (deps.react) framework = "React";
        else if (deps.vue) framework = "Vue";
        else if (deps.angular) framework = "Angular";
        else if (deps.express) framework = "Express";
        else if (deps.hono) framework = "Hono";
      } catch (e) {
        // Invalid package.json
      }
    }

    // Check for TypeScript
    if (allFiles.some((f) => f.type === "ts" || f.type === "tsx")) {
      language = "TypeScript";
    }

    return {
      projectContext: {
        structure,
        framework,
        language,
        totalFiles: allFiles.length,
      },
      fileContents: allFiles,
    };
  }, [templateData, extractAllFiles]);

  // Send message to AI
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || isLoading) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        // Build project context
        const { projectContext, fileContents } = buildProjectContext();

        // Prepare request
        const payload = {
          message: userMessage,
          chatHistory: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          projectContext,
          fileContents,
          currentFile,
        };

        // Call AI API
        const response = await fetch("/api/ai-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Convert CodeChange to FileModification format
        const suggestedChanges: FileModification[] = (data.suggestedChanges || []).map((change: CodeChange) => ({
          filePath: change.file,
          originalContent: "", // Will be filled when applying
          modifiedContent: change.content || "",
          changeDescription: `${change.action === "create" ? "Create" : "Modify"} file`,
          changeType: change.action === "create" ? "create" : "update",
        }));

        // Add AI response
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          suggestedChanges,
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (error) {
        console.error("AI Chat Error:", error);

        // Add error message
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "❌ Sorry, I encountered an error. Please check:\n\n1. Your Gemini API key is configured in `.env`\n2. You have internet connection\n3. The API key is valid\n\nError: " + (error instanceof Error ? error.message : "Unknown error"),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, buildProjectContext, currentFile]
  );

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "👋 Chat cleared! How can I help you with your project?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Toggle panel
  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Apply code modifications
  const applyModification = useCallback(
    async (modification: FileModification) => {
      if (onApplyModifications) {
        try {
          await onApplyModifications([modification]);
          
          // Add success message
          const successMsg: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `✅ Successfully applied changes to \`${modification.filePath}\``,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, successMsg]);
        } catch (error) {
          // Add error message
          const errorMsg: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `❌ Failed to apply changes: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      }
    },
    [onApplyModifications]
  );

  return {
    messages,
    isLoading,
    isOpen,
    sendMessage,
    clearChat,
    togglePanel,
    applyModification,
  };
};
