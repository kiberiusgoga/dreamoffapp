// Database layer — lowdb JSON file storage
// Users are stored in server/db.json with hashed passwords

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSONFilePreset } from 'lowdb/node';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'db.json');

const defaultData = { users: [] };

let db;

export async function initDB() {
    db = await JSONFilePreset(DB_PATH, defaultData);
    return db;
}

export function getDB() {
    if (!db) throw new Error('Database not initialized. Call initDB() first.');
    return db;
}
