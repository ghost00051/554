const express = require('express');
const router = express.Router();
const RecommendationController = require('../controllers/recommendationController');
const authMiddleware = require('../middleware/auth');

router.get('/student/:studentId', RecommendationController.getRecommendation);
router.post('/student/:studentId/calculate', RecommendationController.calculateForStudent);
router.post('/calculate-all', RecommendationController.calculateForAll);
router.get('/year/:academicYearId', RecommendationController.getRecommendationsByYear);

router.get('/teacher/student/:studentId', RecommendationController.getTeacherRecommendations);
router.get('/teacher/student/:studentId/subject/:subjectId', RecommendationController.getTeacherRecommendationBySubject);
router.post('/teacher', RecommendationController.createTeacherRecommendation);
router.post('/teacher/batch', RecommendationController.batchCreateTeacherRecommendations); // ДОБАВИТЬ ЭТУ СТРОКУ
router.put('/teacher/:id', RecommendationController.updateTeacherRecommendation);
router.delete('/teacher/:id', RecommendationController.deleteTeacherRecommendation);

module.exports = router;