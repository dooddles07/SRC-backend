// routes/member.js
const express  = require('express');
const router   = express.Router();
const { authenticate } = require('../middleware/auth');
const { getBookingByReference, getMemberBookings, updateMemberBooking, updateMemberProfile } = require('../controllers/memberController');

// PUT /api/member/profile  — update logged-in member's profile
router.put('/profile', authenticate, updateMemberProfile);

// GET /api/member/bookings  — all bookings for the logged-in member
router.get('/bookings', authenticate, getMemberBookings);

// PUT /api/member/bookings/:reference  — edit an upcoming booking
router.put('/bookings/:reference', authenticate, updateMemberBooking);

// GET /api/booking/:reference  — look up one booking by reference number
router.get('/:reference', authenticate, getBookingByReference);

module.exports = router;
