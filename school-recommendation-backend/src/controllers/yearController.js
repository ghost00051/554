const AcademicYear = require('../models/AcademicYear');
const Class = require('../models/Class');
const logger = require('../config/logger');

class YearController {
    static async getYears(req, res, next) {
        try {
            const years = await AcademicYear.findAll();

            res.json({
                success: true,
                data: years
            });
        } catch (error) {
            logger.error('Error in getYears:', error);
            next(error);
        }
    }

    static async createYear(req, res, next) {
        try {
            const { year } = req.body;

            if (!year) {
                return res.status(400).json({
                    success: false,
                    error: 'Year is required'
                });
            }

            const newYear = await AcademicYear.create(year);

            const defaultClasses = ['7А', '7Б', '8А', '8Б', '9А', '9Б'];
            for (const className of defaultClasses) {
                await Class.create(className, newYear.id);
            }

            res.status(201).json({
                success: true,
                data: newYear,
                message: 'Academic year created with default classes'
            });
        } catch (error) {
            logger.error('Error in createYear:', error);
            next(error);
        }
    }

    static async setActiveYear(req, res, next) {
        try {
            const { id } = req.params;

            const year = await AcademicYear.setActive(id);

            if (!year) {
                return res.status(404).json({
                    success: false,
                    error: 'Academic year not found'
                });
            }

            res.json({
                success: true,
                data: year,
                message: 'Academic year set as active'
            });
        } catch (error) {
            logger.error('Error in setActiveYear:', error);
            next(error);
        }
    }

    static async deleteYear(req, res, next) {
        try {
            const { id } = req.params;

            const year = await AcademicYear.findById(id);
            if (!year) {
                return res.status(404).json({
                    success: false,
                    error: 'Academic year not found'
                });
            }

            const deletedYear = await AcademicYear.delete(id);

            res.json({
                success: true,
                data: deletedYear,
                message: `Academic year ${deletedYear.year} and all related data deleted successfully`
            });
        } catch (error) {
            logger.error('Error in deleteYear:', error);
            next(error);
        }
    }

    static async getClasses(req, res, next) {
        try {
            const { academicYearId } = req.params;

            const classes = await Class.findAll(academicYearId);

            res.json({
                success: true,
                data: classes
            });
        } catch (error) {
            logger.error('Error in getClasses:', error);
            next(error);
        }
    }
}

module.exports = YearController;