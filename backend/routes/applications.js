const router = require('express').Router();
const protect = require('../middleware/protect');
const { validate, validateObjectId } = require('../middleware/validate');
const { createApplicationSchema, updateApplicationSchema } = require('../validation/applications');
const { getAll, create, update, remove } = require('../controllers/applications');

router.use(protect); // every route below requires a valid JWT

router.get('/', getAll);
router.post('/', validate(createApplicationSchema), create);
router.put('/:id', validateObjectId(), validate(updateApplicationSchema), update);
router.delete('/:id', validateObjectId(), remove);

module.exports = router;
