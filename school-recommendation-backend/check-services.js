const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function checkServices() {
    console.log('=== Проверка сервисов ===\n');

    console.log('1. Проверка PostgreSQL (Docker)...');
    const pgPool = new Pool({
        host: 'localhost',
        port: 5433,
        database: 'school_db',
        user: 'postgres',
        password: 'postgres',
        connectionTimeoutMillis: 5000,
    });

    try {
        const client = await pgPool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as version');
        console.log('✓ PostgreSQL подключен успешно');
        console.log(`  Время: ${result.rows[0].current_time}`);
        console.log(`  Версия: ${result.rows[0].version.split(',')[0]}`);
        client.release();
    } catch (error) {
        console.error('✗ Ошибка подключения к PostgreSQL:', error.message);
        console.log('\n  Решение:');
        console.log('  Запустите контейнеры: docker-compose up -d');
        console.log('  Или проверьте, что PostgreSQL работает: docker ps');
    }
    await pgPool.end();

    console.log('\n2. Проверка Redis...');
    const net = require('net');
    const redisCheck = new Promise((resolve) => {
        const client = new net.Socket();
        const timeout = setTimeout(() => {
            client.destroy();
            resolve(false);
        }, 3000);

        client.connect(6379, 'localhost', () => {
            clearTimeout(timeout);
            client.write('PING\r\n');
        });

        client.on('data', (data) => {
            if (data.toString().includes('PONG')) {
                resolve(true);
            } else {
                resolve(false);
            }
            client.destroy();
        });

        client.on('error', () => {
            clearTimeout(timeout);
            resolve(false);
        });
    });

    const redisRunning = await redisCheck;
    if (redisRunning) {
        console.log('✓ Redis сервер запущен и отвечает на порту 6379');
    } else {
        console.log('✗ Redis сервер не запущен');
        console.log('\n  Решение:');
        console.log('  Запустите контейнеры: docker-compose up -d');
        console.log('  Или проверьте, что Redis работает: docker ps');
    }

    console.log('\n3. Проверка бэкенда...');
    const http = require('http');
    const backendCheck = new Promise((resolve) => {
        const req = http.get('http://localhost:3000/api/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.status === 'OK') {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } catch (e) {
                    resolve(false);
                }
            });
        });
        req.on('error', () => resolve(false));
        req.setTimeout(3000, () => resolve(false));
    });

    if (await backendCheck) {
        console.log('✓ Бэкенд работает на порту 3000');
    } else {
        console.log('✗ Бэкенд не отвечает');
        console.log('  Решение: docker-compose up -d');
    }

    console.log('\n4. Проверка конфигурации...');
    const fs = require('fs');
    if (fs.existsSync('.env')) {
        console.log('✓ Файл .env существует');
        const envContent = fs.readFileSync('.env', 'utf8');
        const hasDbConfig = envContent.includes('DB_HOST');
        const hasRedisConfig = envContent.includes('REDIS_HOST');
        if (hasDbConfig && hasRedisConfig) {
            console.log('✓ Конфигурация базы данных и Redis найдена');
        }
    } else {
        console.log('⚠ Файл .env не найден');
    }

    console.log('\n5. Проверка Docker контейнеров...');
    const { exec } = require('child_process');
    exec('docker ps --format "table {{.Names}}\t{{.Status}}"', (error, stdout) => {
        if (error) {
            console.log('✗ Не удалось проверить Docker контейнеры');
        } else {
            console.log('Запущенные контейнеры:');
            console.log(stdout);
        }
    });

    console.log('\n=== Проверка завершена ===');
    console.log('\nДля запуска всех сервисов выполните:');
    console.log('  docker-compose up -d --build');
}

checkServices().catch(console.error);