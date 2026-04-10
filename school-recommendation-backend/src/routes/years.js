const express = require('express');
const router = express.Router();
const YearController = require('../controllers/yearController');
const validate = require('../middleware/validation');
const authMiddleware = require('../middleware/auth');
const AuthController = require('../controllers/authController');

router.get('/', YearController.getYears);
router.post('/', AuthController.verifyToken, validate('createYear'), YearController.createYear);
router.put('/:id/active', AuthController.verifyToken, YearController.setActiveYear);
router.delete('/:id', AuthController.verifyToken, YearController.deleteYear);
router.get('/:academicYearId/classes', YearController.getClasses);

module.exports = router;