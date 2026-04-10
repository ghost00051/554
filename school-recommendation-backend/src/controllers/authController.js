const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const logger = require('../config/logger');

class AuthController {
    static async login(req, res, next) {
        try {
            const { password } = req.body;
            
            if (!password) {
                return res.status(400).json({
                    success: false,
                    error: 'Password is required'
                });
            }
            
            const isValid = await Admin.verifyPassword(password);
            
            if (!isValid) {
                logger.warn(`Failed login attempt from ${req.ip}`);
                return res.status(401).json({
                    success: false,
                    error: 'Invalid password'
                });
            }
            
            const token = jwt.sign(
                { 
                    role: 'admin', 
                    timestamp: Date.now(),
                    ip: req.ip 
                },
                process.env.JWT_SECRET || 'secret_key',
                { expiresIn: '24h' }
            );
            
            logger.info(`Admin logged in from ${req.ip}`);
            
            res.json({
                success: true,
                data: {
                    token,
                    expiresIn: 86400
                }
            });
        } catch (error) {
            logger.error('Error in login:', error);
            next(error);
        }
    }
    
    static async changePassword(req, res, next) {
        try {
            const { oldPassword, newPassword } = req.body;
            
            if (!oldPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Old and new passwords are required'
                });
            }
            
            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'New password must be at least 6 characters'
                });
            }
            
            const isValid = await Admin.verifyPassword(oldPassword);
            
            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid old password'
                });
            }
            
            await Admin.updatePassword(newPassword);
            
            logger.info('Admin password changed');
            
            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            logger.error('Error in changePassword:', error);
            next(error);
        }
    }
    
    static async checkAuth(req, res, next) {
        try {
            res.json({
                success: true,
                data: {
                    authenticated: true,
                    role: 'admin'
                }
            });
        } catch (error) {
            logger.error('Error in checkAuth:', error);
            next(error);
        }
    }
    
    static async resetPassword(req, res, next) {
        try {
            const { resetToken, newPassword } = req.body;
            
            res.status(501).json({
                success: false,
                error: 'Reset password functionality not implemented yet'
            });
        } catch (error) {
            logger.error('Error in resetPassword:', error);
            next(error);
        }
    }
}

module.exports = AuthController;