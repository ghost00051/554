const pool = require('../config/database');
const logger = require('../config/logger');

class AcademicYear {
    static async create(year) {
        const query = `
            INSERT INTO academic_years (year, is_active)
            VALUES ($1, $2)
            RETURNING *
        `;
        const values = [year, false];

        try {
            const result = await pool.query(query, values);
            logger.info(`Academic year created: ${year}`);
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating academic year:', error);
            throw error;
        }
    }

    static async findAll() {
        const query = 'SELECT * FROM academic_years ORDER BY year DESC';

        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching academic years:', error);
            throw error;
        }
    }

    static async findActive() {
        const query = 'SELECT * FROM academic_years WHERE is_active = true LIMIT 1';

        try {
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            logger.error('Error fetching active academic year:', error);
            throw error;
        }
    }

    static async findByYear(year) {
        const query = 'SELECT * FROM academic_years WHERE year = $1';

        try {
            const result = await pool.query(query, [year]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error finding academic year by year:', error);
            throw error;
        }
    }

    static async findById(id) {
        const query = 'SELECT * FROM academic_years WHERE id = $1';

        try {
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error finding academic year by id:', error);
            throw error;
        }
    }

    static async setActive(id) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            await client.query('UPDATE academic_years SET is_active = false');

            const query = 'UPDATE academic_years SET is_active = true WHERE id = $1 RETURNING *';
            const result = await client.query(query, [id]);

            await client.query('COMMIT');
            logger.info(`Academic year ${id} set as active`);
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error setting active academic year:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    static async delete(id) {
        const client = await pool.connect();

        try {
            const year = await this.findById(id);
            if (!year) {
                throw new Error('Academic year not found');
            }

            console.log(`🗑️ Удаление года: ${year.year}`);

            await client.query('BEGIN');

            await client.query(`
                DELETE FROM teacher_recommendations 
                WHERE student_id IN (SELECT id FROM students WHERE academic_year_id = $1)
            `, [id]);

            await client.query(`
                DELETE FROM grades 
                WHERE student_id IN (SELECT id FROM students WHERE academic_year_id = $1)
            `, [id]);

            await client.query('DELETE FROM students WHERE academic_year_id = $1', [id]);
            await client.query('DELETE FROM classes WHERE academic_year_id = $1', [id]);

            // Активируем другой год, если этот был активным
            if (year.is_active) {
                const otherYear = await client.query(
                    'SELECT id FROM academic_years WHERE id != $1 ORDER BY year DESC LIMIT 1', [id]
                );

                if (otherYear.rows.length > 0) {
                    await client.query(
                        'UPDATE academic_years SET is_active = true WHERE id = $1', [otherYear.rows[0].id]
                    );
                    console.log(`  ✓ Активирован год ID: ${otherYear.rows[0].id}`);
                }
            }

            const result = await client.query(
                'DELETE FROM academic_years WHERE id = $1 RETURNING *', [id]
            );

            await client.query('COMMIT');
            console.log(`  ✓ Год успешно удален`);
            logger.info(`Academic year ${id} deleted with all related data`);
            return result.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error deleting academic year:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    static async createTables() {
        const query = `
            CREATE TABLE IF NOT EXISTS academic_years (
                id SERIAL PRIMARY KEY,
                year VARCHAR(9) NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        try {
            await pool.query(query);
            logger.info('Academic years table created/verified');
        } catch (error) {
            logger.error('Error creating academic years table:', error);
            throw error;
        }
    }
}

module.exports = AcademicYear;