# CampusMarket Deployment Guide (Vercel)

This project has been adapted for deployment on Vercel. 

## Vercel Setup

1.  **Framework Preset**: Ensure "Vite" is selected as the Framework Preset in your Vercel project settings.
2.  **Environment Variables**: Add the following Environment Variables in the Vercel Dashboard:
    *   `GEMINI_API_KEY`: Your Google AI API key (from Google AI Studio).
    *   `VITE_APP_URL`: Your Vercel deployment URL (e.g., `https://campusmarket.vercel.app`).
3.  **Routing**: A `vercel.json` has been added to handle Single Page Application (SPA) routing. This ensures that deep links (like `/market` or `/profile`) work correctly when refreshed.

## Firebase Configuration

1.  **Whitelisting**: Go to the [Firebase Console](https://console.firebase.google.com/), select your project, then navigate to **Authentication > Settings > Authorized Domains**.
2.  **Add Domain**: Add your Vercel deployment domain (e.g., `campusmarket.vercel.app`) to the list of authorized domains. This is required for Google Sign-In to function.

## Local Development

```bash
npm install
npm run dev
```
