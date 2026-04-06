const { Pool } = require('pg');
const dotenv = require('dotenv');
const logger = require('./logger');

if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'school_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

async function testConnection() {
    try {
        const client = await pool.connect();
        logger.info(`Connected to PostgreSQL database at ${process.env.DB_HOST}:${process.env.DB_PORT}`);
        client.release();
        return true;
    } catch (error) {
        logger.error('Failed to connect to PostgreSQL:', error.message);
        logger.info('Please check your database configuration in .env or .env.local');
        return false;
    }
}

testConnection();

module.exports = pool;