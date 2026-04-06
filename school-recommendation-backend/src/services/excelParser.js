const XLSX = require('xlsx');

class ExcelParser {
    static parse(fileBuffer) {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        console.log('Всего строк:', data.length);

        let year = null;
        if (data.length > 0 && data[0] && data[0][0]) {
            const cellA1 = String(data[0][0]).trim();
            const yearMatch = cellA1.match(/(\d{4}-\d{4})/);
            if (yearMatch) {
                year = yearMatch[1];
            } else {
                const currentYear = new Date().getFullYear();
                year = `${currentYear}-${currentYear + 1}`;
                console.log(`Год не найден в A1, используем текущий: ${year}`);
            }
            console.log(`Извлечен год из A1: ${year}`);
        }

        const classes = [];
        let currentClass = null;
        let currentStudent = null;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const col0 = row[0] ? String(row[0]).trim() : '';
            const col1 = row[1] ? String(row[1]).trim() : '';
            const col2 = row[2] ? String(row[2]).trim() : '';
            const col3 = row[3] ? String(row[3]).trim() : '';

            if (!col0 && !col1 && !col2 && !col3) continue;

            if (col0 && col0.toLowerCase().includes('класс')) {
                if (currentStudent && currentStudent.subjects.length > 0) {
                    currentClass.students.push({...currentStudent });
                }

                const className = this.extractClassName(col0);
                if (className) {
                    currentClass = {
                        name: className,
                        students: []
                    };
                    classes.push(currentClass);
                }
                currentStudent = null;
                continue;
            }

            if (col0 === 'Обучающийся') {
                continue;
            }

            const isStudent = col0 &&
                !col0.toLowerCase().includes('класс') &&
                col0 !== 'Обучающийся' &&
                col0.length > 2;

            if (isStudent && currentClass) {
                if (currentStudent && currentStudent.subjects.length > 0) {
                    currentClass.students.push({...currentStudent });
                }

                currentStudent = {
                    fullName: col0,
                    subjects: []
                };

                if (col1 && col1 !== 'Предмет' && !col1.includes('Если') && col1.length > 2) {
                    this.addSubject(currentStudent, col1, col2, col3);
                }
                continue;
            }

            if (currentStudent && col1 && col1 !== 'Предмет' && col1.length > 2) {
                if (!col1.includes('Если вы') && !col1.includes('Рекомендуете')) {
                    this.addSubject(currentStudent, col1, col2, col3);
                }
            }
        }

        if (currentStudent && currentStudent.subjects.length > 0 && currentClass) {
            currentClass.students.push({...currentStudent });
        }

        return { classes, year };
    }

    static addSubject(student, subjectName, recValue, gradeValue) {
        let grade = null;
        if (gradeValue && gradeValue !== '') {
            const cleanGrade = gradeValue.trim();
            if (cleanGrade.includes(' ')) {
                const parts = cleanGrade.split(' ');
                const grade1 = parseFloat(parts[0]);
                const grade2 = parseFloat(parts[1]);
                if (!isNaN(grade1) && !isNaN(grade2)) {
                    grade = (grade1 + grade2) / 2;
                }
            } else {
                grade = parseFloat(cleanGrade);
                if (isNaN(grade)) grade = null;
            }
        }

        let recommendation = null;
        if (recValue && recValue !== '') {
            const numValue = parseFloat(recValue);
            if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
                recommendation = numValue;
            }
        }

        if (grade !== null || recommendation !== null) {
            student.subjects.push({
                name: subjectName,
                grade: grade,
                recommendation: recommendation
            });
        }
    }

    static extractClassName(header) {
        const match = header.match(/(\d+)\s*([а-яА-Я])/);
        if (match) {
            return `${match[1]}${match[2].toUpperCase()}`;
        }
        return null;
    }
}

module.exports = ExcelParser;