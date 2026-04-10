const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/login', AuthController.login);
router.post('/reset-password', AuthController.resetPassword);
router.post('/change-password', authMiddleware, AuthController.changePassword);
router.get('/check', authMiddleware, AuthController.checkAuth);

module.exports = router;