const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'school_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '685974',
});

async function initDatabase() {
    console.log('🚀 Создание таблиц...');
    console.log(`📊 Подключение к ${process.env.DB_HOST || 'postgres'}:${process.env.DB_PORT || 5432}`);

    const client = await pool.connect();

    try {
        await client.query('SELECT 1');
        console.log('✅ Подключение к PostgreSQL успешно!\n');

        console.log('📋 Создание таблиц:');

        await client.query(`
            CREATE TABLE IF NOT EXISTS academic_years (
                id SERIAL PRIMARY KEY,
                year VARCHAR(9) NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✓ academic_years');

        await client.query(`
            CREATE TABLE IF NOT EXISTS classes (
                id SERIAL PRIMARY KEY,
                name VARCHAR(10) NOT NULL,
                academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(name, academic_year_id)
            )
        `);
        console.log('  ✓ classes');

        await client.query(`
            CREATE TABLE IF NOT EXISTS subjects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✓ subjects');

        await client.query(`
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                class_id INTEGER REFERENCES classes(id),
                academic_year_id INTEGER REFERENCES academic_years(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✓ students');

        await client.query(`
            CREATE TABLE IF NOT EXISTS grades (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                subject_id INTEGER REFERENCES subjects(id),
                grade NUMERIC(3,1) CHECK (grade >= 1 AND grade <= 5),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✓ grades');

        await client.query(`
            CREATE TABLE IF NOT EXISTS teacher_recommendations (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                subject_id INTEGER REFERENCES subjects(id),
                score NUMERIC(4,2) CHECK (score >= 0 AND score <= 10),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✓ teacher_recommendations');

        await client.query(`
            CREATE TABLE IF NOT EXISTS final_recommendations (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                recommended_class_id INTEGER REFERENCES classes(id),
                total_score NUMERIC(5,2),
                details JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✓ final_recommendations');

        console.log('\n✅ Все таблицы созданы!');

        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        console.log('\n📊 Созданные таблицы:');
        tables.rows.forEach(t => {
            console.log(`  - ${t.table_name}`);
        });

    } catch (error) {
        console.error('\n❌ ОШИБКА:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

initDatabase().catch(console.error);