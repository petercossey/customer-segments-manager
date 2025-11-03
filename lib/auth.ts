import * as jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';
import * as BigCommerce from 'node-bigcommerce';
import { QueryParams, SessionContextProps, SessionProps } from '../types';
import db from './db';

const { AUTH_CALLBACK, CLIENT_ID, CLIENT_SECRET, JWT_KEY } = process.env;

// Create BigCommerce instance
// https://github.com/bigcommerce/node-bigcommerce/
const bigcommerce = new BigCommerce({
    logLevel: 'info',
    clientId: CLIENT_ID,
    secret: CLIENT_SECRET,
    callback: AUTH_CALLBACK,
    responseType: 'json',
    headers: { 'Accept-Encoding': '*' },
    apiVersion: 'v3',
});

const bigcommerceSigned = new BigCommerce({
    secret: CLIENT_SECRET,
    responseType: 'json',
});

export function bigcommerceClient(accessToken: string, storeHash: string, apiVersion = 'v3') {
    return new BigCommerce({
        clientId: CLIENT_ID,
        accessToken,
        storeHash,
        responseType: 'json',
        apiVersion,
    });
}

// Authorizes app on install
export function getBCAuth(query: QueryParams) {
    return bigcommerce.authorize(query);
}
// Verifies app on load/ uninstall
export function getBCVerify({ signed_payload_jwt }: QueryParams) {
    return bigcommerceSigned.verifyJWT(signed_payload_jwt);
}

export function setSession(session: SessionProps) {
    db.setUser(session);
    db.setStore(session);
    db.setStoreUser(session);
}

export async function getSession({ query: { context = '' } }: NextApiRequest) {
    try {
        console.log('[getSession] Starting session validation');
        console.log('[getSession] Context received:', context ? `${context.substring(0, 20)}...` : 'empty');

        if (typeof context !== 'string') {
            console.error('[getSession] Context is not a string:', typeof context);
            throw new Error('Context must be a string');
        }
        if (!context) {
            console.error('[getSession] Context is empty');
            throw new Error('Context is required');
        }

        console.log('[getSession] Decoding context');
        const decoded = decodePayload(context) as any;
        const storeHash = decoded?.context;
        const user = decoded?.user;

        console.log('[getSession] Decoded context:', {
            storeHash,
            userId: user?.id,
            userEmail: user?.email
        });

        if (!storeHash) {
            console.error('[getSession] Store hash not found in decoded context');
            throw new Error('Store hash not found in decoded context');
        }
        if (!user?.id) {
            console.error('[getSession] User ID not found in decoded context');
            throw new Error('User ID not found in decoded context');
        }

        console.log('[getSession] Checking if user exists in store');
        const hasUser = await db.hasStoreUser(storeHash, user.id);

        // Before retrieving session/ hitting APIs, check user
        if (!hasUser) {
            console.error('[getSession] User not found in storeUsers:', { storeHash, userId: user.id });
            throw new Error('User is not available. Please login or ensure you have access permissions.');
        }

        console.log('[getSession] User exists, retrieving access token');
        const accessToken = await db.getStoreToken(storeHash);

        if (!accessToken) {
            console.error('[getSession] Access token not found for store:', storeHash);
            throw new Error('Access token not found for store');
        }

        console.log('[getSession] Session validation successful');
        return { accessToken, storeHash, user };
    } catch (error) {
        console.error('[getSession] Error during session validation:', error.message);
        // Re-throw with more context
        if (error.message) {
            throw new Error(`Session validation failed: ${error.message}`);
        }
        throw error;
    }
}

// JWT functions to sign/ verify 'context' query param from /api/auth||load
export function encodePayload({ user, owner, ...session }: SessionProps) {
    const contextString = session?.context ?? session?.sub;
    const context = contextString.split('/')[1] || '';

    return jwt.sign({ context, user, owner }, JWT_KEY, { expiresIn: '24h' });
}
// Verifies JWT for getSession (product APIs)
export function decodePayload(encodedContext: string) {
    return jwt.verify(encodedContext, JWT_KEY);
}

// Removes store and storeUser on uninstall
export async function removeDataStore(session: SessionProps) {
    await db.deleteStore(session);
    await db.deleteUser(session);
}

// Removes users from app - getSession() for user will fail after user is removed
export async function removeUserData(session: SessionProps) {
    await db.deleteUser(session);
}

// Removes user from storeUsers on logout
export async function logoutUser({ storeHash, user }: SessionContextProps) {
    const session = { context: `store/${storeHash}`, user };
    await db.deleteUser(session);
}
