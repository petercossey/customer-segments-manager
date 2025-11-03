# Storage Setup Guide

This guide explains how to set up database storage for your BigCommerce app on Vercel in 2025.

## Overview

The app needs a database to store:
- OAuth access tokens for BigCommerce API calls
- User sessions and permissions
- Store configuration data

## Recommended: Upstash Redis

**Why Upstash?**
- Serverless Redis (same technology that powered deprecated Vercel KV)
- Free tier: 10,000 commands/day
- Global edge network for low latency
- Simple REST API
- No connection pooling issues in serverless

### Setup Instructions

#### 1. Create an Upstash Account

1. Go to [https://upstash.com/](https://upstash.com/)
2. Sign up for a free account
3. Create a new Redis database:
   - Click "Create Database"
   - Choose a name (e.g., "customer-segments")
   - Select a region close to your Vercel deployment
   - Choose "Global" for best performance across regions
   - Click "Create"

#### 2. Get Your Credentials

After creating the database:
1. Go to the database details page
2. Scroll to "REST API" section
3. Copy these values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

#### 3. Add to Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add these variables:
   ```
   DB_TYPE=upstash
   UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   ```
4. Make sure to add them for all environments (Production, Preview, Development)

#### 4. Deploy and Reinstall

1. Redeploy your Vercel app (or push a new commit)
2. Reinstall the BigCommerce app to create initial session data

### Cost

**Free Tier:**
- 10,000 commands per day
- 256 MB storage
- Perfect for development and small stores

**Pay-as-you-go:**
- $0.2 per 100,000 commands
- $0.25 per GB storage per month

## Alternative: Vercel KV (Legacy)

If you have an existing Vercel KV database (created before June 2025), you can continue using it:

### Environment Variables

Set these in Vercel:
```
DB_TYPE=vercel-kv
KV_REST_API_URL=your-url
KV_REST_API_TOKEN=your-token
KV_REST_API_READ_ONLY_TOKEN=your-readonly-token
KV_URL=your-redis-url
```

**Note:** Vercel KV is deprecated and no longer available for new projects. Migrate to Upstash when possible.

## Alternative: MySQL

If you prefer SQL, you can use MySQL:

### Environment Variables

```
DB_TYPE=mysql
MYSQL_HOST=your-host
MYSQL_DATABASE=your-database
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
```

### Database Schema

Create these tables:

```sql
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(255)
);

CREATE TABLE stores (
    store_hash VARCHAR(255) PRIMARY KEY,
    access_token TEXT NOT NULL,
    scope TEXT NOT NULL,
    admin_id VARCHAR(255) NOT NULL
);

CREATE TABLE store_users (
    user_id VARCHAR(255) NOT NULL,
    store_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, store_hash)
);
```

**Providers to consider:**
- [PlanetScale](https://planetscale.com/) - Serverless MySQL
- [Railway](https://railway.app/) - Simple MySQL hosting
- [Neon](https://neon.tech/) - Postgres (would need adapter updates)

## Alternative: Firebase

Firebase Realtime Database or Firestore:

### Environment Variables

```
DB_TYPE=firebase
FIRE_API_KEY=your-api-key
FIRE_DOMAIN=your-app.firebaseapp.com
FIRE_PROJECT_ID=your-project-id
```

### Setup

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Realtime Database or Firestore
3. Get your configuration from Project Settings
4. Add credentials to Vercel environment variables

## Comparison

| Provider | Type | Best For | Free Tier | Latency |
|----------|------|----------|-----------|---------|
| **Upstash** | Redis | Session storage, recommended | 10k cmds/day | Very Low (Edge) |
| Vercel KV | Redis | Legacy projects only | Deprecated | Very Low (Edge) |
| MySQL | SQL | Complex queries, relational data | Varies | Medium |
| Firebase | NoSQL | Real-time features, Google integration | 1GB storage | Low |

## Troubleshooting

### Error: Missing required environment variables

**Problem:**
```
Error loading segments: Session validation failed: Missing required environment variables
```

**Solution:**
1. Check that environment variables are set in Vercel
2. Make sure they're added to the correct environment (Production/Preview/Development)
3. Redeploy after adding variables
4. Reinstall the BigCommerce app

### Error: Connection timeout

**Problem:** MySQL connections timeout in serverless functions

**Solution:**
- Use connection pooling
- Consider switching to Upstash Redis (no connection management needed)
- Increase function timeout in Vercel settings

### Error: Rate limit exceeded

**Problem:** Upstash free tier limit (10k commands/day) exceeded

**Solution:**
- Upgrade to pay-as-you-go plan
- Optimize database calls (use caching)
- Review session expiration settings

## Migration Guide

### From Vercel KV to Upstash

Since Upstash is the same technology behind Vercel KV, the data structure is identical:

1. **Export data from Vercel KV** (if needed):
   ```bash
   # Use redis-cli or Upstash console to export
   redis-cli --scan --pattern "*" > keys.txt
   ```

2. **Update environment variables** in Vercel:
   ```
   DB_TYPE=upstash
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

3. **Deploy** the updated app

4. **Reinstall** the BigCommerce app (this will recreate session data in Upstash)

### From MySQL to Upstash

Manual migration required:

1. Export user, store, and store_user data from MySQL
2. Set up Upstash as described above
3. Manually import key data (or just reinstall the app)
4. Update `DB_TYPE` to `upstash`
5. Redeploy and reinstall

## Best Practices

1. **Use Upstash for production** - It's specifically designed for serverless
2. **Set up monitoring** - Track Redis command usage in Upstash dashboard
3. **Implement TTL** - Set expiration on session keys to save storage
4. **Test locally** - Use ngrok and local development before deploying
5. **Backup critical data** - Export store tokens periodically

## Getting Help

- **Upstash Docs:** https://upstash.com/docs
- **Vercel Support:** https://vercel.com/support
- **BigCommerce API Docs:** https://developer.bigcommerce.com/
