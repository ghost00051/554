const redis = require('redis');
const dotenv = require('dotenv');
const logger = require('./logger');

if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

let redisClient = null;
let isRedisAvailable = false;

const fallbackCache = new Map();

async function createRedisClient() {
    const client = redis.createClient({
        socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            connectTimeout: 5000,
        },
        password: process.env.REDIS_PASSWORD || undefined,
    });

    client.on('error', (err) => {
        logger.warn('Redis Client Error:', err.message);
        isRedisAvailable = false;
    });

    client.on('connect', () => {
        logger.info('Connected to Redis');
        isRedisAvailable = true;
    });

    client.on('end', () => {
        logger.info('Redis connection closed');
        isRedisAvailable = false;
    });

    try {
        await client.connect();
        return client;
    } catch (error) {
        logger.warn('Failed to connect to Redis, using in-memory fallback:', error.message);
        return null;
    }
}

createRedisClient().then(client => {
    redisClient = client;
});

class RedisService {
    static async get(key) {
        if (redisClient && isRedisAvailable) {
            try {
                const data = await redisClient.get(key);
                return data ? JSON.parse(data) : null;
            } catch (error) {
                logger.error('Redis get error:', error);
                return fallbackCache.get(key) || null;
            }
        }
        return fallbackCache.get(key) || null;
    }

    static async set(key, value, ttlSeconds = 3600) {
        const serialized = JSON.stringify(value);

        if (redisClient && isRedisAvailable) {
            try {
                await redisClient.setEx(key, ttlSeconds, serialized);
                return true;
            } catch (error) {
                logger.error('Redis set error:', error);
            }
        }

        fallbackCache.set(key, serialized);
        setTimeout(() => {
            fallbackCache.delete(key);
        }, ttlSeconds * 1000);
        return true;
    }

    static async del(key) {
        if (redisClient && isRedisAvailable) {
            try {
                await redisClient.del(key);
            } catch (error) {
                logger.error('Redis del error:', error);
            }
        }
        fallbackCache.delete(key);
    }

    static async delPattern(pattern) {
        if (redisClient && isRedisAvailable) {
            try {
                const keys = await redisClient.keys(pattern);
                if (keys.length > 0) {
                    await redisClient.del(keys);
                }
            } catch (error) {
                logger.error('Redis delPattern error:', error);
            }
        }

        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        for (const key of fallbackCache.keys()) {
            if (regex.test(key)) {
                fallbackCache.delete(key);
            }
        }
    }

    static async health() {
        if (redisClient && isRedisAvailable) {
            try {
                await redisClient.ping();
                return true;
            } catch (error) {
                return false;
            }
        }
        return false;
    }
}

module.exports = RedisService;