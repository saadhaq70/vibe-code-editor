# Vibe Code Editor

Vibe Code Editor is a browser based development workspace for creating projects, editing files, running them in a live preview, and getting AI help.

## Features

- **Project dashboard:** Create and reopen projects, browse recent and starred workspaces, and start from React, Next.js, Express, Vue, Hono, or Angular templates.
- **GitHub sign in:** Authenticate with GitHub and keep project data in the configured MongoDB database through Prisma.
- **File explorer:** Browse a project, open multiple files, and create, rename, or delete files and folders.
- **Code editor:** Edit files in Monaco with language highlighting and inline AI suggestions. Save one file or all changed files.
- **Live runtime:** Run supported projects in a WebContainer with an embedded preview and terminal.
- **AI chat:** Ask questions about the project, request explanations or code changes, and apply suggested file modifications from the chat.
- **Responsive workspace:** On narrow screens, use Code, Preview, and Terminal views; on wide screens, arrange the editor and preview beside each other. AI chat opens as a phone sheet or a desktop side dock.
- **Theme support:** Switch between light and dark appearance.

## AI tools

AI features use Gemini through LangChain and require `GEMINI_API_KEY`.

- **Inline suggestions:** Request a completion with `Ctrl+.` or `Ctrl+Space`; accept with `Tab` and reject with `Esc`.
- **AI chat:** Open Chat from the playground toolbar or the AI menu. Press `Enter` to send and `Shift+Enter` to add a line.
- **Suggested changes:** Review the assistant’s proposed file changes and use Apply to update the workspace.

## Run locally

### Requirements

- Node.js and npm
- MongoDB connection string
- GitHub OAuth application
- Gemini API key for AI features

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set the values below.

   | Variable | Purpose |
   | --- | --- |
   | `DATABASE_URL` | MongoDB connection string used by Prisma |
   | `AUTH_SECRET` | Secret used by NextAuth |
   | `AUTH_GITHUB_ID` | GitHub OAuth client ID |
   | `AUTH_GITHUB_SECRET` | GitHub OAuth client secret |
   | `NEXTAUTH_URL` | Local app URL, usually `http://localhost:3000` |
   | `GEMINI_API_KEY` | Gemini API key for AI chat and suggestions |

3. Set the GitHub OAuth callback URL to `http://localhost:3000/api/auth/callback/github` for local development.

4. Start the app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

If your database has not been initialized from the Prisma schema, run `npx prisma db push` with the local database URL configured.

## Tech stack

Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, NextAuth, Prisma, MongoDB, Monaco Editor, WebContainers, xterm.js, and LangChain with Google Gemini.
