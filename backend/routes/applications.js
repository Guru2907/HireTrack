const router = require('express').Router();
const protect = require('../middleware/protect');
const { getAll, create, update, remove } = require('../controllers/applications');

router.use(protect); // every route below requires a valid JWT

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
