import { type NextRequest, NextResponse } from "next/server";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";
import {
  indexCodebase,
  findRelatedFiles,
  createCodebaseSummary,
} from "@/lib/codebase-indexer";

interface CodeSuggestionRequest {
  fileContent: string;
  cursorLine: number;
  cursorColumn: number;
  suggestionType: string;
  fileName?: string;
  filePath?: string;
  templateData?: TemplateFolder; // Full codebase context
}

interface CodeContext {
  language: string;
  framework: string;
  beforeContext: string;
  currentLine: string;
  afterContext: string;
  cursorPosition: { line: number; column: number };
  isInFunction: boolean;
  isInClass: boolean;
  isAfterComment: boolean;
  incompletePatterns: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CodeSuggestionRequest = await request.json();

    const {
      fileContent,
      cursorLine,
      cursorColumn,
      suggestionType,
      fileName,
      filePath,
      templateData,
    } = body;

    // Validate input
    if (!fileContent || cursorLine < 0 || cursorColumn < 0 || !suggestionType) {
      return NextResponse.json(
        { error: "Invalid input parameters" },
        { status: 400 }
      );
    }

    const context = analyzeCodeContext(
      fileContent,
      cursorLine,
      cursorColumn,
      fileName
    );

    // Build codebase context if templateData is provided
    let codebaseContext: {
      summary: string;
      relatedFiles: Array<{ path: string; content: string; exports: string[] }>;
      projectStructure: string;
    } | null = null;

    if (templateData && filePath) {
      try {
        // Index the entire codebase
        const codebaseIndex = indexCodebase(templateData);

        // Find related files (dependencies and dependents)
        const relatedFiles = findRelatedFiles(filePath, codebaseIndex, 2);

        // Create concise summary
        const summary = createCodebaseSummary(codebaseIndex, 8000);

        codebaseContext = {
          summary,
          relatedFiles: relatedFiles.slice(0, 5).map((f) => ({
            path: f.path,
            content: f.content.substring(0, 1000), // First 1000 chars
            exports: [...f.exports, ...f.components, ...f.functions],
          })),
          projectStructure: codebaseIndex.projectStructure.substring(0, 2000),
        };

        console.log(
          `✓ Indexed codebase: ${codebaseIndex.totalFiles} files, found ${relatedFiles.length} related files`
        );
      } catch (error) {
        console.error("Error indexing codebase:", error);
        // Continue without codebase context if indexing fails
      }
    }

    const prompt = buildPrompt(context, suggestionType, codebaseContext);

    const suggestion = await generateSuggestion(prompt);

    return NextResponse.json({
      suggestion,
      context,
      codebaseContext: codebaseContext
        ? {
            relatedFilesCount: codebaseContext.relatedFiles.length,
            hasProjectStructure: !!codebaseContext.projectStructure,
          }
        : null,
      metadata: {
        language: context.language,
        framework: context.framework,
        position: context.cursorPosition,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Context analysis error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function analyzeCodeContext(
  content: string,
  line: number,
  column: number,
  fileName?: string
): CodeContext {
  const lines = content.split("\n");
  const currentLine = lines[line] || "";

  // Get surrounding context (10 lines before and after)
  const contextRadius = 10;
  const startLine = Math.max(0, line - contextRadius);
  const endLine = Math.min(lines.length, line + contextRadius);

  const beforeContext = lines.slice(startLine, line).join("\n");
  const afterContext = lines.slice(line + 1, endLine).join("\n");

  // Detect language and framework
  const language = detectLanguage(content, fileName);
  const framework = detectFramework(content);

  // Analyze code patterns
  const isInFunction = detectInFunction(lines, line);
  const isInClass = detectInClass(lines, line);
  const isAfterComment = detectAfterComment(currentLine, column);
  const incompletePatterns = detectIncompletePatterns(currentLine, column);

  return {
    language,
    framework,
    beforeContext,
    currentLine,
    afterContext,
    cursorPosition: { line, column },
    isInFunction,
    isInClass,
    isAfterComment,
    incompletePatterns,
  };
}

function buildPrompt(
  context: CodeContext,
  suggestionType: string,
  codebaseContext?: {
    summary: string;
    relatedFiles: Array<{ path: string; content: string; exports: string[] }>;
    projectStructure: string;
  } | null
): string {
  let prompt = `You are an expert code completion assistant. Generate a ${suggestionType} suggestion.

Language: ${context.language}
Framework: ${context.framework}`;

  // Add codebase context if available
  if (codebaseContext) {
    prompt += `

# Project Context
${codebaseContext.projectStructure}

# Available Exports from Related Files`;

    for (const file of codebaseContext.relatedFiles) {
      if (file.exports.length > 0) {
        prompt += `\n\n## ${file.path}
Exports: ${file.exports.join(", ")}`;
      }
    }

    prompt += `

# Project Summary
${codebaseContext.summary}`;
  }

  prompt += `

# Current File Context
${context.beforeContext}
${context.currentLine.substring(
  0,
  context.cursorPosition.column
)}|CURSOR|${context.currentLine.substring(context.cursorPosition.column)}
${context.afterContext}

Analysis:
- In Function: ${context.isInFunction}
- In Class: ${context.isInClass}
- After Comment: ${context.isAfterComment}
- Incomplete Patterns: ${context.incompletePatterns.join(", ") || "None"}

Instructions:
1. Provide only the code that should be inserted at the cursor
2. Maintain proper indentation and style consistent with the project
3. Follow ${context.language} best practices
4. Use imports and exports from related files when appropriate
5. Make the suggestion contextually appropriate for the entire codebase
6. DO NOT include any explanations, just the code

Generate suggestion:`;

  return prompt;
}

async function generateSuggestion(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not configured");
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // Fallback model hierarchy: Try from best to worst
  // Note: Only gemini-2.5-flash is currently available in v1beta API
  const models = [
    { name: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ];

  let lastError: Error | null = null;

  // Try each model in sequence
  for (const model of models) {
    try {
      console.log(`Attempting to call ${model.label}...`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 500,
            },
          }),
        }
      );

      console.log(`${model.label} response status:`, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${model.label} error:`, response.status, errorText);
        
        // Check if it's a quota/rate limit error
        const isQuotaError = 
          response.status === 429 || 
          errorText.includes("quota") || 
          errorText.includes("rate limit") ||
          errorText.includes("RESOURCE_EXHAUSTED");

        if (isQuotaError) {
          console.log(`${model.label} quota exhausted, trying next model...`);
          lastError = new Error(`${model.label} quota exceeded`);
          continue; // Try next model
        }

        // For other errors, throw immediately
        throw new Error(`${model.label} error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`${model.label} response:`, JSON.stringify(data).substring(0, 200));
      
      if (!data.candidates || data.candidates.length === 0) {
        console.error(`No candidates in ${model.label} response`);
        throw new Error(`No response from ${model.label}`);
      }

      let suggestion = data.candidates[0].content.parts[0].text;

      // Clean up the suggestion
      if (suggestion.includes("```")) {
        const codeMatch = suggestion.match(/```[\w]*\n?([\s\S]*?)```/);
        suggestion = codeMatch ? codeMatch[1].trim() : suggestion;
      }

      console.log(`✓ Successfully generated suggestion using ${model.label}`);
      console.log("Generated suggestion:", suggestion.substring(0, 100) + "...");
      return suggestion;

    } catch (error) {
      console.error(`${model.label} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next model
    }
  }

  // All models failed
  console.error("All Gemini models failed:", lastError);
  return "// AI suggestion unavailable - all models exhausted";
}

// Helper functions for code analysis
function detectLanguage(content: string, fileName?: string): string {
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      ts: "TypeScript",
      tsx: "TypeScript",
      js: "JavaScript",
      jsx: "JavaScript",
      py: "Python",
      java: "Java",
      go: "Go",
      rs: "Rust",
      php: "PHP",
    };
    if (ext && extMap[ext]) return extMap[ext];
  }

  // Content-based detection
  if (content.includes("interface ") || content.includes(": string"))
    return "TypeScript";
  if (content.includes("def ") || content.includes("import ")) return "Python";
  if (content.includes("func ") || content.includes("package ")) return "Go";

  return "JavaScript";
}

function detectFramework(content: string): string {
  if (content.includes("import React") || content.includes("useState"))
    return "React";
  if (content.includes("import Vue") || content.includes("<template>"))
    return "Vue";
  if (content.includes("@angular/") || content.includes("@Component"))
    return "Angular";
  if (content.includes("next/") || content.includes("getServerSideProps"))
    return "Next.js";

  return "None";
}

function detectInFunction(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i];
    if (line?.match(/^\s*(function|def|const\s+\w+\s*=|let\s+\w+\s*=)/))
      return true;
    if (line?.match(/^\s*}/)) break;
  }
  return false;
}

function detectInClass(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i];
    if (line?.match(/^\s*(class|interface)\s+/)) return true;
  }
  return false;
}

function detectAfterComment(line: string, column: number): boolean {
  const beforeCursor = line.substring(0, column);
  return /\/\/.*$/.test(beforeCursor) || /#.*$/.test(beforeCursor);
}

function detectIncompletePatterns(line: string, column: number): string[] {
  const beforeCursor = line.substring(0, column);
  const patterns: string[] = [];

  if (/^\s*(if|while|for)\s*\($/.test(beforeCursor.trim()))
    patterns.push("conditional");
  if (/^\s*(function|def)\s*$/.test(beforeCursor.trim()))
    patterns.push("function");
  if (/\{\s*$/.test(beforeCursor)) patterns.push("object");
  if (/\[\s*$/.test(beforeCursor)) patterns.push("array");
  if (/=\s*$/.test(beforeCursor)) patterns.push("assignment");
  if (/\.\s*$/.test(beforeCursor)) patterns.push("method-call");

  return patterns;
}
