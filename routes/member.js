// routes/member.js
const express  = require('express');
const router   = express.Router();
const { authenticate } = require('../middleware/auth');
const { getBookingByReference, getMemberBookings } = require('../controllers/memberController');

// GET /api/member/bookings  — all bookings for the logged-in member
router.get('/bookings', authenticate, getMemberBookings);

// GET /api/booking/:reference  — look up one booking by reference number
router.get('/:reference', authenticate, getBookingByReference);

module.exports = router;
