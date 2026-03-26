// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    booking_reference: { type: String, required: true, unique: true },
    membership_number: { type: String, required: true, index: true },
    email:             { type: String },
    name:              { type: String },
    facility_or_venue: { type: String },
    booking_type:      { type: String },
    booking_status:    { type: String, default: 'Confirmed' },
    booking_shift:     { type: String },
    slot_date:         { type: String, index: true },
    slot_start_time:   { type: String },
    slot_end_time:     { type: String },
    outlet_pax:        { type: String },
    notes:             { type: String },
    late_cancellation: { type: Boolean, default: false },
    fee_waived:        { type: Boolean, default: false },
    waiver_reason:     { type: String },
    waiver_by:         { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
