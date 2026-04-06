const fs = require('fs');
const ImportService = require('./src/services/importService');
const AcademicYear = require('./src/models/AcademicYear');
const pool = require('./src/config/database');

async function testImport() {
    try {
        const activeYear = await AcademicYear.findActive();
        if (!activeYear) {
            console.log('No active academic year found');
            return;
        }

        console.log(`Using academic year: ${activeYear.year} (ID: ${activeYear.id})`);

        const filePath = process.argv[2];
        if (!filePath) {
            console.log('Please provide Excel file path');
            console.log('Usage: node test-import.js path/to/file.xlsx');
            return;
        }

        const fileBuffer = fs.readFileSync(filePath);

        console.log('Importing students...');
        const result = await ImportService.importStudentsFromExcel(fileBuffer, activeYear.id);

        console.log('\n=== Import Results ===');
        console.log(`Total students: ${result.total}`);
        console.log(`Successfully imported: ${result.success}`);
        console.log(`Errors: ${result.errors.length}`);

        if (result.errors.length > 0) {
            console.log('\nErrors:');
            result.errors.forEach(err => {
                console.log(`  - ${err.student}: ${err.error}`);
            });
        }

        if (result.classes) {
            console.log('\nClasses imported:');
            for (const [className, students] of Object.entries(result.classes)) {
                console.log(`  ${className}: ${students.length} students`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

testImport();