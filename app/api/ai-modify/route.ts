import { type NextRequest, NextResponse } from "next/server";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";
import {
  indexCodebase,
  findRelatedFiles,
  createCodebaseSummary,
} from "@/lib/codebase-indexer";

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
      currentFileContent,
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
      selectedCode,
      currentFileContent
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
  selectedCode?: string,
  currentFileContent?: string
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
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    console.log("🤖 Calling Gemini API for code modifications...");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2, // Lower temperature for more precise code modifications
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 8192, // Higher limit for multi-file modifications
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }

    let aiResponse = data.candidates[0].content.parts[0].text;
    console.log("🤖 AI Response received:", aiResponse.substring(0, 200));

    // Extract JSON from response (handle markdown code blocks)
    let jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      aiResponse = jsonMatch[1];
    } else {
      // Try to find JSON array directly
      const arrayMatch = aiResponse.match(/\[\s*{[\s\S]*}\s*\]/);
      if (arrayMatch) {
        aiResponse = arrayMatch[0];
      }
    }

    // Parse the JSON response
    let modifications: Array<{
      filePath: string;
      modifiedContent: string;
      changeDescription: string;
      changeType: "update" | "create" | "delete";
    }>;

    try {
      modifications = JSON.parse(aiResponse.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", aiResponse);
      throw new Error("AI response was not valid JSON");
    }

    if (!Array.isArray(modifications)) {
      console.error("AI response is not an array:", modifications);
      throw new Error("AI response must be an array of modifications");
    }

    // Map to FileModification format with original content
    const result: FileModification[] = modifications.map((mod) => {
      const originalFile = targetFiles.find((f) => f.path === mod.filePath);

      return {
        filePath: mod.filePath,
        originalContent: originalFile?.content || "",
        modifiedContent: mod.modifiedContent,
        changeDescription: mod.changeDescription,
        changeType: mod.changeType,
      };
    });

    return result;
  } catch (error) {
    console.error("Error generating modifications:", error);
    throw error;
  }
}
