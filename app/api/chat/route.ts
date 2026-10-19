import { NextRequest, NextResponse } from "next/server";
import { createGeminiModel, buildMessages, SYSTEM_PROMPTS, loadChatHistory, saveChatMessage } from "@/lib/langchain";
import { auth } from "@/auth";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history: ChatMessage[];
  sessionId?: string; // Optional session ID from frontend
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, history = [], sessionId: requestSessionId } = body;

    // Validate input
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
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

    // Validate history format from request
    const validHistory = Array.isArray(history)
      ? history.filter(
          (msg) =>
            msg &&
            typeof msg === "object" &&
            typeof msg.role === "string" &&
            typeof msg.content === "string" &&
            ["user", "assistant"].includes(msg.role)
        )
      : [];

    // Merge DB history with request history (prefer DB history)
    const mergedHistory = dbHistory.length > 0 ? dbHistory : validHistory;
    const recentHistory = mergedHistory.slice(-10);

    // Build messages using LangChain
    const langchainMessages = buildMessages(
      SYSTEM_PROMPTS.chat,
      recentHistory,
      message
    );

    // Generate AI response using LangChain
    const model = createGeminiModel('chat');
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

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
      sessionId, // Return session ID to frontend
    });
  } catch (error) {
    console.error("Chat API Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to generate AI response",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
