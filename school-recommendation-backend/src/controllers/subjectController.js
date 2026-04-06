const Subject = require('../models/Subject');
const logger = require('../config/logger');
const cacheService = require('../services/cacheService');

class SubjectController {
    static async getAllSubjects(req, res, next) {
        try {
            const cacheKey = 'subjects:all';

            const cached = await cacheService.get(cacheKey);
            if (cached) {
                return res.json({
                    success: true,
                    data: cached,
                    fromCache: true
                });
            }

            const subjects = await Subject.findAll();

            await cacheService.set(cacheKey, subjects, 3600);

            res.json({
                success: true,
                data: subjects,
                count: subjects.length
            });
        } catch (error) {
            logger.error('Error in getAllSubjects:', error);
            next(error);
        }
    }

    static async getSubjectById(req, res, next) {
        try {
            const { id } = req.params;
            const subject = await Subject.findById(id);

            if (!subject) {
                return res.status(404).json({
                    success: false,
                    error: 'Subject not found'
                });
            }

            res.json({
                success: true,
                data: subject
            });
        } catch (error) {
            logger.error('Error in getSubjectById:', error);
            next(error);
        }
    }

    static async createSubject(req, res, next) {
        try {
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Subject name is required'
                });
            }

            const existing = await Subject.findByName(name);
            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'Subject already exists'
                });
            }

            const subject = await Subject.create(name);

            await cacheService.del('subjects:all');

            res.status(201).json({
                success: true,
                data: subject,
                message: `Subject "${name}" created successfully`
            });
        } catch (error) {
            logger.error('Error in createSubject:', error);
            next(error);
        }
    }

    static async updateSubject(req, res, next) {
        try {
            const { id } = req.params;
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Subject name is required'
                });
            }

            const subject = await Subject.update(id, name);

            if (!subject) {
                return res.status(404).json({
                    success: false,
                    error: 'Subject not found'
                });
            }

            await cacheService.del('subjects:all');

            res.json({
                success: true,
                data: subject,
                message: `Subject updated successfully`
            });
        } catch (error) {
            logger.error('Error in updateSubject:', error);
            next(error);
        }
    }

    static async deleteSubject(req, res, next) {
        try {
            const { id } = req.params;

            const subject = await Subject.delete(id);

            if (!subject) {
                return res.status(404).json({
                    success: false,
                    error: 'Subject not found'
                });
            }

            await cacheService.del('subjects:all');

            res.json({
                success: true,
                data: subject,
                message: `Subject "${subject.name}" deleted successfully`
            });
        } catch (error) {
            logger.error('Error in deleteSubject:', error);
            next(error);
        }
    }
}

module.exports = SubjectController;