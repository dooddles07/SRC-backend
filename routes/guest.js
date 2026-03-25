// routes/guest.js
const express    = require('express');
const router     = express.Router();
const { body }   = require('express-validator');
const { authenticate }  = require('../middleware/auth');
const { registerGuest } = require('../controllers/guestController');

router.post(
  '/',
  authenticate,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('guest_name').notEmpty().withMessage('guest_name is required'),
    body('guest_email').isEmail().withMessage('Valid guest_email is required'),
    body('inviting_member_id').notEmpty().withMessage('inviting_member_id is required'),
    body('slot_date').notEmpty().withMessage('slot_date is required'),
    body('facility_or_venue').notEmpty().withMessage('facility_or_venue is required'),
  ],
  registerGuest
);

module.exports = router;
