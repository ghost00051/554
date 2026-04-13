const RecommendationService = require('../services/recommendationService')
const AcademicYear = require('../models/AcademicYear')
const logger = require('../config/logger')
const cacheService = require('../services/cacheService')

class RecommendationController {
    static async calculateForStudent(req, res, next) {
        try {
            const { studentId } = req.params
            const { academicYearId } = req.body

            let yearId = academicYearId
            if (!yearId) {
                const activeYear = await AcademicYear.findActive()
                yearId = activeYear ? activeYear.id : null // Исправлено
            }

            if (!yearId) {
                return res.status(400).json({
                    success: false,
                    error: 'No academic year specified'
                })
            }

            const recommendation = await RecommendationService.calculateForStudent(
                studentId,
                yearId
            )

            res.json({
                success: true,
                data: recommendation
            })
        } catch (error) {
            logger.error('Error in calculateForStudent:', error)
            next(error)
        }
    }

    static async calculateForAll(req, res, next) {
        try {
            const { academicYearId } = req.body

            let yearId = academicYearId
            if (!yearId) {
                const activeYear = await AcademicYear.findActive()
                yearId = activeYear ? activeYear.id : null // Исправлено
            }

            if (!yearId) {
                return res.status(400).json({
                    success: false,
                    error: 'No academic year specified'
                })
            }

            RecommendationService.calculateForAll(yearId, (processed, total) => {
                    logger.info(
                        `Recommendation calculation progress: ${processed}/${total}`
                    )
                })
                .then(results => {
                    logger.info(
                        `Batch calculation completed: ${results.length} students processed`
                    )
                })
                .catch(error => {
                    logger.error('Batch calculation error:', error)
                })

            res.json({
                success: true,
                message: 'Recommendation calculation started in background',
                academicYearId: yearId
            })
        } catch (error) {
            logger.error('Error in calculateForAll:', error)
            next(error)
        }
    }

    static async getRecommendation(req, res, next) {
        try {
            const { studentId } = req.params

            const recommendation = await RecommendationService.getRecommendation(
                studentId
            )

            if (!recommendation) {
                return res.status(404).json({
                    success: false,
                    error: 'Recommendation not found for this student'
                })
            }

            res.json({
                success: true,
                data: recommendation
            })
        } catch (error) {
            logger.error('Error in getRecommendation:', error)
            next(error)
        }
    }

    static async getRecommendationsByYear(req, res, next) {
        try {
            const { academicYearId } = req.params
            const FinalRecommendation = require('../models/FinalRecommendation')

            const recommendations = await FinalRecommendation.findByYear(
                academicYearId
            )

            res.json({
                success: true,
                data: recommendations,
                count: recommendations.length
            })
        } catch (error) {
            logger.error('Error in getRecommendationsByYear:', error)
            next(error)
        }
    }

    static async getTeacherRecommendations(req, res, next) {
        try {
            const { studentId } = req.params

            const recommendations = await TeacherRecommendation.findByStudent(
                studentId
            )

            res.json({
                success: true,
                data: recommendations,
                count: recommendations.length
            })
        } catch (error) {
            logger.error('Error in getTeacherRecommendations:', error)
            next(error)
        }
    }

    static async getTeacherRecommendationBySubject(req, res, next) {
        try {
            const { studentId, subjectId } = req.params

            const recommendations =
                await TeacherRecommendation.findByStudentAndSubject(
                    studentId,
                    subjectId
                )

            res.json({
                success: true,
                data: recommendations
            })
        } catch (error) {
            logger.error('Error in getTeacherRecommendationBySubject:', error)
            next(error)
        }
    }

    static async createTeacherRecommendation(req, res, next) {
        try {
            const { studentId, subjectId, score, comment } = req.body

            if (!studentId || !subjectId || score === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'studentId, subjectId and score are required'
                })
            }

            const student = await Student.findById(studentId)
            if (!student) {
                return res.status(404).json({
                    success: false,
                    error: 'Student not found'
                })
            }

            const subject = await Subject.findById(subjectId)
            if (!subject) {
                return res.status(404).json({
                    success: false,
                    error: 'Subject not found'
                })
            }

            const recommendation = await TeacherRecommendation.create(
                studentId,
                subjectId,
                score,
                comment
            )

            res.status(201).json({
                success: true,
                data: recommendation,
                message: 'Teacher recommendation created successfully'
            })
        } catch (error) {
            logger.error('Error in createTeacherRecommendation:', error)
            next(error)
        }
    }

    static async batchCreateTeacherRecommendations(req, res, next) {
        try {
            const { recommendations } = req.body

            if (!recommendations ||
                !Array.isArray(recommendations) ||
                recommendations.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    error: 'recommendations array is required'
                })
            }

            const results = {
                total: recommendations.length,
                success: 0,
                failed: 0,
                results: [],
                errors: []
            }

            for (const rec of recommendations) {
                try {
                    const { studentId, subjectId, score, comment } = rec

                    if (!studentId || !subjectId || score === undefined) {
                        results.failed++
                            results.errors.push({
                                studentId,
                                subjectId,
                                error: 'Missing required fields'
                            })
                        continue
                    }

                    const student = await Student.findById(studentId)
                    if (!student) {
                        results.failed++
                            results.errors.push({
                                studentId,
                                subjectId,
                                error: `Student ${studentId} not found`
                            })
                        continue
                    }

                    const subject = await Subject.findById(subjectId)
                    if (!subject) {
                        results.failed++
                            results.errors.push({
                                studentId,
                                subjectId,
                                error: `Subject ${subjectId} not found`
                            })
                        continue
                    }

                    const recommendation = await TeacherRecommendation.create(
                        studentId,
                        subjectId,
                        score,
                        comment
                    )

                    results.success++
                        results.results.push(recommendation)
                } catch (error) {
                    results.failed++
                        results.errors.push({
                            studentId: rec.studentId,
                            subjectId: rec.subjectId,
                            error: error.message
                        })
                }
            }

            res.status(201).json({
                success: true,
                data: results,
                message: `Successfully created ${results.success} out of ${results.total} recommendations`
            })
        } catch (error) {
            logger.error('Error in batchCreateTeacherRecommendations:', error)
            next(error)
        }
    }

    static async updateTeacherRecommendation(req, res, next) {
        try {
            const { id } = req.params
            const { score, comment } = req.body

            const recommendation = await TeacherRecommendation.update(
                id,
                score,
                comment
            )

            if (!recommendation) {
                return res.status(404).json({
                    success: false,
                    error: 'Recommendation not found'
                })
            }

            res.json({
                success: true,
                data: recommendation,
                message: 'Recommendation updated successfully'
            })
        } catch (error) {
            logger.error('Error in updateTeacherRecommendation:', error)
            next(error)
        }
    }

    static async deleteTeacherRecommendation(req, res, next) {
        try {
            const { id } = req.params

            const recommendation = await TeacherRecommendation.delete(id)

            if (!recommendation) {
                return res.status(404).json({
                    success: false,
                    error: 'Recommendation not found'
                })
            }

            res.json({
                success: true,
                data: recommendation,
                message: 'Recommendation deleted successfully'
            })
        } catch (error) {
            logger.error('Error in deleteTeacherRecommendation:', error)
            next(error)
        }
    }
    static async createTeacherRecommendation(req, res, next) {
        try {
            const { studentId, subjectId, score, comment } = req.body

            if (!studentId || !subjectId || score === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'studentId, subjectId and score are required'
                })
            }

            const student = await Student.findById(studentId)
            if (!student) {
                return res.status(404).json({
                    success: false,
                    error: 'Student not found'
                })
            }

            const subject = await Subject.findById(subjectId)
            if (!subject) {
                return res.status(404).json({
                    success: false,
                    error: 'Subject not found'
                })
            }

            const recommendation = await TeacherRecommendation.create(
                studentId,
                subjectId,
                score,
                comment
            )

            const activeYear = await AcademicYear.findActive()
            if (activeYear) {
                const finalRecommendation =
                    await RecommendationService.calculateForStudent(
                        studentId,
                        activeYear.id
                    )

                res.status(201).json({
                    success: true,
                    data: {
                        teacher_recommendation: recommendation,
                        final_recommendation: finalRecommendation
                    },
                    message: 'Teacher recommendation created and final recommendation recalculated'
                })
            } else {
                res.status(201).json({
                    success: true,
                    data: recommendation,
                    message: 'Teacher recommendation created (no active year for recalculation)'
                })
            }
        } catch (error) {
            logger.error('Error in createTeacherRecommendation:', error)
            next(error)
        }
    }

    static async batchCreateTeacherRecommendations(req, res, next) {
        try {
            const { recommendations } = req.body

            if (!recommendations ||
                !Array.isArray(recommendations) ||
                recommendations.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    error: 'recommendations array is required'
                })
            }

            const results = {
                total: recommendations.length,
                success: 0,
                failed: 0,
                results: [],
                errors: []
            }

            const studentIds = new Set()

            for (const rec of recommendations) {
                try {
                    const { studentId, subjectId, score, comment } = rec

                    if (!studentId || !subjectId || score === undefined) {
                        results.failed++
                            results.errors.push({
                                studentId,
                                subjectId,
                                error: 'Missing required fields'
                            })
                        continue
                    }

                    const student = await Student.findById(studentId)
                    if (!student) {
                        results.failed++
                            results.errors.push({
                                studentId,
                                subjectId,
                                error: `Student ${studentId} not found`
                            })
                        continue
                    }

                    const subject = await Subject.findById(subjectId)
                    if (!subject) {
                        results.failed++
                            results.errors.push({
                                studentId,
                                subjectId,
                                error: `Subject ${subjectId} not found`
                            })
                        continue
                    }

                    const recommendation = await TeacherRecommendation.create(
                        studentId,
                        subjectId,
                        score,
                        comment
                    )

                    results.success++
                        results.results.push(recommendation)
                    studentIds.add(studentId)
                } catch (error) {
                    results.failed++
                        results.errors.push({
                            studentId: rec.studentId,
                            subjectId: rec.subjectId,
                            error: error.message
                        })
                }
            }

            const activeYear = await AcademicYear.findActive()
            const finalRecommendations = []

            if (activeYear && studentIds.size > 0) {
                for (const studentId of studentIds) {
                    try {
                        const finalRec = await RecommendationService.calculateForStudent(
                            studentId,
                            activeYear.id
                        )
                        finalRecommendations.push(finalRec)
                    } catch (error) {
                        logger.error(`Error recalculating for student ${studentId}:`, error)
                    }
                }
            }

            res.status(201).json({
                success: true,
                data: {
                    teacher_recommendations: results,
                    final_recommendations: finalRecommendations,
                    recalculated_students: Array.from(studentIds)
                },
                message: `Successfully created ${results.success} out of ${results.total} recommendations and recalculated ${finalRecommendations.length} students`
            })
        } catch (error) {
            logger.error('Error in batchCreateTeacherRecommendations:', error)
            next(error)
        }
    }
}

module.exports = RecommendationController