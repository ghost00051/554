const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

console.log('=== ТЕСТ ПОДКЛЮЧЕНИЯ ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'school_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    connectionTimeoutMillis: 5000,
});

async function test() {
    try {
        console.log('\nПытаемся подключиться к PostgreSQL...');
        const client = await pool.connect();
        console.log('✅ Подключение успешно!');

        const result = await client.query('SELECT NOW()');
        console.log('Текущее время в БД:', result.rows[0].now);

        client.release();
    } catch (error) {
        console.error('❌ Ошибка подключения:', error.message);
        console.log('\nВозможные решения:');
        console.log('1. Запустите контейнеры: docker-compose up -d postgres redis');
        console.log('2. Проверьте, что PostgreSQL работает: docker ps');
        console.log('3. Проверьте .env файл');
    } finally {
        await pool.end();
    }
}

test();