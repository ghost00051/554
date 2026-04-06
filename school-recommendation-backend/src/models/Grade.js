const pool = require('../config/database');
const logger = require('../config/logger');

class Grade {
    static async create(studentId, subjectId, grade) {
        const query = `
      INSERT INTO grades (student_id, subject_id, grade)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
        const values = [studentId, subjectId, grade];

        try {
            const result = await pool.query(query, values);
            logger.info(`Grade created for student ${studentId}, subject ${subjectId}`);
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating grade:', error);
            throw error;
        }
    }

    static async findByStudent(studentId) {
        const query = `
      SELECT g.*, s.name as subject_name
      FROM grades g
      JOIN subjects s ON g.subject_id = s.id
      WHERE g.student_id = $1
    `;

        try {
            const result = await pool.query(query, [studentId]);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching grades for student:', error);
            throw error;
        }
    }

    static async createTables() {
        const query = `
      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id),
        grade NUMERIC(3,1) CHECK (grade >= 1 AND grade <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        try {
            await pool.query(query);
            logger.info('Grades table created/verified');
        } catch (error) {
            logger.error('Error creating grades table:', error);
            throw error;
        }
    }
}

module.exports = Grade;