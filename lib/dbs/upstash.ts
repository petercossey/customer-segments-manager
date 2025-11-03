import { Redis } from '@upstash/redis';
import { SessionProps, UserData } from '../../types';

// Upstash Redis data management functions (direct connection, not through Vercel)
// This is the recommended alternative to deprecated Vercel KV
// Keys structure:
// - user:{userId} → UserData
// - store:{storeHash} → {accessToken, scope, adminId}
// - storeUser:{userId}_{storeHash} → {storeHash, isAdmin}

// Initialize Upstash Redis client
// Required environment variables:
// - UPSTASH_REDIS_REST_URL
// - UPSTASH_REDIS_REST_TOKEN
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Use setUser for storing global user data (persists between installs)
export async function setUser({ user }: SessionProps) {
    if (!user) return null;

    const { email, id, username } = user;
    const key = `user:${id}`;
    const data: UserData = { email };

    if (username) {
        data.username = username;
    }

    await redis.set(key, data);
}

export async function setStore(session: SessionProps) {
    const {
        access_token: accessToken,
        context,
        scope,
        user: { id },
    } = session;
    // Only set on app install or update
    if (!accessToken || !scope) return null;

    const storeHash = context?.split('/')[1] || '';
    const key = `store:${storeHash}`;
    const data = { accessToken, adminId: id, scope };

    await redis.set(key, data);
}

// User management for multi-user apps
// Use setStoreUser for storing store specific variables
export async function setStoreUser(session: SessionProps) {
    const {
        access_token: accessToken,
        context,
        owner,
        sub,
        user: { id: userId },
    } = session;
    if (!userId) return null;

    const contextString = context ?? sub;
    const storeHash = contextString?.split('/')[1] || '';
    const key = `storeUser:${userId}_${storeHash}`; // users can belong to multiple stores
    const storeUser = await redis.get(key);

    // Set admin (store owner) if installing/ updating the app
    // https://developer.bigcommerce.com/api-docs/apps/guide/users
    if (accessToken) {
        // Create a new admin user if none exists
        if (!storeUser) {
            await redis.set(key, { storeHash, isAdmin: true });
        } else if (!(storeUser as any)?.isAdmin) {
            await redis.set(key, { storeHash, isAdmin: true });
        }
    } else {
        // Create a new user if it doesn't exist
        if (!storeUser) {
            await redis.set(key, { storeHash, isAdmin: owner.id === userId }); // isAdmin true if owner == user
        }
    }
}

export async function deleteUser({ context, user, sub }: SessionProps) {
    const contextString = context ?? sub;
    const storeHash = contextString?.split('/')[1] || '';
    const key = `storeUser:${user?.id}_${storeHash}`;

    await redis.del(key);
}

export async function hasStoreUser(storeHash: string, userId: string) {
    if (!storeHash || !userId) return false;

    const key = `storeUser:${userId}_${storeHash}`;
    const userDoc = await redis.get(key);

    return userDoc !== null;
}

export async function getStoreToken(storeHash: string) {
    if (!storeHash) return null;

    const key = `store:${storeHash}`;
    const storeData = await redis.get(key) as any;

    return storeData?.accessToken ?? null;
}

export async function deleteStore({ store_hash: storeHash }: SessionProps) {
    const key = `store:${storeHash}`;

    await redis.del(key);
}

// Default export for CommonJS compatibility
export default {
    setUser,
    setStore,
    setStoreUser,
    deleteUser,
    hasStoreUser,
    getStoreToken,
    deleteStore,
};
