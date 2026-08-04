const router = require('express').Router();
const protect = require('../middleware/protect');
const matchLimiter = require('../middleware/matchLimiter');
const { matchResume } = require('../controllers/match');

router.post('/', protect, matchLimiter, matchResume);

module.exports = router;