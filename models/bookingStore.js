// models/bookingStore.js
// MongoDB-backed booking store.
// Provides the same interface as the previous JSON file store.

const Booking = require('./Booking');

async function save(booking) {
  await Booking.findOneAndUpdate(
    { booking_reference: booking.booking_reference },
    booking,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function getByMember(membership_number) {
  return Booking.find({ membership_number }).sort({ slot_date: 1 }).lean();
}

async function updateStatus(booking_reference, booking_status) {
  const result = await Booking.findOneAndUpdate(
    { booking_reference },
    { booking_status }
  );
  return !!result;
}

async function updateBooking(booking_reference, updates) {
  const allowed = ['slot_date', 'slot_start_time', 'slot_end_time', 'outlet_pax', 'notes'];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }
  const result = await Booking.findOneAndUpdate(
    { booking_reference },
    filtered,
    { new: true }
  );
  return result;
}

async function getByDate(slot_date) {
  return Booking.find({ slot_date }).sort({ slot_start_time: 1 }).lean();
}

async function getByDateAndVenues(slot_date, venues) {
  return Booking.find({ slot_date, facility_or_venue: { $in: venues } })
    .sort({ slot_start_time: 1 })
    .lean();
}

async function getLateCancellations() {
  return Booking.find({ late_cancellation: true, fee_waived: { $ne: true } })
    .sort({ createdAt: -1 })
    .lean();
}

async function flagLateCancellation(booking_reference) {
  return Booking.findOneAndUpdate(
    { booking_reference },
    { late_cancellation: true, booking_status: 'Cancelled' }
  );
}

async function waiveFee(booking_reference, waiver_reason, waiver_by) {
  return Booking.findOneAndUpdate(
    { booking_reference },
    { fee_waived: true, waiver_reason, waiver_by }
  );
}

async function getByReference(booking_reference) {
  return Booking.findOne({ booking_reference }).lean();
}

module.exports = { save, getByMember, updateStatus, updateBooking, getByDate, getByDateAndVenues, getLateCancellations, flagLateCancellation, waiveFee, getByReference };
