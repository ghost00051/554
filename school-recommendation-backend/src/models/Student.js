const pool = require('../config/database');
const logger = require('../config/logger');

class Student {
    static async create(fullName, classId, academicYearId) {
        const query = `
      INSERT INTO students (full_name, class_id, academic_year_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
        const values = [fullName, classId, academicYearId];

        try {
            const result = await pool.query(query, values);
            logger.info(`Student created: ${fullName}`);
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating student:', error);
            throw error;
        }
    }

    static async findAll(filters = {}) {
        let query = `
      SELECT s.*, c.name as class_name, ay.year as academic_year
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
      WHERE 1=1
    `;
        const values = [];
        let valueCounter = 1;

        if (filters.academicYearId) {
            query += ` AND s.academic_year_id = $${valueCounter}`;
            values.push(filters.academicYearId);
            valueCounter++;
        }

        if (filters.classId) {
            query += ` AND s.class_id = $${valueCounter}`;
            values.push(filters.classId);
            valueCounter++;
        }

        if (filters.fullName) {
            query += ` AND s.full_name ILIKE $${valueCounter}`;
            values.push(`%${filters.fullName}%`);
            valueCounter++;
        }

        query += ' ORDER BY s.full_name';

        if (filters.limit) {
            query += ` LIMIT $${valueCounter}`;
            values.push(filters.limit);
            valueCounter++;
        }

        if (filters.offset) {
            query += ` OFFSET $${valueCounter}`;
            values.push(filters.offset);
        }

        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching students:', error);
            throw error;
        }
    }

    static async findById(id) {
        const query = `
      SELECT s.*, c.name as class_name, ay.year as academic_year
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
      WHERE s.id = $1
    `;

        try {
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error fetching student by id:', error);
            throw error;
        }
    }

    static async getWithGrades(studentId) {
        const query = `
      SELECT 
        s.*,
        c.name as class_name,
        json_agg(DISTINCT jsonb_build_object(
          'subject', sub.name,
          'grade', g.grade,
          'subject_id', sub.id
        )) FILTER (WHERE sub.id IS NOT NULL) as grades,
        json_agg(DISTINCT jsonb_build_object(
          'subject', rec_sub.name,
          'score', tr.score,
          'comment', tr.comment,
          'subject_id', rec_sub.id
        )) FILTER (WHERE rec_sub.id IS NOT NULL) as recommendations
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN grades g ON s.id = g.student_id
      LEFT JOIN subjects sub ON g.subject_id = sub.id
      LEFT JOIN teacher_recommendations tr ON s.id = tr.student_id
      LEFT JOIN subjects rec_sub ON tr.subject_id = rec_sub.id
      WHERE s.id = $1
      GROUP BY s.id, c.name
    `;

        try {
            const result = await pool.query(query, [studentId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error fetching student with grades:', error);
            throw error;
        }
    }

    static async createTables() {
        const query = `
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        class_id INTEGER REFERENCES classes(id),
        academic_year_id INTEGER REFERENCES academic_years(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        try {
            await pool.query(query);
            logger.info('Students table created/verified');
        } catch (error) {
            logger.error('Error creating students table:', error);
            throw error;
        }
    }
}

module.exports = Student;