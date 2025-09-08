# MultiMind Deployment Guide

## Critical: Environment Variables Setup

**IMPORTANT**: For password reset emails to work in production, you MUST set the environment variable in your deployment platform.

### Required Environment Variables

```bash
# CRITICAL: Set this to your actual deployed URL
NEXT_PUBLIC_APP_URL=https://multimind-ai.vercel.app

# Other required variables
OPENROUTER_API_KEY=your_openrouter_api_key_here
NEXT_PUBLIC_SUPABASE_URL=https://bphjqqecqqljtqmvozvp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwaGpxcWVjcXFsanRxbXZvenZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTI3OTksImV4cCI6MjA3MTk4ODc5OX0.T0ZXDIJP75eIDtQ3m2KO69rRWX-DfJkizbMRoOskdWI
```

## Vercel Deployment Steps

1. **Go to your Vercel project dashboard**
2. **Navigate to Settings → Environment Variables**
3. **Add the environment variable:**
   - Name: `NEXT_PUBLIC_APP_URL`
   - Value: `https://multimind-ai.vercel.app`
4. **Redeploy your application** (trigger a new deployment)

## Troubleshooting Reset Links

If you're still getting localhost URLs in reset emails:

1. **Check browser console** - Look for the debug log: "Reset password redirect URL: ..."
2. **Verify environment variable** - Make sure it's set in Vercel dashboard
3. **Force redeploy** - Push a small change or manually trigger deployment
4. **Clear browser cache** - Hard refresh the deployed app

## Testing

After setting the environment variable:
1. Go to your deployed app: https://multimind-ai.vercel.app
2. Click "Forgot Password"
3. Enter your email
4. Check that the reset link in your email points to: `https://multimind-ai.vercel.app/reset-password`

The app now has multiple fallback mechanisms to ensure production URLs are used correctly.
