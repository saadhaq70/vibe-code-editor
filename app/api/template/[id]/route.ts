import { db } from "@/lib/db";
import { templatePaths } from "@/lib/template";
import path from "path";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";

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

    if (!templateKey || !templatePaths[templateKey]) {
      return Response.json({ error: "Invalid template" }, { status: 404 });
    }

    // Try to load pre-generated template JSON from public folder
    const templateJsonPath = path.join(process.cwd(), "public", "templates", `${templateKey}.json`);
    
    try {
      const templateContent = await fs.readFile(templateJsonPath, "utf-8");
      const templateData: TemplateFolder = JSON.parse(templateContent);
      
      return Response.json({ 
        success: true, 
        templateJson: templateData 
      }, { status: 200 });
    } catch (fileError) {
      console.warn(`Pre-generated template not found for ${templateKey}, using fallback`);
      
      // Fallback template if JSON file doesn't exist
      const fallbackTemplate: TemplateFolder = {
        folderName: templateKey,
        items: [
          {
            filename: "index",
            fileExtension: "html",
            content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${templateKey} Project</title>
</head>
<body>
  <h1>Welcome to ${templateKey}</h1>
  <p>This is a starter template for ${templateKey}</p>
</body>
</html>`
          },
          {
            filename: "README",
            fileExtension: "md",
            content: `# ${templateKey} Project\n\nThis is your ${templateKey} project starter template.`
          }
        ]
      };
      
      return Response.json({ 
        success: true, 
        templateJson: fallbackTemplate 
      }, { status: 200 });
    }
  } catch (error) {
    console.error("Error loading template:", error);
    return Response.json({ 
      error: "Failed to load template", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
