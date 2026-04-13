const express = require('express');
const router = express.Router();
const YearController = require('../controllers/yearController');
const validate = require('../middleware/validation');
const authMiddleware = require('../middleware/auth');
const AuthController = require('../controllers/authController');

router.get('/', YearController.getYears);
router.post('/', authMiddleware, validate('createYear'), YearController.createYear);
router.put('/:id/active', authMiddleware, YearController.setActiveYear);
router.delete('/:id', authMiddleware, YearController.deleteYear);
router.get('/:academicYearId/classes', YearController.getClasses);

module.exports = router;