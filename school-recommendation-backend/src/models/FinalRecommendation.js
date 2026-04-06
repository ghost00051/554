const pool = require('../config/database');
const logger = require('../config/logger');

class FinalRecommendation {
    static async create(studentId, recommendedClassId, totalScore, details = {}) {
        const query = `
      INSERT INTO final_recommendations (student_id, recommended_class_id, total_score, details)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
        const values = [studentId, recommendedClassId, totalScore, JSON.stringify(details)];

        try {
            const result = await pool.query(query, values);
            logger.info(`Final recommendation created for student ${studentId}`);
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating final recommendation:', error);
            throw error;
        }
    }

    static async findByStudent(studentId) {
        const query = `
      SELECT fr.*, c.name as recommended_class_name
      FROM final_recommendations fr
      LEFT JOIN classes c ON fr.recommended_class_id = c.id
      WHERE fr.student_id = $1
      ORDER BY fr.created_at DESC
      LIMIT 1
    `;

        try {
            const result = await pool.query(query, [studentId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error fetching final recommendation for student:', error);
            throw error;
        }
    }

    static async findByYear(academicYearId) {
        const query = `
      SELECT fr.*, s.full_name, c.name as recommended_class_name
      FROM final_recommendations fr
      JOIN students s ON fr.student_id = s.id
      LEFT JOIN classes c ON fr.recommended_class_id = c.id
      WHERE s.academic_year_id = $1
      ORDER BY fr.total_score DESC
    `;

        try {
            const result = await pool.query(query, [academicYearId]);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching recommendations by year:', error);
            throw error;
        }
    }

    static async deleteByStudent(studentId) {
        const query = 'DELETE FROM final_recommendations WHERE student_id = $1';

        try {
            await pool.query(query, [studentId]);
            logger.info(`Final recommendations deleted for student ${studentId}`);
        } catch (error) {
            logger.error('Error deleting final recommendation:', error);
            throw error;
        }
    }

    static async createTables() {
        const query = `
      CREATE TABLE IF NOT EXISTS final_recommendations (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        recommended_class_id INTEGER REFERENCES classes(id),
        total_score NUMERIC(5,2),
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        try {
            await pool.query(query);
            logger.info('Final recommendations table created/verified');
        } catch (error) {
            logger.error('Error creating final recommendations table:', error);
            throw error;
        }
    }
}

module.exports = FinalRecommendation;