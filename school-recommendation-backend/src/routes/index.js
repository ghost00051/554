const express = require('express');
const router = express.Router();

const yearsRouter = require('./years');
const studentsRouter = require('./students');
const recommendationsRouter = require('./recommendations');
const importRouter = require('./import');
const subjectsRouter = require('./subjects');
const classesRouter = require('./classes');
const gradesRouter = require('./grades');
const authRouter = require('./auth');

router.use('/years', yearsRouter);
router.use('/students', studentsRouter);
router.use('/recommendations', recommendationsRouter);
router.use('/import', importRouter);
router.use('/subjects', subjectsRouter);
router.use('/classes', classesRouter);
router.use('/grades', gradesRouter);
router.use('/auth', authRouter);

router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = router;