const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');
const Admin = require('./models/Admin');

const app = express();

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100000,
    message: 'Too many requests from this IP',
    skip: (req) => req.method === 'OPTIONS'
});

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(limiter);

app.use('/api', routes);

app.use(errorHandler);

async function initAdmin() {
    try {
        await Admin.createTable();
        logger.info('✅ Admin settings initialized');
    } catch (error) {
        logger.error('❌ Error initializing admin:', error);
    }
}

const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'school_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '685974',
});

async function fixTable() {
    try {
        await pool.query(`
            ALTER TABLE teacher_recommendations 
            ALTER COLUMN score TYPE NUMERIC(4,2)
        `);
        console.log('✅ Таблица teacher_recommendations исправлена');
    } catch (error) {
        if (error.message.includes('does not exist')) {
            console.log('⏳ Таблица teacher_recommendations еще не создана');
        } else {
            console.log('ℹ️ Таблица teacher_recommendations уже имеет правильный тип');
        }
    } finally {
        await pool.end();
    }
}

setTimeout(() => {
    fixTable();
}, 3000);

initAdmin();

module.exports = app;