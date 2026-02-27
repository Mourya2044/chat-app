import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import pool from './database.js';

const __dirname = join(fileURLToPath(import.meta.url), '..');

const initializeDatabase = async () => {
  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('[OK] Database schema initialized successfully');
  } catch (error) {
    console.error('[ERROR] Database initialization error:', error.message);
    throw error;
  }
};

export default initializeDatabase;
