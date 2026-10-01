import { Sequelize } from 'sequelize';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || join(__dirname, '..', '..', 'database.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

export async function initDB() {
    try {
        await sequelize.authenticate();
        console.log(`[DreamOff] SQLite connected successfully`);
        // Note: we will call sync after importing all models
    } catch (err) {
        console.error(`[DreamOff] SQLite connection error:`, err);
        process.exit(1);
    }
}

export default sequelize;
