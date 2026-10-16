const router = require('express').Router();
const protect = require('../middleware/protect');
const matchLimiter = require('../middleware/matchLimiter');
const { validate } = require('../middleware/validate');
const { matchSchema } = require('../validation/match');
const { matchResume } = require('../controllers/match');

// Validation runs before the limiter so malformed requests don't use up a user's AI quota.
router.post('/', protect, validate(matchSchema), matchLimiter, matchResume);

module.exports = router;
