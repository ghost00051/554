const multer = require('multer');
const ImportService = require('../services/importService');
const AcademicYear = require('../models/AcademicYear');
const ExcelParser = require('../services/excelParser');
const logger = require('../config/logger');

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const fileExt = file.originalname.split('.').pop().toLowerCase();
        const allowedExts = ['xlsx', 'xls', 'csv'];

        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            'application/octet-stream' // Добавляем для Windows
        ];

        if (allowedExts.includes(fileExt) || allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.log(`File rejected: ${file.originalname}, mimetype: ${file.mimetype}`);
            cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed'));
        }
    }
});

class ImportController {
    static async importStudents(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }

            console.log(`📁 Получен файл: ${req.file.originalname}, размер: ${req.file.size} байт`);

            const { year } = ExcelParser.parse(req.file.buffer);

            console.log(`📅 Год из файла: ${year}`);

            let academicYearId = null;

            if (year) {
                let existingYear = await AcademicYear.findByYear(year);

                if (!existingYear) {
                    const newYear = await AcademicYear.create(year);
                    academicYearId = newYear.id;
                    console.log(`✅ Создан новый год: ${year}`);
                } else {
                    academicYearId = existingYear.id;
                    console.log(`✅ Найден существующий год: ${year}`);
                }

                await AcademicYear.setActive(academicYearId);
                console.log(`🎯 Год ${year} установлен как активный`);
            } else {
                const activeYear = await AcademicYear.findActive();
                if (activeYear) {
                    academicYearId = activeYear.id;
                    console.log(`📅 Используем активный год: ${activeYear.year}`);
                } else {
                    throw new Error('No academic year found in file or database');
                }
            }

            const result = await ImportService.importStudentsFromExcel(
                req.file.buffer,
                academicYearId
            );

            res.json({
                success: true,
                data: result,
                message: `Successfully imported ${result.success} out of ${result.total} students`
            });
        } catch (error) {
            logger.error('Error in importStudents:', error);
            next(error);
        }
    }

    static async importStudentsWithProgress(req, res, next) {
        try {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');

            if (!req.file) {
                res.write(`data: ${JSON.stringify({ error: 'No file uploaded' })}\n\n`);
                res.end();
                return;
            }

            console.log(`📁 Получен файл: ${req.file.originalname}`);

            const { year } = ExcelParser.parse(req.file.buffer);

            console.log(`📅 Год из файла: ${year}`);

            let academicYearId = null;

            if (year) {
                let existingYear = await AcademicYear.findByYear(year);
                if (!existingYear) {
                    const newYear = await AcademicYear.create(year);
                    academicYearId = newYear.id;
                    console.log(`✅ Создан новый год: ${year}`);
                } else {
                    academicYearId = existingYear.id;
                    console.log(`✅ Найден существующий год: ${year}`);
                }
                await AcademicYear.setActive(academicYearId);
                console.log(`🎯 Год ${year} установлен как активный`);
            } else {
                const activeYear = await AcademicYear.findActive();
                if (activeYear) {
                    academicYearId = activeYear.id;
                    console.log(`📅 Используем активный год: ${activeYear.year}`);
                } else {
                    throw new Error('No academic year found in file or database');
                }
            }

            const sendProgress = (progress, message, data = null) => {
                res.write(`data: ${JSON.stringify({ progress, message, data })}\n\n`);
            };

            try {
                const result = await ImportService.importStudentsFromExcel(
                    req.file.buffer,
                    academicYearId,
                    null,
                    sendProgress
                );

                sendProgress(100, 'Импорт завершен!', result);
                res.end();
            } catch (error) {
                sendProgress(0, `Ошибка: ${error.message}`);
                res.end();
            }
        } catch (error) {
            logger.error('Error in importStudentsWithProgress:', error);
            next(error);
        }
    }

    static async exportRecommendations(req, res, next) {
        try {
            const { academicYearId } = req.query;

            let yearId = academicYearId;
            if (!yearId) {
                const activeYear = await AcademicYear.findActive();
                yearId = activeYear ? activeYear.id : null;
            }

            if (!yearId) {
                return res.status(400).json({
                    success: false,
                    error: 'No academic year specified'
                });
            }

            const excelBuffer = await ImportService.exportRecommendations(yearId);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=recommendations_${Date.now()}.xlsx`);
            res.send(excelBuffer);
        } catch (error) {
            logger.error('Error in exportRecommendations:', error);
            next(error);
        }
    }

    static getUploadMiddleware() {
        return upload.single('file');
    }
}

module.exports = ImportController;