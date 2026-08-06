const router = require('express').Router();
const protect = require('../middleware/protect');
const { addResume, deleteResume, getResumes, updateResume } = require('../controllers/resumes');

router.use(protect);

router.get('/', getResumes);
router.post('/', addResume);
router.delete('/:id', deleteResume);
router.put('/:id', updateResume)

module.exports = router;