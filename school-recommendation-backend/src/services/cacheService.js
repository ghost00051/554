const redisClient = require('../config/redis');
const logger = require('../config/logger');

class CacheService {
    static async get(key) {
        try {
            const data = await redisClient.get(key);
            if (data) {
                logger.debug(`Cache hit for key: ${key}`);
                return JSON.parse(data);
            }
            logger.debug(`Cache miss for key: ${key}`);
            return null;
        } catch (error) {
            logger.error('Redis get error:', error);
            return null;
        }
    }

    static async set(key, value, ttlSeconds = 3600) {
        try {
            const serialized = JSON.stringify(value);
            await redisClient.setEx(key, ttlSeconds, serialized);
            logger.debug(`Cache set for key: ${key} with TTL: ${ttlSeconds}s`);
        } catch (error) {
            logger.error('Redis set error:', error);
        }
    }

    static async del(key) {
        try {
            await redisClient.del(key);
            logger.debug(`Cache deleted for key: ${key}`);
        } catch (error) {
            logger.error('Redis del error:', error);
        }
    }

    static async delPattern(pattern) {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.debug(`Cache deleted for pattern: ${pattern}, ${keys.length} keys`);
            }
        } catch (error) {
            logger.error('Redis delPattern error:', error);
        }
    }
}

module.exports = CacheService;