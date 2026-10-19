import { type NextRequest, NextResponse } from "next/server";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";
import {
  indexCodebase,
  findRelatedFiles,
  createCodebaseSummary,
} from "@/lib/codebase-indexer";
import { createGeminiModel } from "@/lib/langchain";

export interface FileModification {
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  changeDescription: string;
  changeType: "update" | "create" | "delete";
}

export interface AIModifyRequest {
  instruction: string; // User's instruction (e.g., "Add error handling to all API calls")
  templateData: TemplateFolder;
  currentFilePath?: string;
  currentFileContent?: string;
  selectedCode?: string; // If user has selected specific code
  contextFiles?: string[]; // Specific files to focus on
}

export interface AIModifyResponse {
  success: boolean;
  modifications: FileModification[];
  explanation: string;
  affectedFiles: string[];
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AIModifyRequest = await request.json();

    const {
      instruction,
      templateData,
      currentFilePath,
      selectedCode,
      contextFiles,
    } = body;

    // Validate input
    if (!instruction || !templateData) {
      return NextResponse.json(
        { error: "Instruction and templateData are required" },
        { status: 400 }
      );
    }

    console.log(`🤖 AI Modify Request: "${instruction}"`);

    // Index the codebase
    const codebaseIndex = indexCodebase(templateData);
    console.log(`📊 Indexed ${codebaseIndex.totalFiles} files`);

    // Determine which files to modify
    let targetFiles = codebaseIndex.files;

    if (currentFilePath) {
      // If a current file is specified, find related files
      const relatedFiles = findRelatedFiles(currentFilePath, codebaseIndex, 1);
      const currentFile = codebaseIndex.files.find(
        (f) => f.path === currentFilePath
      );

      if (currentFile) {
        targetFiles = [currentFile, ...relatedFiles];
      }
    }

    if (contextFiles && contextFiles.length > 0) {
      // User specified specific files
      targetFiles = codebaseIndex.files.filter((f) =>
        contextFiles.includes(f.path)
      );
    }

    // Limit to reasonable number of files to avoid overwhelming the AI
    targetFiles = targetFiles.slice(0, 10);

    console.log(`🎯 Targeting ${targetFiles.length} files for modification`);

    // Create prompt for AI
    const prompt = buildModificationPrompt(
      instruction,
      targetFiles.map((f) => ({
        path: f.path,
        content: f.content,
        exports: [...f.exports, ...f.components],
      })),
      createCodebaseSummary(codebaseIndex, 5000),
      selectedCode
    );

    // Generate modifications using AI
    const modifications = await generateModifications(prompt, targetFiles);

    console.log(`✅ Generated ${modifications.length} file modifications`);

    return NextResponse.json({
      success: true,
      modifications,
      explanation: modifications.length > 0 
        ? `Generated modifications for ${modifications.length} file(s) based on: "${instruction}"`
        : "No modifications needed based on the instruction.",
      affectedFiles: modifications.map((m) => m.filePath),
    } as AIModifyResponse);
  } catch (error) {
    console.error("AI Modify Error:", error);
    return NextResponse.json(
      {
        success: false,
        modifications: [],
        explanation: "",
        affectedFiles: [],
        error: error instanceof Error ? error.message : "Unknown error",
      } as AIModifyResponse,
      { status: 500 }
    );
  }
}

function buildModificationPrompt(
  instruction: string,
  files: Array<{ path: string; content: string; exports: string[] }>,
  codebaseSummary: string,
  selectedCode?: string
): string {
  let prompt = `You are an expert code modification assistant. Your task is to analyze code and make precise modifications based on user instructions.

# User Instruction
${instruction}

# Project Context
${codebaseSummary}

# Files to Modify
`;

  for (const file of files) {
    prompt += `
## File: ${file.path}
\`\`\`
${file.content}
\`\`\`
`;
  }

  if (selectedCode) {
    prompt += `

# Selected Code (Focus Here)
\`\`\`
${selectedCode}
\`\`\`
`;
  }

  prompt += `

# Your Task
Analyze the code and generate modifications to fulfill the user's instruction.

**IMPORTANT OUTPUT FORMAT:**
You MUST respond with a valid JSON array of modifications. Each modification object must have:
- filePath: string (the file path)
- modifiedContent: string (the complete new file content)
- changeDescription: string (what changed)
- changeType: "update" | "create" | "delete"

Example response format:
\`\`\`json
[
  {
    "filePath": "src/api/users.ts",
    "modifiedContent": "// complete modified file content here",
    "changeDescription": "Added error handling to API calls",
    "changeType": "update"
  }
]
\`\`\`

**Rules:**
1. Only modify files that need changes for the instruction
2. Preserve all existing functionality unless instructed to change it
3. Maintain code style and formatting
4. Include complete file content in modifiedContent (not diffs)
5. If no modifications are needed, return an empty array: []
6. Return ONLY the JSON array, no other text

Generate modifications:`;

  return prompt;
}

async function generateModifications(
  prompt: string,
  targetFiles: Array<{ path: string; content: string }>
): Promise<FileModification[]> {
  try {
    console.log("🤖 Calling LangChain with Gemini for code modifications...");

    // Create model with structured output
    const baseModel = createGeminiModel('code', { maxOutputTokens: 8192 });
    
    // Define JSON schema for structured output (no Zod)
    const schema = {
      type: "object",
      properties: {
        modifications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              filePath: { type: "string" },
              modifiedContent: { type: "string" },
              changeDescription: { type: "string" },
              changeType: { type: "string", enum: ["update", "create", "delete"] }
            },
            required: ["filePath", "modifiedContent", "changeDescription", "changeType"]
          }
        }
      },
      required: ["modifications"]
    };

    // Create structured output model
    const structuredModel = baseModel.withStructuredOutput(schema);

    // Invoke the model
    const result = await structuredModel.invoke(prompt) as { modifications: Array<{
      filePath: string;
      modifiedContent: string;
      changeDescription: string;
      changeType: "update" | "create" | "delete";
    }> };

    // Extract modifications array
    const modifications = result.modifications || [];

    if (!Array.isArray(modifications)) {
      console.error("AI response does not contain modifications array:", result);
      throw new Error("AI response must contain a modifications array");
    }

    // Map to FileModification format with original content
    const fileModifications: FileModification[] = modifications.map((mod) => {
      const originalFile = targetFiles.find((f) => f.path === mod.filePath);

      return {
        filePath: mod.filePath,
        originalContent: originalFile?.content || "",
        modifiedContent: mod.modifiedContent,
        changeDescription: mod.changeDescription,
        changeType: mod.changeType,
      };
    });

    console.log(`✅ Generated ${fileModifications.length} modifications using LangChain`);
    return fileModifications;
  } catch (error) {
    console.error("Error generating modifications:", error);
    throw error;
  }
}
