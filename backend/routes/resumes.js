const router = require('express').Router();
const protect = require('../middleware/protect');
const upload = require('../middleware/upload');
const { validate, validateObjectId } = require('../middleware/validate');
const { resumeSchema, uploadSchema } = require('../validation/resumes');
const { addResume, deleteResume, getResumes, updateResume, uploadResume } = require('../controllers/resumes');

router.use(protect);

router.get('/', getResumes);
router.post('/', validate(resumeSchema), addResume);
router.delete('/:id', validateObjectId(), deleteResume);
router.put('/:id', validateObjectId(), validate(resumeSchema), updateResume);
router.post('/upload', upload.single('file'), validate(uploadSchema), uploadResume);

module.exports = router;
