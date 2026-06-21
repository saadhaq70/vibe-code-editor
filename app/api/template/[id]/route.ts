import {
  readTemplateStructureFromJson,
  saveTemplateStructureToJson,
} from "@/modules/playground/lib/path-to-json";
import { db } from "@/lib/db";
import { templatePaths } from "@/lib/template";
import path from "path";
import fs from "fs/promises";
import { NextRequest } from "next/server";

function validateJsonStructure(data: unknown): boolean {
  try {
    JSON.parse(JSON.stringify(data)); // Ensures it's serializable
    return true;
  } catch (error) {
    console.error("Invalid JSON structure:", error);
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const {id} = await params;

  if(!id){
    return Response.json({ error: "Missing playground ID" }, { status: 400 });
  }

  try {
    const playground = await db.playground.findUnique({
      where:{id}
    })

    if (!playground) {
      return Response.json({ error: "Playground not found" }, { status: 404 });
    }
    
    const templateKey = playground.template as keyof typeof templatePaths;
    const templatePath = templatePaths[templateKey]

    if (!templatePath) {
      return Response.json({ error: "Invalid template" }, { status: 404 });
    }

    const inputPath = path.join(process.cwd() , templatePath);
    
    // Check if template directory exists
    let templateExists = false;
    try {
      await fs.access(inputPath);
      templateExists = true;
    } catch (error) {
      console.warn(`Template directory not found: ${inputPath}`);
    }

    // If template directory doesn't exist, return a basic structure
    if (!templateExists) {
      console.log(`Using fallback template for ${templateKey}`);
      return Response.json({ 
        success: true, 
        templateJson: {
          folderName: templateKey,
          items: [
            {
              filename: "index",
              fileExtension: "html",
              content: "<!DOCTYPE html>\n<html>\n<head>\n  <title>Project</title>\n</head>\n<body>\n  <h1>Welcome to your project</h1>\n</body>\n</html>"
            },
            {
              filename: "README",
              fileExtension: "md",
              content: `# ${templateKey} Project\n\nThis is your ${templateKey} project.`
            }
          ]
        }
      }, { status: 200 });
    }

    const outputDir = path.join(process.cwd() , `output`);
    const outputFile = path.join(outputDir , `${templateKey}.json`);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    await saveTemplateStructureToJson(inputPath , outputFile);
    const result = await readTemplateStructureFromJson(outputFile);

    // Validate the JSON structure before saving
    if (!validateJsonStructure(result.items)) {
      return Response.json({ error: "Invalid JSON structure" }, { status: 500 });
    }

    // Clean up the output file
    try {
      await fs.unlink(outputFile);
    } catch (cleanupError) {
      console.warn("Failed to delete temporary file:", cleanupError);
    }

    return Response.json({ success: true, templateJson: result }, { status: 200 });
  } catch (error) {
    console.error("Error generating template JSON:", error);
    return Response.json({ 
      error: "Failed to generate template", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
