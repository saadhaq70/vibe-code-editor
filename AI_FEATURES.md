# AI Features Documentation

## Overview
The Vibe Code Editor now includes a comprehensive AI assistant with full codebase awareness and real-time code modification capabilities.

## Features

### 1. **AI Chat Assistant** 🤖
Located in the bottom-right corner of the playground with a floating bot button.

#### Capabilities:
- **Full Project Context**: AI has access to your entire codebase
- **Natural Language Interactions**: Ask questions, request features, get explanations
- **Code Modifications**: AI can suggest and apply changes to multiple files
- **Intelligent Understanding**: Knows your framework, dependencies, and code structure

#### How to Use:
1. Click the **Bot icon** in bottom-right corner
2. Type your request in natural language:
   - "Add error handling to all API calls"
   - "Create a new user profile component"
   - "Refactor the authentication logic"
   - "Add TypeScript types to this file"
   - "Explain how the login flow works"
3. Review AI's response and suggested changes
4. Click **Apply** on any suggested file changes to implement them

#### Chat Features:
- 💬 **Conversational History**: Maintains context across messages
- 📝 **Markdown Support**: Formatted responses with code highlighting
- 🔄 **Minimize/Maximize**: Collapsible interface
- 🗑️ **Clear Chat**: Start fresh conversations
- ✅ **One-Click Apply**: Apply code changes instantly

### 2. **Inline AI Code Suggestions** ✨
GitHub Copilot-style inline suggestions while you code.

#### Triggers:
- **Manual**: Press `Ctrl+.` or `Ctrl+Space`
- **Auto**: Triggers after typing `,`, `.`, `{`, `=`, `;`, `(`, `:`, or newline

#### Controls:
- **Accept**: Press `Tab`
- **Reject**: Press `Esc`

#### How It Works:
1. AI analyzes your current file and related files
2. Understands imports, exports, and dependencies
3. Suggests contextually appropriate code
4. Shows as gray ghost text in editor
5. Includes project-wide context for better suggestions

### 3. **Context-Aware Codebase Analysis** 🔍
Behind the scenes, the AI system:

- **Indexes Your Project**: 
  - Extracts all functions, classes, components, types
  - Builds dependency graph
  - Maps imports and exports

- **Understands Relationships**:
  - Finds related files
  - Tracks file dependencies
  - Detects framework and language

- **Provides Relevant Context**:
  - Includes up to 5 related files in suggestions
  - Shows available exports from dependencies
  - Understands project structure

## API Configuration

### Required Environment Variables
```env
# For inline code suggestions (uses more quota)
GEMINI_API_KEY="your-gemini-api-key-here"

# For AI chat (separate key recommended for quota management)
GEMINI_CHAT_API_KEY="your-chat-api-key-here"  # Optional, falls back to GEMINI_API_KEY
```

### Get API Keys
Get your free Gemini API key from: https://makersuite.google.com/app/apikey

### Model Fallbacks
The system automatically tries these models in order:
1. `gemini-2.5-flash` (Primary - best quality)
2. `gemini-1.5-flash-latest` (Fallback)
3. `gemini-1.5-flash` (Fallback)
4. `gemini-1.5-pro-latest` (Fallback)
5. `gemini-pro` (Last resort)

## Example Use Cases

### 1. Add Feature
```
You: "Add a dark mode toggle to the navigation bar"
AI: [Analyzes nav component, creates toggle component, updates theme logic]
    [Shows suggested changes for 3 files]
You: [Click Apply on each change]
```

### 2. Refactor Code
```
You: "Refactor the user authentication to use React Context instead of prop drilling"
AI: [Analyzes auth flow, creates Context provider, updates components]
    [Shows changes for AuthContext.tsx, login page, protected routes]
You: [Review and apply changes]
```

### 3. Debug Issue
```
You: "Why is my API call failing in the dashboard?"
AI: [Analyzes API routes, error handling, provides explanation]
    [Suggests adding try-catch and proper error states]
You: [Apply error handling improvements]
```

### 4. Generate Component
```
You: "Create a reusable data table component with sorting and filtering"
AI: [Generates complete component with TypeScript types]
    [Creates Table.tsx, TableRow.tsx, table utilities]
You: [Apply to add new files]
```

## Technical Architecture

### Backend APIs

#### `/api/ai-chat`
- Handles conversational AI interactions
- Receives full project context
- Returns human-readable responses
- Extracts structured code changes from AI response
- Uses Gemini 2.5 Flash with 8192 token limit

#### `/api/code-completion`
- Handles inline code suggestions
- Includes related files in context
- Uses Gemini 2.5 Flash with 500 token limit
- Optimized for fast responses

#### `/api/ai-modify`
- Generates multi-file modifications
- Analyzes up to 10 files
- Returns structured JSON modifications
- Lower temperature (0.2) for precision

### Frontend Components

#### `AIChatPanel`
- Floating chat interface
- Markdown rendering with syntax highlighting
- Suggested changes UI with apply buttons
- Message history and context

#### `useAIChat` Hook
- Manages chat state and history
- Builds project context
- Converts code changes to file modifications
- Handles applying changes to files

#### `useAISuggestions` Hook
- Manages inline suggestions
- Triggers AI requests
- Handles suggestion acceptance/rejection
- Integrates with Monaco editor

### Codebase Indexer

#### `lib/codebase-indexer.ts`
Provides comprehensive project analysis:
- `indexCodebase()`: Analyzes entire project
- `extractImports()`: Finds all imports
- `extractExports()`: Finds all exports  
- `extractFunctions()`: Finds all functions
- `extractClasses()`: Finds all classes
- `extractComponents()`: Finds React components
- `buildImportGraph()`: Creates dependency graph
- `findRelatedFiles()`: Finds connected files
- `createCodebaseSummary()`: Generates AI-friendly summary

## Best Practices

### For Better AI Responses:

1. **Be Specific**: 
   - ✅ "Add error handling to the login API route"
   - ❌ "Fix the login"

2. **Provide Context**:
   - ✅ "Refactor UserProfile component to use React Query for data fetching"
   - ❌ "Make it faster"

3. **Review Before Applying**:
   - Always read AI's explanation
   - Check suggested changes match your intent
   - Test after applying changes

4. **Use for Appropriate Tasks**:
   - ✅ Boilerplate generation
   - ✅ Refactoring patterns
   - ✅ Adding error handling
   - ✅ Type definitions
   - ❌ Critical security logic
   - ❌ Complex business logic without review

### Quota Management:

- **Inline Suggestions**: Uses quota frequently (auto-trigger)
- **Chat**: Uses more tokens per request but less frequent
- **Separate Keys**: Use different keys for each to avoid quota conflicts
- **Free Tier**: Gemini offers 60 requests/minute for free

## Troubleshooting

### "AI suggestions unavailable"
- Check `GEMINI_API_KEY` in `.env`
- Verify API key is valid
- Check quota limits (60 requests/min free tier)
- Restart dev server after adding key

### Chat not working
- Check `GEMINI_CHAT_API_KEY` or `GEMINI_API_KEY`
- Check browser console for errors
- Verify template data is loaded
- Try refreshing the page

### Changes not applying
- Check browser console for errors
- Verify file paths match project structure
- Ensure files exist in template
- Check file permissions

### Suggestions taking too long
- Normal: 1-3 seconds
- Slow: 5+ seconds (may indicate network issues)
- Timeout: 30+ seconds (check API key and quota)

## Future Enhancements

Potential improvements:
- [ ] Streaming responses for faster feedback
- [ ] Multiple suggestion variants
- [ ] Voice input for chat
- [ ] Diff preview before applying changes
- [ ] Undo/redo for AI changes
- [ ] Custom AI instructions per project
- [ ] Integration with Git for automatic commits

## Credits

Built with:
- **Gemini AI** by Google
- **Monaco Editor** for code editing
- **React** and **Next.js** for UI
- **WebContainer** for live preview

---

**Need Help?** Open an issue or check the documentation at `/AI_CHAT_INTEGRATION.md`
