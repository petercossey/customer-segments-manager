import { Db } from '../types'

const { DB_TYPE } = process.env;

let db: Db;

switch (DB_TYPE) {
    case 'firebase':
        db = require('./dbs/firebase').default;
        break;
    case 'mysql':
        db = require('./dbs/mysql').default;
        break;
    case 'vercel-kv':
        db = require('./dbs/vercel-kv').default;
        break;
    default:
        db = require('./dbs/firebase').default;
        break;
}

export default db;
