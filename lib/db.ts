import { Db } from '../types'
import * as firebaseDb from './dbs/firebase';
import * as mysqlDb from './dbs/mysql';
import * as upstashDb from './dbs/upstash';
import * as vercelKvDb from './dbs/vercel-kv';

const { DB_TYPE } = process.env;

let db: Db;

switch (DB_TYPE) {
    case 'firebase':
        db = firebaseDb.default;
        break;
    case 'mysql':
        db = mysqlDb.default;
        break;
    case 'upstash':
        db = upstashDb.default;
        break;
    case 'vercel-kv':
        // Deprecated: Use 'upstash' instead
        db = vercelKvDb.default;
        break;
    default:
        // Default to upstash (recommended for Vercel deployments)
        // Note: Vercel KV was deprecated in June 2025, use Upstash directly
        db = upstashDb.default;
        break;
}

if (!db) {
    throw new Error(`Failed to load database module. DB_TYPE=${DB_TYPE}`);
}

export default db;
