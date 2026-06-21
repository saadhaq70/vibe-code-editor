# Vercel Deployment Fix - GitHub OAuth Callback URL Issue

## Problem
GitHub OAuth error: "The redirect_uri is not associated with this application"

## Solution

### 1. Find Your Exact Vercel URLs

Go to Vercel Dashboard:
1. https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **Domains**
4. You'll see ALL domains assigned to your project, like:
   - `your-project.vercel.app`
   - `your-project-git-main-username.vercel.app`
   - `your-project-username.vercel.app`

### 2. Update GitHub OAuth App

Go to: https://github.com/settings/developers

For your OAuth App (Client ID: Ov23lib806OvmnzzKTry):

**Authorization callback URLs** (add ALL of these, one per line):

```
https://vibe-code-editor-saad-hs-projects-fbf021e8.vercel.app/api/auth/callback/github
https://vibe-code-editor-git-main-saad-hs-projects-fbf021e8.vercel.app/api/auth/callback/github
http://localhost:3000/api/auth/callback/github
```

**IMPORTANT:** 
- Add callback URL for EVERY domain you see in Vercel
- Make sure there's NO trailing slash
- The path MUST be exactly `/api/auth/callback/github`

### 3. Verify Environment Variables in Vercel

Make sure these are set in Vercel → Settings → Environment Variables:

```
NEXTAUTH_URL=https://vibe-code-editor-saad-hs-projects-fbf021e8.vercel.app
AUTH_GITHUB_ID=Ov23lib806OvmnzzKTry
AUTH_GITHUB_SECRET=8d95026d28712643030f582442be0ead058246ae
AUTH_SECRET=2785712e228fb5ea307c98f0c6c014e976b81911ac6a33f1ecd65132a47d1179
DATABASE_URL=mongodb+srv://codedit:IE8AaYEveeiOC5Js@cluster0.8pnbvsu.mongodb.net/codedit
```

### 4. Alternative: Use Wildcard Domain (Not Recommended but Quick Fix)

Some developers create a NEW GitHub OAuth app for each deployment environment.

### 5. After Changes

1. Save GitHub OAuth app settings
2. Wait 10-30 seconds
3. Clear your browser cache or try in Incognito/Private mode
4. Try signing in again

## Debugging

If still not working, check the actual redirect_uri being sent:

1. When you click "Sign in with GitHub"
2. Look at the URL in the address bar
3. Find the `redirect_uri` parameter
4. Copy that EXACT URL
5. Add it to GitHub OAuth app's callback URLs

## Common Mistakes

❌ Wrong: `https://your-app.vercel.app/api/auth/callback/github/`  (trailing slash)
✅ Correct: `https://your-app.vercel.app/api/auth/callback/github`

❌ Wrong: Adding only one domain when Vercel uses multiple
✅ Correct: Add ALL domains from Vercel dashboard

❌ Wrong: Not setting NEXTAUTH_URL environment variable
✅ Correct: Set NEXTAUTH_URL to your primary domain
