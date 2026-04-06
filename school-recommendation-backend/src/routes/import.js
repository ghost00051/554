const express = require('express');
const router = express.Router();
const ImportController = require('../controllers/importController');

router.post('/students',
    ImportController.getUploadMiddleware(),
    ImportController.importStudents
);

router.post('/students/progress',
    ImportController.getUploadMiddleware(),
    ImportController.importStudentsWithProgress
);

router.get('/export/recommendations', ImportController.exportRecommendations);

module.exports = router;