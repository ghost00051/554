const pool = require('../config/database');
const logger = require('../config/logger');

class TeacherRecommendation {
    static async create(studentId, subjectId, score, comment = null) {
        const query = `
            INSERT INTO teacher_recommendations (student_id, subject_id, score, comment)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const values = [studentId, subjectId, score, comment];

        try {
            const result = await pool.query(query, values);
            logger.info(`Recommendation created for student ${studentId}, subject ${subjectId}`);
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating teacher recommendation:', error);
            throw error;
        }
    }

    static async findByStudent(studentId) {
        const query = `
            SELECT tr.*, s.name as subject_name
            FROM teacher_recommendations tr
            JOIN subjects s ON tr.subject_id = s.id
            WHERE tr.student_id = $1
        `;

        try {
            const result = await pool.query(query, [studentId]);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching recommendations for student:', error);
            throw error;
        }
    }

    static async createTables() {
        const query = `
            CREATE TABLE IF NOT EXISTS teacher_recommendations (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                subject_id INTEGER REFERENCES subjects(id),
                score NUMERIC(4,2) CHECK (score >= 0 AND score <= 10),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        try {
            await pool.query(query);
            logger.info('Teacher recommendations table created/verified');
        } catch (error) {
            logger.error('Error creating teacher recommendations table:', error);
            throw error;
        }
    }
}

module.exports = TeacherRecommendation;