import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { db } from "@/lib/db";

/**
 * System prompts for different AI roles
 */
export const SYSTEM_PROMPTS = {
  code: `You are an expert code assistant with deep knowledge of programming languages, frameworks, and best practices. 
You provide precise, well-structured code suggestions, refactoring, and implementations. 
Always maintain code quality, follow language conventions, and ensure your suggestions are production-ready.`,

  chat: `You are a helpful AI coding assistant. You help developers with:
- Code explanations and debugging
- Best practices and architecture advice  
- Writing clean, efficient code
- Troubleshooting errors
- Code reviews and optimizations

Always provide clear, practical answers. Use proper code formatting when showing examples.`,

  reviewer: `You are an expert code reviewer with extensive experience in software engineering.
You analyze code for correctness, performance, security, maintainability, and adherence to best practices.
Provide constructive, actionable feedback with specific recommendations.`
};

/**
 * Creates a ChatGoogleGenerativeAI model instance configured for a specific role
 */
export function createGeminiModel(
  role: 'code' | 'chat' | 'reviewer',
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
  }
): ChatGoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log("GEMINI_API_KEY check:", apiKey ? "Found" : "NOT FOUND");
  console.log("API Key length:", apiKey?.length);
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables");
  }

  // Default configurations per role
  const roleDefaults = {
    code: { temperature: 0.2, maxOutputTokens: 8192 },
    chat: { temperature: 0.7, maxOutputTokens: 4096 },
    reviewer: { temperature: 0.3, maxOutputTokens: 4096 }
  };

  const config = {
    ...roleDefaults[role],
    ...options
  };

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: "gemini-3.8-flash",
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
  });
}

/**
 * Builds a message array from system prompt, chat history, and user message
 */
export function buildMessages(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string
): BaseMessage[] {
  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt)
  ];

  // Add chat history
  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else if (msg.role === 'assistant') {
      messages.push(new AIMessage(msg.content));
    }
  }

  // Add current user message (skip if empty to avoid Gemini "empty input" errors)
  if (userMessage && userMessage.trim().length > 0) {
    messages.push(new HumanMessage(userMessage));
  }

  return messages;
}

/**
 * Loads chat history from database for a user and optional session
 */
export async function loadChatHistory(
  userId: string,
  sessionId?: string | null,
  limit: number = 10
): Promise<Array<{ role: string; content: string }>> {
  const where: { userId: string; sessionId?: string | null } = { userId };
  
  if (sessionId !== undefined) {
    where.sessionId = sessionId;
  }

  const messages = await db.chatMessage.findMany({
    where,
    orderBy: {
      createdAt: 'asc'
    },
    take: limit
  });

  return messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

/**
 * Saves a chat message to the database
 */
export async function saveChatMessage(
  userId: string,
  sessionId: string | null,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  await db.chatMessage.create({
    data: {
      userId,
      sessionId,
      role,
      content,
      createdAt: new Date()
    }
  });
}
