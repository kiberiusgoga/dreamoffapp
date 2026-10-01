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
  text?: string;
  model?: string;
  layout?: string;
  language?: string;
  transcription?: string;
  interpretation?: object | string;
  imageUrl?: string;
}
interface DreamCreationAttributes extends Optional<DreamAttributes, 'id' | 'date' | 'lucid' | 'themes' | 'chatHistory'> {}

class Dream extends Model<DreamAttributes, DreamCreationAttributes> implements DreamAttributes {
  declare id: string;
  declare date: Date;
  declare title: string;
  declare content: string;
  declare lucid: boolean;
  declare mood: string;
  declare themes: any[];
  declare chatHistory: any[];
  declare userId: string;
}

Dream.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    title: { type: DataTypes.STRING, allowNull: true },
    content: { type: DataTypes.TEXT, allowNull: true },
    lucid: { type: DataTypes.BOOLEAN, defaultValue: false },
    mood: { type: DataTypes.STRING, allowNull: true },
    themes: { type: DataTypes.JSON, defaultValue: [] },
    chatHistory: { type: DataTypes.JSON, defaultValue: [] },
    text: { type: DataTypes.TEXT, allowNull: true },
    model: { type: DataTypes.STRING, allowNull: true },
    layout: { type: DataTypes.STRING, allowNull: true },
    language: { type: DataTypes.STRING, allowNull: true },
    transcription: { type: DataTypes.TEXT, allowNull: true },
    interpretation: { type: DataTypes.JSON, allowNull: true },
    imageUrl: { type: DataTypes.TEXT, allowNull: true }
}, { sequelize, modelName: 'Dream', timestamps: true });

export default Dream;
