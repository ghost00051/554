const pool = require('../config/database');
const logger = require('../config/logger');

class Subject {
    static async create(name) {
        const query = 'INSERT INTO subjects (name) VALUES ($1) RETURNING *';
        const values = [name];

        try {
            const result = await pool.query(query, values);
            logger.info(`Subject created: ${name}`);
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating subject:', error);
            throw error;
        }
    }

    static async findAll() {
        const query = 'SELECT * FROM subjects ORDER BY name';

        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching subjects:', error);
            throw error;
        }
    }

    static async findById(id) {
        const query = 'SELECT * FROM subjects WHERE id = $1';

        try {
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error finding subject by id:', error);
            throw error;
        }
    }

    static async findByName(name) {
        const query = 'SELECT * FROM subjects WHERE name = $1';

        try {
            const result = await pool.query(query, [name]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error finding subject by name:', error);
            throw error;
        }
    }

    static async update(id, name) {
        const query = 'UPDATE subjects SET name = $1 WHERE id = $2 RETURNING *';
        const values = [name, id];

        try {
            const result = await pool.query(query, values);
            if (result.rows.length > 0) {
                logger.info(`Subject updated: ${name}`);
            }
            return result.rows[0];
        } catch (error) {
            logger.error('Error updating subject:', error);
            throw error;
        }
    }

    static async delete(id) {
        const query = 'DELETE FROM subjects WHERE id = $1 RETURNING *';

        try {
            const result = await pool.query(query, [id]);
            if (result.rows.length > 0) {
                logger.info(`Subject deleted: ${result.rows[0].name}`);
            }
            return result.rows[0];
        } catch (error) {
            logger.error('Error deleting subject:', error);
            throw error;
        }
    }

    static async createTables() {
        const query = `
            CREATE TABLE IF NOT EXISTS subjects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        try {
            await pool.query(query);
            logger.info('Subjects table created/verified');
        } catch (error) {
            logger.error('Error creating subjects table:', error);
            throw error;
        }
    }
}

module.exports = Subject;