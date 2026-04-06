const express = require('express');
const router = express.Router();
const RecommendationController = require('../controllers/recommendationController');
const validate = require('../middleware/validation');
const authMiddleware = require('../middleware/auth');

router.get('/student/:studentId', RecommendationController.getRecommendation);
router.post('/student/:studentId/calculate', authMiddleware, validate('calculateRecommendation'), RecommendationController.calculateForStudent);
router.post('/calculate-all', authMiddleware, validate('calculateRecommendation'), RecommendationController.calculateForAll);
router.get('/year/:academicYearId', RecommendationController.getRecommendationsByYear);

module.exports = router;