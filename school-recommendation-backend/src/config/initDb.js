const Migrations = require('./migrations');
const logger = require('./logger');

async function initDatabase() {
    try {
        logger.info('🚀 Запуск инициализации базы данных...');
        await Migrations.runMigrations();
        logger.info('✅ Инициализация базы данных завершена');
    } catch (error) {
        logger.error('❌ Ошибка инициализации базы данных:', error);
        throw error;
    }
}

module.exports = initDatabase;