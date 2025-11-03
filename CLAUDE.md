# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a BigCommerce app built with Next.js that enables merchants to manage customer segments. The app is based on the BigCommerce NextJS Sample App and provides functionality to view, bulk generate, and bulk export coupon codes for Coupon Promotions.

## Development Commands

### Setup and Running
```bash
npm install              # Install dependencies
npm run dev             # Start development server (runs on port 3000)
npm run build           # Build for production
npm start               # Start production server
```

### Testing and Linting
```bash
npm test                # Run Jest tests
npm run lint            # Run ESLint on .ts, .tsx, .js files
```

### Database Setup
```bash
npm run db:setup        # Initialize database (see scripts/db.js)
```

## Architecture

### Authentication Flow
- **OAuth Installation**: `/api/auth` handles BigCommerce app installation via OAuth, creates JWT-encoded context
- **App Loading**: `/api/load` verifies signed payload when app loads in BigCommerce admin
- **Session Management**: JWT tokens encode `{context, user, owner}` with 24h expiration
- **User Verification**: `getSession()` in `lib/auth.ts` validates users before API access
- **Multi-user Support**: Users stored per-store with admin privileges tracked in database

### Database Abstraction Layer
Located in `lib/db.ts` and `lib/dbs/`:
- **Pluggable backends**: Supports Firebase (default) and MySQL via `DB_TYPE` env var
- **Key collections**:
  - `users`: Global user data (email, username) persists across store installs
  - `store`: Store-specific data (accessToken, adminId, scope)
  - `storeUsers`: Junction table for multi-user apps (userId_storeHash composite keys)
- Both implementations expose identical interface defined in `types/db.ts`

### API Structure
All endpoints in `pages/api/` follow pattern:
1. Extract session via `getSession(req)` to get `{accessToken, storeHash, user}`
2. Create BigCommerce client with `bigcommerceClient(accessToken, storeHash)`
3. Proxy requests to BigCommerce APIs
4. Handle errors with status codes

**Note**: Segments endpoints use axios directly instead of `node-bigcommerce` client due to batch API response format incompatibility.

### Frontend Architecture
- **Session Context**: `context/session.tsx` provides `SessionProvider` wrapping entire app
  - Context contains JWT-encoded query param from BigCommerce iframe
  - `bigCommerceSDK()` keeps app in sync with BC (heartbeat, logout events)
- **Data Fetching**: `lib/hooks.ts` contains SWR hooks for:
  - Segments: `useSegments()` - list customer segments with pagination
  - Customers: `useCustomer()` - fetch customer details
  - Orders: `useOrder()` - fetch order details (if extended)
- **Components**: UI built with BigCommerce BigDesign components
  - `components/segmentEditor.tsx` - Main segment editing interface
  - `components/createSegment.tsx` - Segment creation flow

### Type System
TypeScript types organized in `types/`:
- `auth.ts`: Session, user, and query param types
- `db.ts`: Database interface contracts
- `segment.ts`: Customer segment data structures
- Path aliases configured in `tsconfig.json`: `@components/*`, `@lib/*`, `@types`, etc.

### Environment Variables
Required variables (see README.md for full setup):
- `CLIENT_ID`, `CLIENT_SECRET`: BigCommerce app credentials
- `AUTH_CALLBACK`: OAuth callback URL (e.g., `https://domain.com/api/auth`)
- `JWT_KEY`: 32+ character secret for JWT signing (256 bits for HS256)
- `DB_TYPE`: `firebase` or `mysql`
- Firebase: `FIRE_API_KEY`, `FIRE_DOMAIN`, `FIRE_PROJECT_ID`
- MySQL: `MYSQL_HOST`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`

## Development Notes

### Adding New API Endpoints
1. Create handler in `pages/api/` directory (Next.js API routes)
2. Import `getSession` from `lib/auth.ts` and validate user access
3. Use `bigcommerceClient()` to interact with BigCommerce APIs
4. For batch operations, consider using axios directly (see segments example)

### Adding New Frontend Pages
1. Create page in `pages/` directory (file-based routing)
2. Wrap in `SessionProvider` if accessing BC context (done in `_app.tsx`)
3. Use `useSession()` hook to access context
4. Create SWR hooks in `lib/hooks.ts` for data fetching

### Database Schema Changes
Implement changes in both `lib/dbs/firebase.ts` and `lib/dbs/mysql.ts` to maintain interface compatibility.

### Node Version Requirements
- Node: `18.x`, `20.x`, or `22.x`

## Deployment

### Vercel (Recommended)
1. Fork/clone repository
2. Create new Vercel project from repo
3. Set environment variables in Vercel dashboard
4. Register BigCommerce draft app with Vercel domain callbacks
5. Deploy and install app in BigCommerce store

### Heroku
Use provided `app.json` for one-click deployment. Set environment variables in Heroku dashboard under Settings → Config Vars.

### Local Development with ngrok
1. Run `ngrok http 3000` to expose local server
2. Register BigCommerce draft app with ngrok URLs
3. Update `AUTH_CALLBACK` in `.env` with ngrok domain
4. Run `npm run dev` in separate terminal
