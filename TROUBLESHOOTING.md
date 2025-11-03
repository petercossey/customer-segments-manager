# Troubleshooting Guide

This document provides guidance on troubleshooting common issues with the Customer Segments Manager app.

## Loading Spinner on Segments Tab

If the Segments tab shows an infinite loading spinner, follow these steps to diagnose the issue:

### 1. Check Browser Console Logs

Open your browser's developer tools (F12) and check the Console tab. Look for logs prefixed with:
- `[SessionProvider]` - Session context initialization
- `[useSegments]` - Segments data fetching hook
- `[hooks]` - HTTP request details
- `[Segments]` - Component rendering state

**Expected flow:**
```
[SessionProvider] Router query changed
[SessionProvider] Setting context: eyJhbGciOiJIUzI1NiIsI...
[SessionProvider] Current context state: present
[useSegments] Hook called with context: present
[hooks] Fetching: /api/segments?context=eyJhbGciOiJIUzI1NiIsI...
[hooks] Response status: 200 for /api/segments
[hooks] Successfully fetched data from /api/segments
[useSegments] SWR state - data: present, error: null
[Segments] Component state: { segments: '5 items', ... }
```

**Common issues:**
- **No context in query params**: The app may not be loaded within the BigCommerce iframe correctly
- **401 Unauthorized**: Session validation failed - check server logs
- **500 Internal Server Error**: API endpoint error - check Vercel logs

### 2. Check Vercel Logs

In your Vercel dashboard, navigate to your deployment and check the Function Logs for the `/api/segments` endpoint.

Look for structured logs:
```json
{
  "level": "info",
  "method": "GET",
  "query": { "context": "...", "limit": "250" },
  "msg": "Segments API called"
}
```

**Common error patterns:**

#### Session Validation Errors
```
[getSession] Context is empty
[getSession] User not found in storeUsers
[getSession] Access token not found for store
```

**Solution**: Reinstall the app in BigCommerce to recreate the session

#### BigCommerce API Errors
```
Error in segments GET request
response: { status: 401, message: "Unauthorized" }
```

**Solution**: Check that your `CLIENT_ID` and `CLIENT_SECRET` environment variables are correct

### 3. Verify Environment Variables

Ensure all required environment variables are set in Vercel:

**Required:**
- `CLIENT_ID` - BigCommerce app client ID
- `CLIENT_SECRET` - BigCommerce app client secret
- `AUTH_CALLBACK` - OAuth callback URL (e.g., `https://your-app.vercel.app/api/auth`)
- `JWT_KEY` - 32+ character secret for JWT signing
- `DB_TYPE` - `vercel-kv`, `firebase`, or `mysql`

**For Vercel KV (recommended):**
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

These are auto-populated when you create a Vercel KV database in your project.

### 4. Test API Endpoints Directly

You can test the segments API endpoint directly by copying the full URL from browser console logs and pasting it into a new tab.

Example:
```
https://your-app.vercel.app/api/segments?context=eyJhbGci...&limit=250
```

This should return JSON with a `data` array and `meta` object if working correctly.

### 5. Check Database Connections

The app stores session data in your configured database backend. Verify:

**Vercel KV:**
```bash
# In Vercel project settings, check that KV database is linked
# Test connection in Vercel KV dashboard
```

**Common issues:**
- KV database not linked to project
- Wrong environment variables
- Database connection timeout

### 6. Common Error Messages

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Context is required" | No context query param | Ensure app is loaded in BigCommerce iframe |
| "Session validation failed" | JWT decode error | Check JWT_KEY matches value used during installation |
| "User is not available" | User not in storeUsers table | Reinstall app or check database |
| "Access token not found" | Store not in database | Reinstall app |
| Network error | CORS or connection issue | Check Vercel deployment status |

## Production Monitoring

### Structured Logging

The app uses Pino for structured logging. In production (Vercel), logs are output as JSON for easy parsing:

```json
{
  "level": 30,
  "time": 1699056035860,
  "msg": "Segments API called",
  "method": "GET",
  "query": { "context": "...", "limit": "250" }
}
```

### Log Levels
- `info` (30) - Normal operations
- `warn` (40) - Warning conditions
- `error` (50) - Error conditions

### Viewing Logs in Vercel

1. Go to your project in Vercel dashboard
2. Click on the deployment
3. Navigate to "Functions" tab
4. Select the function (e.g., `/api/segments`)
5. View real-time logs or filter by time range

### Client-Side Telemetry

Browser console logs provide detailed client-side telemetry:

- **Session context lifecycle**: Track when context is set/cleared
- **HTTP requests**: See exact URLs and response statuses
- **Component state**: View loading/error/success states
- **Hook behavior**: SWR caching and revalidation

## Performance Tips

1. **SWR Caching**: The app uses SWR for client-side caching. Data is cached and revalidated automatically.

2. **Database Performance**:
   - Vercel KV (Redis) is recommended for best performance
   - MySQL connections may timeout on cold starts

3. **API Rate Limits**: BigCommerce has API rate limits. The app uses sensible defaults (limit=250) to minimize requests.

## Getting Help

If you're still experiencing issues:

1. Check GitHub Issues: https://github.com/bigcommerce/sample-app-nodejs/issues
2. Review BigCommerce API documentation
3. Check Vercel status: https://www.vercel-status.com/

## Development vs Production

**Development:**
- Logs are formatted with pino-pretty for readability
- More verbose console output
- Use `npm run dev` to test locally with ngrok

**Production:**
- Logs are JSON for structured logging
- Console logs visible in browser developer tools
- Vercel Function Logs capture server-side logs
