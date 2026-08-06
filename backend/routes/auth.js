const router = require('express').Router();
const { signup, login, updateProfile, changePassword } = require('../controllers/auth');
const protect = require('../middleware/protect');

router.post('/signup', signup);
router.post('/login', login);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;