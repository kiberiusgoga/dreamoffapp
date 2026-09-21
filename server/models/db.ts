import { Sequelize } from 'sequelize';
import { logger } from '../logger.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Defaults to the project root; DATABASE_PATH lets tests point at a scratch file.
const dbPath = process.env.DATABASE_PATH || join(__dirname, '..', '..', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

export async function initDB() {
    try {
        await sequelize.authenticate();
        logger.info('database connected', { dialect: 'sqlite', path: dbPath });
        // Note: we will call sync after importing all models
    } catch (err) {
        logger.error('database connection failed', { err, path: dbPath });
        process.exit(1);
    }
}

export { dbPath };
export default sequelize;
