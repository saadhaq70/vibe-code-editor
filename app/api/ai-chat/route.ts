import { NextRequest, NextResponse } from "next/server";
import { createGeminiModel, buildMessages, loadChatHistory, saveChatMessage } from "@/lib/langchain";
import { auth } from "@/auth";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FileContent {
  path: string;
  content: string;
  type: string;
}

interface ProjectContext {
  structure: Record<string, { size: number; type: string }>;
  framework: string;
  language: string;
  totalFiles: number;
}

interface ChatRequest {
  message: string;
  chatHistory: ChatMessage[];
  projectContext: ProjectContext;
  fileContents: FileContent[];
  currentFile?: string;
  sessionId?: string; // Optional session ID from frontend
}

interface CodeChange {
  file: string;
  action: "modify" | "create" | "delete";
  content?: string;
  lineStart?: number;
  lineEnd?: number;
  oldCode?: string;
  newCode?: string;
}

function buildProjectContextPrompt(
  message: string,
  projectContext: ProjectContext,
  fileContents: FileContent[],
  chatHistory: ChatMessage[],
  currentFile?: string
): string {
  // Build file structure tree
  const fileTree = Object.keys(projectContext.structure)
    .sort()
    .map((path) => `  ${path} (${projectContext.structure[path].type})`)
    .join("\n");

  // Include relevant file contents (limit to most relevant files)
  const relevantFiles = fileContents.slice(0, 10); // Limit to prevent token overflow
  const fileContentsStr = relevantFiles
    .map(
      (file) => `
## File: ${file.path}
\`\`\`${file.type}
${file.content}
\`\`\`
`
    )
    .join("\n");

  // Build chat history
  const historyStr = chatHistory
    .slice(-5) // Last 5 messages
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n");

  return `You are an expert AI coding assistant with full project context awareness. You help developers by understanding their entire codebase and providing intelligent suggestions, code generation, refactoring, and debugging assistance.

# Project Overview
- Framework: ${projectContext.framework}
- Primary Language: ${projectContext.language}
- Total Files: ${projectContext.totalFiles}
${currentFile ? `- Currently Viewing: ${currentFile}` : ""}

# Project File Structure
${fileTree}

# Relevant File Contents
${fileContentsStr}

${historyStr ? `# Previous Conversation\n${historyStr}\n` : ""}

# Current Request
User: ${message}

# Instructions
1. Analyze the user's request in the context of the entire project.
2. Understand which files are relevant to the request.
3. Provide a clear, human-readable explanation of what you are doing and why.
4. Show relevant code snippets with syntax highlighting in your explanation so the user understands the change.
5. Be concise but thorough. Use markdown formatting for clarity.
6. IMPORTANT — Structured code changes block:
   After your human-readable explanation, if you are creating or modifying any files, you MUST append a machine-readable block using EXACTLY this format (three tildes, not backticks):

~~~json
{
  "codeChanges": [
    {
      "file": "relative/path/to/file.ts",
      "action": "modify",
      "content": "...complete new file content here..."
    }
  ]
}
~~~

   Rules for the ~~~json block:
   - "action" must be either "modify" (edit existing file) or "create" (new file).
   - "file" must be the exact relative path as it appears in the Project File Structure above.
   - "content" must be the COMPLETE new file content (not a diff, not a snippet) — always the full file.
   - If no files are being changed (e.g., you are only explaining something), omit the ~~~json block entirely.
   - Do NOT put any text after the closing ~~~ of the block.

Generate your response:`;
}

/**
 * Extracts structured code changes from the ~~~json block appended by the AI.
 * Falls back to an empty array if the block is absent or malformed.
 */
function extractCodeChanges(response: string): CodeChange[] {
  // Match the ~~~json ... ~~~ block (three tildes)
  const blockPattern = /~~~json\s*([\s\S]*?)\s*~~~/;
  const match = blockPattern.exec(response);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed.codeChanges)) return [];

    return parsed.codeChanges
      .filter(
        (c: CodeChange) =>
          typeof c.file === "string" &&
          (c.action === "modify" || c.action === "create") &&
          typeof c.content === "string"
      )
      .map((c: CodeChange): CodeChange => ({
        file: c.file.trim(),
        action: c.action as "modify" | "create",
        content: c.content,
      }));
  } catch {
    return [];
  }
}

/**
 * Strips the ~~~json block from the AI response so the UI only shows
 * the human-readable explanation.
 */
function stripCodeChangesBlock(response: string): string {
  return response.replace(/~~~json[\s\S]*?~~~/g, "").trimEnd();
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    
    const { message, chatHistory, projectContext, fileContents, currentFile, sessionId: requestSessionId } = body;

    // Validate input
    if (!message || !projectContext) {
      return NextResponse.json(
        { error: "Message and project context are required" },
        { status: 400 }
      );
    }

    // Get user ID from auth session or use 'anonymous'
    const session = await auth();
    const userId = session?.user?.id || 'anonymous';

    // Get or generate session ID
    const sessionId = requestSessionId || crypto.randomUUID();

    // Load chat history from database
    let dbHistory: ChatMessage[] = [];
    try {
      const rawHistory = await loadChatHistory(userId, sessionId, 10);
      // Cast to ChatMessage[] since we know the DB stores 'user' or 'assistant' roles
      dbHistory = rawHistory.filter(
        msg => msg.role === 'user' || msg.role === 'assistant'
      ) as ChatMessage[];
    } catch (error) {
      console.warn("Failed to load chat history:", error);
      // Continue without history if DB fails
    }

    // Merge DB history with request history (prefer DB history)
    const mergedHistory = dbHistory.length > 0 ? dbHistory : chatHistory;

    // Build comprehensive prompt with full project context
    const projectContextPrompt = buildProjectContextPrompt(
      message,
      projectContext,
      fileContents,
      mergedHistory,
      currentFile
    );

    // Build messages using LangChain (merge system prompt with project context)
    const langchainMessages = buildMessages(
      projectContextPrompt,
      [], // History is already included in the prompt
      message // Pass the user message so Gemini has a non-empty HumanMessage
    );

    // Generate AI response using LangChain
    const model = createGeminiModel('chat', { maxOutputTokens: 8192 });
    const result = await model.invoke(langchainMessages);
    const aiResponse = typeof result.content === 'string' ? result.content : String(result.content);

    // Save user message and assistant response to database
    try {
      await saveChatMessage(userId, sessionId, 'user', message);
      await saveChatMessage(userId, sessionId, 'assistant', aiResponse);
    } catch (error) {
      console.warn("Failed to save chat messages:", error);
      // Continue even if save fails
    }

    // Extract structured code changes from the ~~~json block
    const suggestedChanges = extractCodeChanges(aiResponse);

    // Strip the machine-readable block before sending to the UI
    const humanResponse = stripCodeChangesBlock(aiResponse);

    return NextResponse.json({
      response: humanResponse,
      suggestedChanges,
      timestamp: new Date().toISOString(),
      sessionId, // Return session ID to frontend
    });
  } catch (error) {
    console.error("AI Chat API Error:", error);

    return NextResponse.json(
      {
        error: "Failed to process AI request",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
