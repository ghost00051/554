const RecommendationService = require('../services/recommendationService');
const AcademicYear = require('../models/AcademicYear');
const logger = require('../config/logger');
const cacheService = require('../services/cacheService');

class RecommendationController {
    static async calculateForStudent(req, res, next) {
        try {
            const { studentId } = req.params;
            const { academicYearId } = req.body;

            let yearId = academicYearId;
            if (!yearId) {
                const activeYear = await AcademicYear.findActive();
                yearId = activeYear ? activeYear.id : null; // Исправлено
            }

            if (!yearId) {
                return res.status(400).json({
                    success: false,
                    error: 'No academic year specified'
                });
            }

            const recommendation = await RecommendationService.calculateForStudent(studentId, yearId);

            res.json({
                success: true,
                data: recommendation
            });
        } catch (error) {
            logger.error('Error in calculateForStudent:', error);
            next(error);
        }
    }

    static async calculateForAll(req, res, next) {
        try {
            const { academicYearId } = req.body;

            let yearId = academicYearId;
            if (!yearId) {
                const activeYear = await AcademicYear.findActive();
                yearId = activeYear ? activeYear.id : null; // Исправлено
            }

            if (!yearId) {
                return res.status(400).json({
                    success: false,
                    error: 'No academic year specified'
                });
            }

            RecommendationService.calculateForAll(yearId, (processed, total) => {
                logger.info(`Recommendation calculation progress: ${processed}/${total}`);
            }).then(results => {
                logger.info(`Batch calculation completed: ${results.length} students processed`);
            }).catch(error => {
                logger.error('Batch calculation error:', error);
            });

            res.json({
                success: true,
                message: 'Recommendation calculation started in background',
                academicYearId: yearId
            });
        } catch (error) {
            logger.error('Error in calculateForAll:', error);
            next(error);
        }
    }

    static async getRecommendation(req, res, next) {
        try {
            const { studentId } = req.params;

            const recommendation = await RecommendationService.getRecommendation(studentId);

            if (!recommendation) {
                return res.status(404).json({
                    success: false,
                    error: 'Recommendation not found for this student'
                });
            }

            res.json({
                success: true,
                data: recommendation
            });
        } catch (error) {
            logger.error('Error in getRecommendation:', error);
            next(error);
        }
    }

    static async getRecommendationsByYear(req, res, next) {
        try {
            const { academicYearId } = req.params;
            const FinalRecommendation = require('../models/FinalRecommendation');

            const recommendations = await FinalRecommendation.findByYear(academicYearId);

            res.json({
                success: true,
                data: recommendations,
                count: recommendations.length
            });
        } catch (error) {
            logger.error('Error in getRecommendationsByYear:', error);
            next(error);
        }
    }
}

module.exports = RecommendationController;