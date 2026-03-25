// routes/auth.js
const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const { login } = require('../controllers/authController');

router.post(
  '/login',
  [
    body('membership_number').notEmpty().withMessage('membership_number is required'),
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  login
);

module.exports = router;
