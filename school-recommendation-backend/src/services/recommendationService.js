const Student = require('../models/Student')
const Grade = require('../models/Grade')
const TeacherRecommendation = require('../models/TeacherRecommendation')
const FinalRecommendation = require('../models/FinalRecommendation')
const Class = require('../models/Class')
const logger = require('../config/logger')
const cacheService = require('./cacheService')

class RecommendationService {
    static async calculateForStudent(studentId, academicYearId) {
        try {
            const student = await Student.getWithGrades(studentId)
            if (!student) {
                throw new Error(`Student ${studentId} not found`)
            }

            const grades = student.grades || []

            const recommendations = student.recommendations || []

            const keySubjects = ['Математика', 'Русский язык', 'Физика']
            const subjectGrades = grades.filter(g => keySubjects.includes(g.subject))

            let averageGrade = 0
            if (subjectGrades.length > 0) {
                const sum = subjectGrades.reduce(
                    (acc, g) => acc + parseFloat(g.grade),
                    0
                )
                averageGrade = sum / subjectGrades.length
            }

            const normalizedGrade = (averageGrade / 5) * 10

            let averageRecommendation = 0
            if (recommendations.length > 0) {
                const sum = recommendations.reduce((acc, r) => acc + r.score, 0)
                averageRecommendation = sum / recommendations.length
            }

            const weights = {
                academicPerformance: 0.6,
                teacherRecommendation: 0.4
            }

            const totalScore =
                normalizedGrade * weights.academicPerformance +
                averageRecommendation * weights.teacherRecommendation

            let recommendedClass = null
            let recommendedClassName = 'Общеобразовательный'

            if (totalScore >= 8.5) {
                recommendedClassName = 'Физико-математический'
            } else if (totalScore >= 7) {
                recommendedClassName = 'Естественно-научный'
            } else if (totalScore >= 5.5) {
                recommendedClassName = 'Социально-экономический'
            } else {
                recommendedClassName = 'Гуманитарный'
            }

            const classes = await Class.findAll(academicYearId)
            const targetClass = classes.find(c => c.name === recommendedClassName)

            if (targetClass) {
                recommendedClass = targetClass.id
            }

            const details = {
                normalizedGrade,
                averageRecommendation,
                weights,
                subjectGrades: subjectGrades.map(g => ({
                    subject: g.subject,
                    grade: g.grade
                })),
                recommendations: recommendations.map(r => ({
                    subject: r.subject,
                    score: r.score
                })),
                algorithm: 'weighted_sum_v1'
            }

            const finalRecommendation = await FinalRecommendation.create(
                studentId,
                recommendedClass,
                totalScore,
                details
            )

            await cacheService.set(
                `recommendation:student:${studentId}`,
                finalRecommendation,
                3600
            )

            logger.info(
                `Recommendation calculated for student ${studentId}: ${totalScore} -> ${recommendedClassName}`
            )

            return {
                ...finalRecommendation,
                recommendedClassName,
                totalScore
            }
        } catch (error) {
            logger.error('Error calculating recommendation:', error)
            throw error
        }
    }

    static async calculateForAll(academicYearId, progressCallback = null) {
        try {
            const students = await Student.findAll({ academicYearId })

            const results = []
            let processed = 0

            for (const student of students) {
                try {
                    await FinalRecommendation.deleteByStudent(student.id)

                    const recommendation = await this.calculateForStudent(
                        student.id,
                        academicYearId
                    )
                    results.push(recommendation)

                    processed++
                    if (progressCallback) {
                        progressCallback(processed, students.length)
                    }
                } catch (error) {
                    logger.error(`Error processing student ${student.id}:`, error)
                    results.push({
                        studentId: student.id,
                        error: error.message
                    })
                }
            }

            logger.info(
                `Batch recommendation calculation completed for ${students.length} students`
            )
            return results
        } catch (error) {
            logger.error('Error in batch recommendation calculation:', error)
            throw error
        }
    }

    // Получить рекомендацию с кэшем
    static async getRecommendation(studentId) {
        try {
            const cached = await cacheService.get(
                `recommendation:student:${studentId}`
            )
            if (cached) {
                return cached
            }

            const recommendation = await FinalRecommendation.findByStudent(studentId)

            if (recommendation) {
                await cacheService.set(
                    `recommendation:student:${studentId}`,
                    recommendation,
                    3600
                )
            }

            return recommendation
        } catch (error) {
            logger.error('Error getting recommendation:', error)
            throw error
        }
    }
    static calculateAverageGrade(grades) {
        if (!grades || grades.length === 0) return 0
        const sum = grades.reduce((acc, g) => acc + parseFloat(g.grade), 0)
        return sum / grades.length
    }
}

module.exports = RecommendationService