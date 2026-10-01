import sequelize from './db.js';
import User from './User.js';
import Dream from './Dream.js';

// Define associations
User.hasMany(Dream, { foreignKey: 'userId', as: 'dreams' });
Dream.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export async function syncDB() {
    await sequelize.sync();

    // Add missing dream fields without rebuilding SQLite tables on each boot.
    // Rebuilding the Users table can clear the dreams' userId foreign keys.
    const queryInterface = sequelize.getQueryInterface();
    const table = Dream.getTableName();
    const columns = await queryInterface.describeTable(table);
    const attributes = Dream.getAttributes();
    for (const field of ['text', 'model', 'layout', 'language', 'transcription', 'interpretation', 'imageUrl']) {
        if (!columns[field]) {
            await queryInterface.addColumn(table, field, attributes[field]);
        }
    }
    console.log('[DreamOff] SQLite models synchronized');
}

export { sequelize, User, Dream };
