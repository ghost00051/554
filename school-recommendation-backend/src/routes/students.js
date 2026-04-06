const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/studentController');

router.get('/', StudentController.getStudents);
router.get('/:id', StudentController.getStudent);

module.exports = router;