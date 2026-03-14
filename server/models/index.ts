import sequelize from './db.js';
import User from './User.js';
import Dream from './Dream.js';

// Define associations
User.hasMany(Dream, { foreignKey: 'userId', as: 'dreams' });
Dream.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export async function syncDB() {
    await sequelize.sync({ alter: true });
    console.log('[DreamOff] SQLite models synchronized');
}

export { sequelize, User, Dream };
