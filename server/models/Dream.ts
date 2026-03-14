import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './db.js';

interface DreamAttributes {
  id: string;
  date: Date;
  title: string;
  content: string;
  lucid: boolean;
  mood: string;
  themes: any[];
  chatHistory: any[];
  userId?: string;
}
interface DreamCreationAttributes extends Optional<DreamAttributes, 'id' | 'date' | 'lucid' | 'themes' | 'chatHistory'> {}

class Dream extends Model<DreamAttributes, DreamCreationAttributes> implements DreamAttributes {
  public id!: string;
  public date!: Date;
  public title!: string;
  public content!: string;
  public lucid!: boolean;
  public mood!: string;
  public themes!: any[];
  public chatHistory!: any[];
  public userId!: string;
}

Dream.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    title: { type: DataTypes.STRING, allowNull: true },
    content: { type: DataTypes.TEXT, allowNull: true },
    lucid: { type: DataTypes.BOOLEAN, defaultValue: false },
    mood: { type: DataTypes.STRING, allowNull: true },
    themes: { type: DataTypes.JSON, defaultValue: [] },
    chatHistory: { type: DataTypes.JSON, defaultValue: [] }
}, { sequelize, modelName: 'Dream', timestamps: true });

export default Dream;
