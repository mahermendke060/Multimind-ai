# MultiMind Deployment Guide

## Environment Variables Setup

When deploying MultiMind to any platform (Vercel, Netlify, Railway, etc.), you MUST set the following environment variable:

### Required Environment Variables

```bash
# CRITICAL: Set this to your actual deployed URL
NEXT_PUBLIC_APP_URL=https://multimind-ai.vercel.app

# Example for different platforms:
# Vercel: https://your-app.vercel.app
# Netlify: https://your-app.netlify.app
# Custom domain: https://yourdomain.com

# Other required variables
OPENROUTER_API_KEY=your_openrouter_api_key_here
NEXT_PUBLIC_SUPABASE_URL=https://bphjqqecqqljtqmvozvp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwaGpxcWVjcXFsanRxbXZvenZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTI3OTksImV4cCI6MjA3MTk4ODc5OX0.T0ZXDIJP75eIDtQ3m2KO69rRWX-DfJkizbMRoOskdWI
```

## Platform-Specific Instructions

### Vercel
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add `NEXT_PUBLIC_APP_URL` with value `https://your-app.vercel.app`
4. Redeploy your application

### Netlify
1. Go to Site settings → Environment variables
2. Add `NEXT_PUBLIC_APP_URL` with value `https://your-app.netlify.app`
3. Redeploy your application

### Railway/Render/Other Platforms
1. Find the environment variables section in your platform
2. Add `NEXT_PUBLIC_APP_URL` with your deployed URL
3. Redeploy your application

## Why This Is Important

The `NEXT_PUBLIC_APP_URL` environment variable is used for:
- Password reset email links
- OAuth redirects
- API referrer headers

Without setting this correctly:
- Password reset emails will contain localhost links (broken in production)
- Users won't be able to reset their passwords
- Some API calls may fail

## Testing Password Reset

After deployment:
1. Go to your deployed app
2. Click "Forgot Password"
3. Enter your email
4. Check that the reset link in your email points to your deployed domain (not localhost)

## Troubleshooting

If password reset links still show localhost:
1. Verify `NEXT_PUBLIC_APP_URL` is set correctly
2. Ensure you redeployed after setting the environment variable
3. Check browser developer tools for any console errors
4. Verify the environment variable is accessible in your deployed app
