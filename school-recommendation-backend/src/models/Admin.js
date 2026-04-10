const pool = require('../config/database');
const bcrypt = require('bcrypt');
const logger = require('../config/logger');

class Admin {
    static async getSettings() {
        const query = 'SELECT * FROM admin_settings LIMIT 1';
        
        try {
            const result = await pool.query(query);
            if (result.rows.length === 0) {
                const defaultPassword = 'admin123';
                const hashedPassword = await bcrypt.hash(defaultPassword, 10);
                await pool.query(
                    'INSERT INTO admin_settings (password_hash, created_at) VALUES ($1, NOW())',
                    [hashedPassword]
                );
                logger.info(`Default admin password created: ${defaultPassword}`);
                return { password_hash: hashedPassword };
            }
            return result.rows[0];
        } catch (error) {
            logger.error('Error getting admin settings:', error);
            throw error;
        }
    }
    
    static async verifyPassword(password) {
        const settings = await this.getSettings();
        return await bcrypt.compare(password, settings.password_hash);
    }
    
    static async updatePassword(newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const query = 'UPDATE admin_settings SET password_hash = $1, updated_at = NOW()';
        
        try {
            await pool.query(query, [hashedPassword]);
            logger.info('Admin password updated');
            return true;
        } catch (error) {
            logger.error('Error updating admin password:', error);
            throw error;
        }
    }
    
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS admin_settings (
                id SERIAL PRIMARY KEY,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        try {
            await pool.query(query);
            logger.info('Admin settings table created/verified');
        } catch (error) {
            logger.error('Error creating admin settings table:', error);
            throw error;
        }
    }
}

module.exports = Admin;