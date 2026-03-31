// routes/auth.js
const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const { login }       = require('../controllers/authController');
const { staffLogin }        = require('../controllers/staffAuthController');
const { managementLogin }   = require('../controllers/managementAuthController');

// Member login (membership number + email)
router.post(
  '/login',
  [
    body('membership_number').notEmpty().withMessage('membership_number is required'),
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  login
);

// Staff login (username + password)
router.post('/staff/login', staffLogin);

// Management login (username + password)
router.post('/management/login', managementLogin);

module.exports = router;
