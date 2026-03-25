// routes/walkin.js
const express    = require('express');
const router     = express.Router();
const { body }   = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { logWalkin }    = require('../controllers/walkinController');

router.post(
  '/',
  authenticate,
  [
    body('name').notEmpty().withMessage('name is required'),
    body('facility').notEmpty().withMessage('facility is required'),
    body('pax').notEmpty().withMessage('pax is required'),
    body('staff_id').notEmpty().withMessage('staff_id is required'),
  ],
  logWalkin
);

module.exports = router;
