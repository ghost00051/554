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

    static async findByStudentAndSubject(studentId, subjectId) {
        const query = `
        SELECT tr.*, s.name as subject_name, st.full_name as student_name
        FROM teacher_recommendations tr
        JOIN subjects s ON tr.subject_id = s.id
        JOIN students st ON tr.student_id = st.id
        WHERE tr.student_id = $1 AND tr.subject_id = $2
        ORDER BY tr.created_at DESC
    `;

        try {
            const result = await pool.query(query, [studentId, subjectId]);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching recommendations by student and subject:', error);
            throw error;
        }
    }

    static async update(id, score, comment) {
        const query = `
        UPDATE teacher_recommendations 
        SET score = $1, comment = $2 
        WHERE id = $3 
        RETURNING *
    `;

        try {
            const result = await pool.query(query, [score, comment, id]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error updating recommendation:', error);
            throw error;
        }
    }

    static async delete(id) {
        const query = 'DELETE FROM teacher_recommendations WHERE id = $1 RETURNING *';

        try {
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error deleting recommendation:', error);
            throw error;
        }
    }
}

module.exports = TeacherRecommendation;