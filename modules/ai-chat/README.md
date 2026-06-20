# AI Chat with Full Project Context

This module provides an AI-powered chat assistant with complete project awareness, similar to Kiro's interface.

## Features

✅ **Full Project Context** - AI knows your entire codebase
✅ **Natural Language Commands** - Ask anything about your project
✅ **Code Generation** - Generate components, functions, and features
✅ **Multi-File Changes** - Apply changes across multiple files
✅ **Smart Suggestions** - Context-aware recommendations
✅ **Powered by Gemini 1.5 Flash** - Fast and intelligent responses

## Setup

### 1. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key

### 2. Configure Environment

Add to `.env`:
```env
GEMINI_API_KEY=your_api_key_here
```

### 3. Integration Example

Add the AI Chat Panel to your playground page:

```typescript
// app/playground/[id]/page.tsx
import { AIChatPanel } from "@/modules/ai-chat/components/AIChatPanel";
import { useAIChat } from "@/modules/ai-chat/hooks/useAIChat";

export default function PlaygroundPage() {
  const { templateData, activeFile } = useFileExplorer();
  
  const {
    messages,
    isLoading,
    isOpen,
    sendMessage,
    clearChat,
    togglePanel,
  } = useAIChat({
    templateData,
    currentFile: activeFile?.filename,
  });

  const handleApplyChange = (change: CodeChange) => {
    // Apply the AI-suggested change to your editor
    // Implementation depends on your editor setup
    console.log("Applying change:", change);
  };

  return (
    <div>
      {/* Your existing playground UI */}
      
      {/* AI Chat Panel */}
      <AIChatPanel
        messages={messages}
        isLoading={isLoading}
        isOpen={isOpen}
        onSendMessage={sendMessage}
        onTogglePanel={togglePanel}
        onClearChat={clearChat}
        onApplyChange={handleApplyChange}
      />
    </div>
  );
}
```

## Usage Examples

### Ask General Questions
```
User: "What does this project do?"
AI: "This is a Next.js application with..."
```

### Generate Code
```
User: "Create a new Button component with variants"
AI: "I'll create a Button component for you..."
```

### Refactor Code
```
User: "Refactor the API route to use middleware"
AI: "Here's how to refactor it..."
```

### Fix Issues
```
User: "Fix the TypeScript errors in utils.ts"
AI: "I found 3 TypeScript errors. Here are the fixes..."
```

### Add Features
```
User: "Add authentication to the app"
AI: "I'll add authentication using NextAuth..."
```

## API Endpoints

### POST /api/ai-chat

Request:
```json
{
  "message": "Add validation to the form",
  "chatHistory": [...],
  "projectContext": {
    "structure": {...},
    "framework": "Next.js",
    "language": "TypeScript",
    "totalFiles": 45
  },
  "fileContents": [...],
  "currentFile": "src/components/Form.tsx"
}
```

Response:
```json
{
  "response": "I'll add validation...",
  "suggestedChanges": [
    {
      "file": "src/lib/validation.ts",
      "action": "create",
      "content": "export const validateForm = ..."
    }
  ],
  "timestamp": "2026-06-20T..."
}
```

## Components

### AIChatPanel
Main chat interface with message history, input, and code preview.

**Props:**
- `messages`: ChatMessage[] - Chat history
- `isLoading`: boolean - Loading state
- `isOpen`: boolean - Panel visibility
- `onSendMessage`: (message: string) => void
- `onTogglePanel`: () => void
- `onClearChat`: () => void
- `onApplyChange?`: (change: CodeChange) => void

### useAIChat Hook
Manages chat state and AI interactions.

**Props:**
- `templateData`: TemplateFolder | null - Project structure
- `currentFile?`: string - Active file path

**Returns:**
- `messages`: ChatMessage[] - All messages
- `isLoading`: boolean - Request in progress
- `isOpen`: boolean - Panel open state
- `sendMessage`: (message: string) => void
- `clearChat`: () => void
- `togglePanel`: () => void

## Architecture

```
User Input
    ↓
useAIChat Hook
    ↓
Extract All Project Files
    ↓
Build Context (structure + contents)
    ↓
POST /api/ai-chat
    ↓
Build Comprehensive Prompt
    ↓
Gemini 1.5 Flash API
    ↓
Parse Response + Extract Code Changes
    ↓
Display in UI with Apply Buttons
    ↓
User Applies Changes
```

## Cost & Rate Limits

**Gemini 1.5 Flash (Free Tier):**
- 15 requests per minute
- 1 million tokens per day
- 1 million token context window
- 100% FREE

Perfect for a code editor with multiple users!

## Troubleshooting

### "GEMINI_API_KEY is not configured"
- Ensure `.env` has `GEMINI_API_KEY=your_key`
- Restart your dev server after adding the key

### "API error: 429"
- You've hit the rate limit (15 req/min)
- Wait a minute and try again
- Consider upgrading to paid tier for higher limits

### "No response from Gemini API"
- Check your internet connection
- Verify your API key is valid
- Check Google AI Studio for any service issues

## Advanced Features

### Custom Apply Logic
Implement `onApplyChange` to integrate with your editor:

```typescript
const handleApplyChange = async (change: CodeChange) => {
  if (change.action === "create") {
    // Create new file
    await createFile(change.file, change.content);
  } else if (change.action === "modify") {
    // Modify existing file
    await updateFile(change.file, change.content);
  }
  
  // Refresh editor
  refreshEditor();
  
  toast.success(`Applied changes to ${change.file}`);
};
```

### Context Customization
Modify `buildProjectContext()` to include/exclude specific files or add custom metadata.

## Future Enhancements

- [ ] Diff view for code changes
- [ ] Undo/redo for applied changes
- [ ] Multi-file diff preview
- [ ] Export chat to markdown
- [ ] Voice input support
- [ ] Code execution in sandbox

## License

MIT
