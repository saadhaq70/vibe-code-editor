import { TemplateFile, TemplateFolder } from "@/modules/playground/lib/path-to-json";

export interface FileIndex {
  path: string;
  filename: string;
  extension: string;
  content: string;
  imports: string[];
  exports: string[];
  functions: string[];
  classes: string[];
  components: string[];
  types: string[];
  size: number;
}

export interface CodebaseIndex {
  files: FileIndex[];
  totalFiles: number;
  totalSize: number;
  filesByExtension: Record<string, number>;
  importGraph: Record<string, string[]>;
  projectStructure: string;
}

/**
 * Recursively traverse template structure and extract all files
 */
export function extractAllFiles(
  folder: TemplateFolder,
  currentPath: string = ""
): Array<{ path: string; file: TemplateFile }> {
  const allFiles: Array<{ path: string; file: TemplateFile }> = [];

  for (const item of folder.items) {
    if ("folderName" in item) {
      // It's a folder, recurse
      const folderPath = currentPath
        ? `${currentPath}/${item.folderName}`
        : item.folderName;
      allFiles.push(...extractAllFiles(item, folderPath));
    } else {
      // It's a file
      const filePath = currentPath
        ? `${currentPath}/${item.filename}.${item.fileExtension}`
        : `${item.filename}.${item.fileExtension}`;
      allFiles.push({ path: filePath, file: item });
    }
  }

  return allFiles;
}

/**
 * Extract imports from file content
 */
export function extractImports(content: string, extension: string): string[] {
  const imports: string[] = [];

  if (["ts", "tsx", "js", "jsx"].includes(extension)) {
    // Match ES6 imports
    const importRegex = /import\s+(?:{[^}]*}|[\w*]+)?\s*(?:,\s*{[^}]*})?\s*from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Match require statements
    const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
  } else if (extension === "py") {
    // Python imports
    const importRegex = /(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1] || match[2]);
    }
  }

  return imports;
}

/**
 * Extract exports from file content
 */
export function extractExports(content: string, extension: string): string[] {
  const exports: string[] = [];

  if (["ts", "tsx", "js", "jsx"].includes(extension)) {
    // Named exports
    const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    // Default exports
    if (content.includes("export default")) {
      exports.push("default");
    }
  }

  return exports;
}

/**
 * Extract function names from file content
 */
export function extractFunctions(content: string, extension: string): string[] {
  const functions: string[] = [];

  if (["ts", "tsx", "js", "jsx"].includes(extension)) {
    // Regular functions
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }

    // Arrow functions assigned to const/let/var
    const arrowFunctionRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
    while ((match = arrowFunctionRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }
  } else if (extension === "py") {
    // Python functions
    const pyFunctionRegex = /def\s+(\w+)/g;
    let match;
    while ((match = pyFunctionRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }
  }

  return functions;
}

/**
 * Extract class names from file content
 */
export function extractClasses(content: string, extension: string): string[] {
  const classes: string[] = [];

  if (["ts", "tsx", "js", "jsx"].includes(extension)) {
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }
  } else if (extension === "py") {
    const pyClassRegex = /class\s+(\w+)/g;
    let match;
    while ((match = pyClassRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }
  }

  return classes;
}

/**
 * Extract React components from file content
 */
export function extractComponents(content: string, extension: string): string[] {
  const components: string[] = [];

  if (["tsx", "jsx"].includes(extension)) {
    // Function components
    const componentRegex = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)\s*(?:=\s*\([^)]*\)\s*(?::|=>)|(?:\([^)]*\))\s*(?::\s*\w+\s*)?{)/g;
    let match;
    while ((match = componentRegex.exec(content)) !== null) {
      components.push(match[1]);
    }
  }

  return components;
}

/**
 * Extract TypeScript types and interfaces
 */
export function extractTypes(content: string, extension: string): string[] {
  const types: string[] = [];

  if (["ts", "tsx"].includes(extension)) {
    // Interfaces
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
    let match;
    while ((match = interfaceRegex.exec(content)) !== null) {
      types.push(match[1]);
    }

    // Type aliases
    const typeRegex = /(?:export\s+)?type\s+(\w+)/g;
    while ((match = typeRegex.exec(content)) !== null) {
      types.push(match[1]);
    }

    // Enums
    const enumRegex = /(?:export\s+)?enum\s+(\w+)/g;
    while ((match = enumRegex.exec(content)) !== null) {
      types.push(match[1]);
    }
  }

  return types;
}

/**
 * Index a single file
 */
export function indexFile(path: string, file: TemplateFile): FileIndex {
  const content = file.content;
  const extension = file.fileExtension;

  return {
    path,
    filename: file.filename,
    extension,
    content,
    imports: extractImports(content, extension),
    exports: extractExports(content, extension),
    functions: extractFunctions(content, extension),
    classes: extractClasses(content, extension),
    components: extractComponents(content, extension),
    types: extractTypes(content, extension),
    size: content.length,
  };
}

/**
 * Build import graph showing file dependencies
 */
export function buildImportGraph(files: FileIndex[]): Record<string, string[]> {
  const graph: Record<string, string[]> = {};

  for (const file of files) {
    const dependencies: string[] = [];

    for (const importPath of file.imports) {
      // Resolve relative imports to actual file paths
      if (importPath.startsWith(".")) {
        // This is a relative import
        const fileDir = file.path.split("/").slice(0, -1).join("/");
        const resolvedPath = resolveRelativePath(fileDir, importPath);
        
        // Find matching file
        const matchingFile = files.find(
          (f) =>
            f.path === resolvedPath ||
            f.path === `${resolvedPath}.ts` ||
            f.path === `${resolvedPath}.tsx` ||
            f.path === `${resolvedPath}.js` ||
            f.path === `${resolvedPath}.jsx` ||
            f.path === `${resolvedPath}/index.ts` ||
            f.path === `${resolvedPath}/index.tsx`
        );

        if (matchingFile) {
          dependencies.push(matchingFile.path);
        }
      }
    }

    graph[file.path] = dependencies;
  }

  return graph;
}

/**
 * Resolve relative import path
 */
function resolveRelativePath(currentDir: string, importPath: string): string {
  const parts = currentDir.split("/").filter(Boolean);

  const importParts = importPath.split("/");
  for (const part of importParts) {
    if (part === "..") {
      parts.pop();
    } else if (part !== ".") {
      parts.push(part);
    }
  }

  return parts.join("/");
}

/**
 * Generate project structure tree
 */
export function generateProjectStructure(folder: TemplateFolder, indent: string = ""): string {
  let structure = "";

  for (const item of folder.items) {
    if ("folderName" in item) {
      structure += `${indent}📁 ${item.folderName}/\n`;
      structure += generateProjectStructure(item, indent + "  ");
    } else {
      structure += `${indent}📄 ${item.filename}.${item.fileExtension}\n`;
    }
  }

  return structure;
}

/**
 * Main function to index entire codebase
 */
export function indexCodebase(templateData: TemplateFolder): CodebaseIndex {
  // Extract all files
  const allFiles = extractAllFiles(templateData);

  // Index each file
  const fileIndexes = allFiles.map(({ path, file }) => indexFile(path, file));

  // Build import graph
  const importGraph = buildImportGraph(fileIndexes);

  // Calculate statistics
  const totalSize = fileIndexes.reduce((sum, file) => sum + file.size, 0);
  const filesByExtension: Record<string, number> = {};
  
  for (const file of fileIndexes) {
    filesByExtension[file.extension] = (filesByExtension[file.extension] || 0) + 1;
  }

  // Generate project structure
  const projectStructure = generateProjectStructure(templateData);

  return {
    files: fileIndexes,
    totalFiles: fileIndexes.length,
    totalSize,
    filesByExtension,
    importGraph,
    projectStructure,
  };
}

/**
 * Find files related to a given file (imports and dependents)
 */
export function findRelatedFiles(
  filePath: string,
  index: CodebaseIndex,
  depth: number = 2
): FileIndex[] {
  const related = new Set<string>();
  const visited = new Set<string>();

  function traverse(path: string, currentDepth: number) {
    if (currentDepth > depth || visited.has(path)) return;
    visited.add(path);

    // Add direct dependencies
    const dependencies = index.importGraph[path] || [];
    for (const dep of dependencies) {
      related.add(dep);
      traverse(dep, currentDepth + 1);
    }

    // Add files that import this file
    for (const [file, deps] of Object.entries(index.importGraph)) {
      if (deps.includes(path)) {
        related.add(file);
        traverse(file, currentDepth + 1);
      }
    }
  }

  traverse(filePath, 0);

  return index.files.filter((f) => related.has(f.path));
}

/**
 * Create a concise summary of the codebase for AI context
 */
export function createCodebaseSummary(index: CodebaseIndex, maxLength: number = 10000): string {
  let summary = `# Project Structure\n${index.projectStructure}\n\n`;
  
  summary += `# Statistics\n`;
  summary += `- Total Files: ${index.totalFiles}\n`;
  summary += `- Total Size: ${Math.round(index.totalSize / 1024)}KB\n`;
  summary += `- Files by Type: ${Object.entries(index.filesByExtension)
    .map(([ext, count]) => `${ext}(${count})`)
    .join(", ")}\n\n`;

  summary += `# Key Files and Exports\n`;
  for (const file of index.files) {
    if (file.exports.length > 0 || file.components.length > 0) {
      summary += `\n## ${file.path}\n`;
      
      if (file.components.length > 0) {
        summary += `Components: ${file.components.join(", ")}\n`;
      }
      if (file.functions.length > 0) {
        summary += `Functions: ${file.functions.slice(0, 5).join(", ")}${file.functions.length > 5 ? "..." : ""}\n`;
      }
      if (file.classes.length > 0) {
        summary += `Classes: ${file.classes.join(", ")}\n`;
      }
      if (file.types.length > 0) {
        summary += `Types: ${file.types.slice(0, 5).join(", ")}${file.types.length > 5 ? "..." : ""}\n`;
      }
    }

    // Truncate if too long
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength) + "\n... (truncated)";
      break;
    }
  }

  return summary;
}
