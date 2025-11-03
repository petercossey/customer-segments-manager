import { Db } from '../types'
import * as firebaseDb from './dbs/firebase';
import * as mysqlDb from './dbs/mysql';
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
    case 'vercel-kv':
        db = vercelKvDb.default;
        break;
    default:
        // Default to vercel-kv if DB_TYPE is not set (common for Vercel deployments)
        db = vercelKvDb.default;
        break;
}

if (!db) {
    throw new Error(`Failed to load database module. DB_TYPE=${DB_TYPE}`);
}

export default db;
