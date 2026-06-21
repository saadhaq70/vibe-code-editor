# Deployment Guide - Vercel

## Prerequisites

1. A Vercel account connected to your GitHub repository
2. A MongoDB Atlas database
3. A GitHub OAuth App
4. Gemini API keys (for AI features)

## Step-by-Step Deployment

### 1. Set Up GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Vibe Code Editor
   - **Homepage URL**: `https://your-domain.vercel.app`
   - **Authorization callback URL**: `https://your-domain.vercel.app/api/auth/callback/github`
4. Save the **Client ID** and generate a new **Client Secret**

### 2. Set Up MongoDB Database

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Create a database user
4. Get your connection string (should look like: `mongodb+srv://username:password@cluster.mongodb.net/database`)
5. Make sure to replace `<password>` with your actual password and `database` with your database name

### 3. Generate AUTH_SECRET

Run this command to generate a secure random secret:

```bash
openssl rand -base64 32
```

### 4. Configure Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables for **Production**, **Preview**, and **Development**:

```
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
AUTH_SECRET=your_generated_secret
NEXTAUTH_URL=https://your-domain.vercel.app
GEMINI_API_KEY=your_gemini_api_key
GEMINI_CHAT_API_KEY=your_gemini_chat_api_key
```

**Important**: Make sure `NEXTAUTH_URL` matches your actual Vercel deployment URL.

### 5. Update GitHub OAuth Callback URL

After your first Vercel deployment, you'll get your actual URL (e.g., `https://vibe-code-editor-jet.vercel.app`).

**Critical**: Go back to your GitHub OAuth App settings and update the **Authorization callback URL** to:

```
https://vibe-code-editor-jet.vercel.app/api/auth/callback/github
```

Replace `vibe-code-editor-jet.vercel.app` with your actual Vercel domain.

### 6. Deploy

Push your code to GitHub:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

Vercel will automatically deploy your app.

### 7. Run Database Migrations

After deployment, you need to push the Prisma schema to your database:

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link your project:
   ```bash
   vercel link
   ```

3. Pull environment variables:
   ```bash
   vercel env pull .env.local
   ```

4. Run Prisma migrations:
   ```bash
   npx prisma db push
   ```

## Common Issues & Solutions

### Issue 1: "Get Started" button causes crash

**Cause**: User not authenticated, middleware redirect failing

**Solution**:
- Verify `AUTH_SECRET` is set in Vercel
- Verify `NEXTAUTH_URL` matches your Vercel URL exactly
- Check that GitHub OAuth callback URL is correct

### Issue 2: GitHub OAuth login fails

**Cause**: Callback URL mismatch

**Solution**:
- In GitHub OAuth App settings, set callback URL to: `https://your-domain.vercel.app/api/auth/callback/github`
- Ensure `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are correct in Vercel
- Make sure `NEXTAUTH_URL` environment variable matches your domain

### Issue 3: Playground templates fail to load

**Cause**: Template JSON files not found or API route error

**Solution**:
- Verify `public/templates/*.json` files are in the repository
- Check Vercel build logs for any errors
- Ensure the `prebuild` script ran successfully (check build logs)

### Issue 4: Database connection errors

**Cause**: MongoDB connection string incorrect or IP not whitelisted

**Solution**:
- Verify `DATABASE_URL` is correct in Vercel environment variables
- In MongoDB Atlas, go to **Network Access** and add `0.0.0.0/0` to allow connections from anywhere (Vercel's IP addresses are dynamic)
- Test the connection string locally first

### Issue 5: "Internal Server Error" on dashboard

**Cause**: Database not initialized with Prisma schema

**Solution**:
```bash
npx prisma db push
```

## Verification Checklist

After deployment, verify:

- [ ] Home page loads correctly (`/`)
- [ ] "Get Started" button redirects to sign-in page
- [ ] GitHub OAuth login works
- [ ] After login, redirected to `/dashboard`
- [ ] Dashboard loads without errors
- [ ] Can create a new playground
- [ ] Playground loads with template files
- [ ] Code editor works
- [ ] Preview panel shows running app

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | MongoDB connection string |
| `AUTH_GITHUB_ID` | ✅ | GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | ✅ | GitHub OAuth Client Secret |
| `AUTH_SECRET` | ✅ | NextAuth secret for JWT encryption |
| `NEXTAUTH_URL` | ✅ | Your Vercel deployment URL |
| `GEMINI_API_KEY` | ✅ | Gemini API key for AI features |
| `GEMINI_CHAT_API_KEY` | ✅ | Gemini Chat API key for AI chat |

## Need Help?

1. Check Vercel deployment logs for errors
2. Check browser console for client-side errors
3. Verify all environment variables are set correctly
4. Ensure GitHub OAuth callback URL matches your domain
5. Test database connection with `npx prisma db push`
