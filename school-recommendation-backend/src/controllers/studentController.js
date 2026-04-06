const Student = require('../models/Student');
const RecommendationService = require('../services/recommendationService');
const cacheService = require('../services/cacheService');
const logger = require('../config/logger');

class StudentController {
    static async getStudents(req, res, next) {
        try {
            const { academicYearId, classId, fullName, page = 1, limit = 50 } = req.query;

            const cacheKey = `students:list:${academicYearId}:${classId}:${fullName}:${page}:${limit}`;

            const cached = await cacheService.get(cacheKey);
            if (cached) {
                return res.json(cached);
            }

            const students = await Student.findAll({
                academicYearId,
                classId,
                fullName,
                limit: parseInt(limit),
                offset: (page - 1) * limit
            });

            const totalStudents = students.length;

            const response = {
                success: true,
                data: students,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalStudents
                }
            };

            await cacheService.set(cacheKey, response, 300); // 5 минут

            res.json(response);
        } catch (error) {
            logger.error('Error in getStudents:', error);
            next(error);
        }
    }

    static async getStudent(req, res, next) {
        try {
            const { id } = req.params;

            const student = await Student.getWithGrades(id);

            if (!student) {
                return res.status(404).json({
                    success: false,
                    error: 'Student not found'
                });
            }

            const recommendation = await RecommendationService.getRecommendation(id);

            res.json({
                success: true,
                data: {
                    ...student,
                    recommendation
                }
            });
        } catch (error) {
            logger.error('Error in getStudent:', error);
            next(error);
        }
    }
}

module.exports = StudentController;