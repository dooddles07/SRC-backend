// routes/checkin.js
const express    = require('express');
const router     = express.Router();
const { body }   = require('express-validator');
const { authenticate }       = require('../middleware/auth');
const { validateAndCheckin } = require('../controllers/checkinController');

router.post(
  '/',
  authenticate,
  [
    body('booking_reference').notEmpty().withMessage('booking_reference is required'),
    body('checked_in_by').notEmpty().withMessage('checked_in_by is required'),
  ],
  validateAndCheckin
);

module.exports = router;
