const router = require('express').Router();
const protect = require('../middleware/protect');
const upload = require('../middleware/upload');
const { addResume, deleteResume, getResumes, updateResume,uploadResume } = require('../controllers/resumes');

router.use(protect);

router.get('/', getResumes);
router.post('/', addResume);
router.delete('/:id', deleteResume);
router.put('/:id', updateResume)
router.post('/upload', upload.single('file'), uploadResume);

module.exports = router;