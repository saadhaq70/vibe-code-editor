import { saveTemplateStructureToJson } from "../modules/playground/lib/path-to-json";
import { templatePaths } from "../lib/template";
import path from "path";
import fs from "fs/promises";

async function generateAllTemplates() {
  console.log("🚀 Generating template JSONs...");
  
  const outputDir = path.join(process.cwd(), "public", "templates");
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  for (const [templateKey, templatePath] of Object.entries(templatePaths)) {
    console.log(`\n📦 Processing ${templateKey}...`);
    
    const inputPath = path.join(process.cwd(), templatePath);
    const outputFile = path.join(outputDir, `${templateKey}.json`);

    try {
      // Check if directory exists
      await fs.access(inputPath);
      
      // Generate template JSON
      await saveTemplateStructureToJson(inputPath, outputFile);
      
      console.log(`✅ Generated ${templateKey}.json`);
    } catch (error) {
      console.error(`❌ Failed to generate ${templateKey}:`, error);
      
      // Create a fallback template
      const fallbackTemplate = {
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
      
      await fs.writeFile(outputFile, JSON.stringify(fallbackTemplate, null, 2));
      console.log(`⚠️  Created fallback template for ${templateKey}`);
    }
  }
  
  console.log("\n✨ All templates generated successfully!");
}

generateAllTemplates().catch(console.error);
