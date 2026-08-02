const router = require('express').Router();
const protect = require('../middleware/protect');
const { addResume, deleteResume, getResumes } = require('../controllers/resumes');

router.use(protect);

router.get('/', getResumes);
router.post('/', addResume);
router.delete('/:id', deleteResume);

module.exports = router;