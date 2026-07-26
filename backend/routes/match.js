const router = require('express').Router();
const protect = require('../middleware/protect');
const { matchResume } = require('../controllers/match');

router.post('/', protect, matchResume);

module.exports = router;
