import { Db } from '../types'

const { DB_TYPE } = process.env;

let db: Db;

switch (DB_TYPE) {
    case 'firebase':
        db = require('./dbs/firebase');
        break;
    case 'mysql':
        db = require('./dbs/mysql');
        break;
    case 'vercel-kv':
        db = require('./dbs/vercel-kv');
        break;
    default:
        db = require('./dbs/firebase');
        break;
}

export default db;
