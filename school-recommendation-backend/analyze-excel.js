const XLSX = require('xlsx');
const fs = require('fs');

const filePath = process.argv[2];

if (!filePath) {
    console.log('Usage: node analyze-excel.js path/to/file.xlsx');
    process.exit(1);
}

const fileBuffer = fs.readFileSync(filePath);
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

console.log('=== Анализ Excel файла ===\n');
console.log('Листы в файле:', workbook.SheetNames);
console.log('');

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

console.log(`Всего строк в файле: ${data.length}\n`);

console.log('Первые 30 строк файла:');
console.log('='.repeat(80));

for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (row && row.length > 0) {
        console.log(`Строка ${i}:`);
        for (let j = 0; j < Math.min(5, row.length); j++) {
            const cell = row[j] ? String(row[j]).substring(0, 50) : '(пусто)';
            console.log(`  Колонка ${j}: ${cell}`);
        }
        console.log('---');
    }
}

console.log('\n=== Поиск классов ===');
for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row[0] && String(row[0]).toLowerCase().includes('класс')) {
        console.log(`Строка ${i}: "${row[0]}" - это класс`);
    }
}

console.log('\n=== Поиск учеников ===');
let studentCount = 0;
for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row[0] && !row[1] &&
        !String(row[0]).toLowerCase().includes('класс') &&
        !String(row[0]).toLowerCase().includes('обучающийся') &&
        String(row[0]).length > 2) {
        console.log(`Строка ${i}: "${row[0]}" - это ученик`);
        studentCount++;
    }
}
console.log(`Всего найдено учеников: ${studentCount}`);

console.log('\n=== Поиск предметов ===');
let subjectCount = 0;
for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row[1] && row[1].length > 2 &&
        !String(row[1]).toLowerCase().includes('предмет')) {
        console.log(`Строка ${i}: предмет "${row[1]}"`);
        subjectCount++;
    }
}
console.log(`Всего найдено предметов: ${subjectCount}`);