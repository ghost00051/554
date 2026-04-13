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

            const physMathSubjects = ['Физика', 'Алгебра', 'Информатика']
            const physMathResult = this.calculateProfileScore(
                grades,
                recommendations,
                physMathSubjects
            )

            const chemBioSubjects = ['Химия', 'Биология']
            const chemBioResult = this.calculateProfileScore(
                grades,
                recommendations,
                chemBioSubjects
            )

            let recommendedClassName = ''
            let totalScore = 0
            let details = {}

            if (physMathResult.totalScore >= chemBioResult.totalScore) {
                recommendedClassName = 'Физико-математический'
                totalScore = physMathResult.totalScore
                details = {
                    profile: 'physmath',
                    recommended_class_name: 'Физико-математический',
                    normalizedGrade: physMathResult.normalizedGrade,
                    averageRecommendation: physMathResult.averageRecommendation,
                    weights: physMathResult.weights,
                    subjectGrades: physMathResult.subjectGrades,
                    recommendations: physMathResult.recommendations,
                    algorithm: 'profile_based_v2'
                }
            } else {
                recommendedClassName = 'Химико-биологический'
                totalScore = chemBioResult.totalScore
                details = {
                    profile: 'chembio',
                    recommended_class_name: 'Химико-биологический',
                    normalizedGrade: chemBioResult.normalizedGrade,
                    averageRecommendation: chemBioResult.averageRecommendation,
                    weights: chemBioResult.weights,
                    subjectGrades: chemBioResult.subjectGrades,
                    recommendations: chemBioResult.recommendations,
                    algorithm: 'profile_based_v2'
                }
            }

            await FinalRecommendation.deleteByStudent(studentId)

            const finalRecommendation = await FinalRecommendation.create(
                studentId,
                null,
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
                totalScore,
                physMathScore: physMathResult.totalScore,
                chemBioScore: chemBioResult.totalScore
            }
        } catch (error) {
            logger.error('Error calculating recommendation:', error)
            throw error
        }
    }

    static calculateProfileScore(grades, recommendations, profileSubjects) {
        const subjectGrades = grades.filter(g =>
            profileSubjects.includes(g.subject)
        )

        const profileRecommendations = recommendations.filter(r =>
            profileSubjects.includes(r.subject)
        )

        let averageGrade = 0
        if (subjectGrades.length > 0) {
            const sum = subjectGrades.reduce((acc, g) => acc + parseFloat(g.grade), 0)
            averageGrade = sum / subjectGrades.length
        }

        const normalizedGrade = (averageGrade / 5) * 10

        let averageRecommendation = 0
        if (profileRecommendations.length > 0) {
            const sum = profileRecommendations.reduce((acc, r) => acc + r.score, 0)
            averageRecommendation = sum / profileRecommendations.length
        }

        const weights = {
            academicPerformance: 0.6,
            teacherRecommendation: 0.4
        }

        const totalScore =
            normalizedGrade * weights.academicPerformance +
            averageRecommendation * weights.teacherRecommendation

        return {
            totalScore,
            normalizedGrade,
            averageRecommendation,
            weights,
            subjectGrades,
            recommendations: profileRecommendations
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
}

module.exports = RecommendationService