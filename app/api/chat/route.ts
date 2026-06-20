import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

async function generateAIResponse(messages: ChatMessage[]): Promise<string> {
  // Use separate API key for chat, fallback to main key if not set
  const apiKey = process.env.GEMINI_CHAT_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("GEMINI_CHAT_API_KEY or GEMINI_API_KEY is not configured");
    throw new Error("Gemini API key is not configured");
  }

  console.log("Using chat API key:", apiKey === process.env.GEMINI_CHAT_API_KEY ? "GEMINI_CHAT_API_KEY" : "GEMINI_API_KEY (fallback)");

  const systemPrompt = `You are a helpful AI coding assistant. You help developers with:
- Code explanations and debugging
- Best practices and architecture advice  
- Writing clean, efficient code
- Troubleshooting errors
- Code reviews and optimizations

Always provide clear, practical answers. Use proper code formatting when showing examples.`;

  // Convert chat history to Gemini format
  const geminiMessages = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // Prepend system instruction as first user message if no history
  if (geminiMessages.length === 1) {
    geminiMessages.unshift({
      role: "user",
      parts: [{ text: systemPrompt }],
    });
    geminiMessages.push({
      role: "model",
      parts: [{ text: "I understand. I'm ready to help you with coding questions and problems. What would you like to know?" }],
    });
  }

  try {
    console.log("Calling Gemini API for chat...");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
          ],
        }),
      }
    );

    console.log("Gemini Chat API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini Chat API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error("No candidates in Gemini chat response");
      throw new Error("No response from Gemini API");
    }

    const aiResponse = data.candidates[0].content.parts[0].text;
    console.log("Generated chat response:", aiResponse.substring(0, 100) + "...");
    
    return aiResponse.trim();
  } catch (error) {
    console.error("AI generation error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate AI response");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, history = [] } = body;

    // Validate input
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate history format
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

    const recentHistory = validHistory.slice(-10);

    const messages: ChatMessage[] = [
      ...recentHistory,
      { role: "user", content: message },
    ];

    //   Generate ai response

    const aiResponse = await generateAIResponse(messages);



    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
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
