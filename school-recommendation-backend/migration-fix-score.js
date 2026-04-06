const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'school_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function fixScoreColumn() {
    const client = await pool.connect();

    try {
        console.log('Проверка структуры таблицы teacher_recommendations...');

        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'teacher_recommendations'
            );
        `);

        if (tableExists.rows[0].exists) {
            const columnInfo = await client.query(`
                SELECT data_type, numeric_precision, numeric_scale
                FROM information_schema.columns 
                WHERE table_name = 'teacher_recommendations' 
                AND column_name = 'score';
            `);

            console.log('Текущий тип поля score:', columnInfo.rows[0]);

            if (columnInfo.rows[0].data_type === 'integer') {
                console.log('Изменяем тип поля score с INTEGER на NUMERIC(4,2)...');

                await client.query(`
                    ALTER TABLE teacher_recommendations 
                    ADD COLUMN score_temp NUMERIC(4,2);
                `);

                await client.query(`
                    UPDATE teacher_recommendations 
                    SET score_temp = score::NUMERIC(4,2);
                `);

                await client.query(`
                    ALTER TABLE teacher_recommendations 
                    DROP COLUMN score;
                `);

                await client.query(`
                    ALTER TABLE teacher_recommendations 
                    RENAME COLUMN score_temp TO score;
                `);

                console.log('✓ Тип поля score успешно изменен на NUMERIC(4,2)');
            } else {
                console.log('✓ Поле score уже имеет правильный тип:', columnInfo.rows[0].data_type);
            }
        } else {
            console.log('Таблица teacher_recommendations не существует, нужно создать заново');

            await client.query(`
                CREATE TABLE teacher_recommendations (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                    subject_id INTEGER REFERENCES subjects(id),
                    score NUMERIC(4,2) CHECK (score >= 0 AND score <= 10),
                    comment TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✓ Таблица teacher_recommendations создана с правильным типом');
        }

        console.log('\n✅ Миграция завершена успешно!');

    } catch (error) {
        console.error('❌ Ошибка при миграции:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixScoreColumn();