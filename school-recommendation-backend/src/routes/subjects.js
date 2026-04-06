const express = require('express');
const router = express.Router();
const SubjectController = require('../controllers/subjectController');
const authMiddleware = require('../middleware/auth');

router.get('/', SubjectController.getAllSubjects);
router.get('/:id', SubjectController.getSubjectById);
router.post('/', authMiddleware, SubjectController.createSubject);
router.put('/:id', authMiddleware, SubjectController.updateSubject);
router.delete('/:id', authMiddleware, SubjectController.deleteSubject);

module.exports = router;