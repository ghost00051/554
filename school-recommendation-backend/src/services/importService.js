const XLSX = require('xlsx')
const ExcelParser = require('./excelParser')
const Student = require('../models/Student')
const Subject = require('../models/Subject')
const Grade = require('../models/Grade')
const TeacherRecommendation = require('../models/TeacherRecommendation')
const Class = require('../models/Class')
const AcademicYear = require('../models/AcademicYear')
const logger = require('../config/logger')

class ImportService {
    static async importStudentsFromExcel(
        fileBuffer,
        academicYearId = null,
        specifiedClass = null,
        onProgress = null
    ) {
        const { classes: parsedClasses, year } = ExcelParser.parse(fileBuffer)

        console.log(`Найдено классов: ${parsedClasses.length}`)
        console.log(`Год из файла: ${year}`)

        const results = {
            total: 0,
            success: 0,
            errors: [],
            students: [],
            classes: {},
            newSubjects: [],
            year: year
        }

        let activeYearId = academicYearId

        if (!activeYearId && year) {
            const existingYear = await AcademicYear.findByYear(year)
            if (existingYear) {
                activeYearId = existingYear.id
                console.log(`Найден существующий год: ${year} (ID: ${activeYearId})`)
            } else {
                const newYear = await AcademicYear.create(year)
                activeYearId = newYear.id
                console.log(`Создан новый год: ${year} (ID: ${activeYearId})`)
            }

            await AcademicYear.setActive(activeYearId)
            console.log(`Год ${year} установлен как активный`)
        } else if (!activeYearId) {
            const activeYear = await AcademicYear.findActive()
            if (activeYear) {
                activeYearId = activeYear.id
                console.log(`Используем активный год: ${activeYear.year}`)
            } else {
                throw new Error('No academic year found in file or database')
            }
        }

        const allSubjects = new Set()

        if (onProgress) {
            onProgress(5, 'Чтение Excel файла...')
        }

        for (const classData of parsedClasses) {
            for (const student of classData.students) {
                for (const subject of student.subjects) {
                    allSubjects.add(subject.name)
                }
            }
        }

        if (onProgress) {
            onProgress(10, `Найдено ${parsedClasses.length} классов`)
        }

        const existingSubjects = await Subject.findAll()
        const subjectMap = new Map()
        existingSubjects.forEach(s => subjectMap.set(s.name, s))

        if (onProgress) {
            onProgress(15, `Обработка предметов...`)
        }

        for (const subjectName of allSubjects) {
            if (!subjectMap.has(subjectName)) {
                const newSubject = await Subject.create(subjectName)
                subjectMap.set(subjectName, newSubject)
                results.newSubjects.push(subjectName)
            }
        }

        const existingClasses = await Class.findAll(activeYearId)
        const classMap = new Map()
        existingClasses.forEach(c => classMap.set(c.name, c))

        let processedStudents = 0
        const totalStudents = parsedClasses.reduce(
            (sum, c) => sum + c.students.length,
            0
        )

        if (onProgress) {
            onProgress(20, `Начинаем импорт ${totalStudents} учеников...`)
        }

        for (const classData of parsedClasses) {
            const className = classData.name
            results.classes[className] = []

            let classId = null
            if (classMap.has(className)) {
                classId = classMap.get(className).id
            } else if (className) {
                const newClass = await Class.create(className, activeYearId)
                classId = newClass.id
                classMap.set(className, newClass)
            }

            for (const studentData of classData.students) {
                try {
                    const student = await Student.create(
                        studentData.fullName,
                        classId,
                        activeYearId
                    )
                    results.total++
                        results.students.push(student)
                    results.classes[className].push(studentData.fullName)

                    for (const subject of studentData.subjects) {
                        const subjectObj = subjectMap.get(subject.name)
                        if (subjectObj) {
                            if (subject.grade !== null && !isNaN(subject.grade)) {
                                await Grade.create(student.id, subjectObj.id, subject.grade)
                            }
                            if (
                                subject.recommendation !== null &&
                                !isNaN(subject.recommendation)
                            ) {
                                await TeacherRecommendation.create(
                                    student.id,
                                    subjectObj.id,
                                    subject.recommendation
                                )
                            }
                        }
                    }

                    results.success++
                        processedStudents++

                        if (onProgress) {
                            const percent =
                                20 + Math.floor((processedStudents / totalStudents) * 80)
                            onProgress(
                                percent,
                                `Импорт: ${processedStudents}/${totalStudents} - ${studentData.fullName}`
                            )
                        }
                } catch (error) {
                    console.error(
                        `  Ошибка импорта ${studentData.fullName}:`,
                        error.message
                    )
                    results.errors.push({
                        student: studentData.fullName,
                        class: className,
                        error: error.message
                    })
                }
            }
        }

        if (onProgress) {
            onProgress(100, 'Импорт завершен!')
        }

        return results
    }

    static async exportRecommendations(academicYearId) {
        const FinalRecommendation = require('../models/FinalRecommendation')
        const recommendations = await FinalRecommendation.findByYear(academicYearId)

        const exportData = recommendations.map(rec => ({
            ФИО: rec.full_name || 'Не указано',
            Класс: rec.class_name || 'Не указан',
            'Рекомендуемый класс': rec.recommended_class_name || 'Не определен',
            'Итоговый балл': rec.total_score ?
                Number(rec.total_score).toFixed(2) : '0',
            'Дата создания': rec.created_at ?
                new Date(rec.created_at).toLocaleDateString('ru-RU') : ''
        }))

        const worksheet = XLSX.utils.json_to_sheet(exportData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Рекомендации')

        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    }
}

module.exports = ImportService