const pool = require('../config/database');
const logger = require('../config/logger');

class Class {
    static async create(name, academicYearId) {
        const query = `
      INSERT INTO classes (name, academic_year_id)
      VALUES ($1, $2)
      RETURNING *
    `;
        const values = [name, academicYearId];

        try {
            const result = await pool.query(query, values);
            logger.info(`Class created: ${name} for year ${academicYearId}`);
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating class:', error);
            throw error;
        }
    }

    static async findAll(academicYearId = null) {
        let query = 'SELECT * FROM classes';
        const values = [];

        if (academicYearId) {
            query += ' WHERE academic_year_id = $1';
            values.push(academicYearId);
        }

        query += ' ORDER BY name';

        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching classes:', error);
            throw error;
        }
    }

    static async findById(id) {
        const query = 'SELECT * FROM classes WHERE id = $1';

        try {
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error fetching class by id:', error);
            throw error;
        }
    }

    static async createTables() {
        const query = `
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(10) NOT NULL,
        academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, academic_year_id)
      )
    `;

        try {
            await pool.query(query);
            logger.info('Classes table created/verified');
        } catch (error) {
            logger.error('Error creating classes table:', error);
            throw error;
        }
    }
}

module.exports = Class;