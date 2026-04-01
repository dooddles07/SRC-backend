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

// ── Management-specific queries ──────────────────────────────────────────────

async function getAllBookings(filter = {}) {
  return Booking.find(filter).sort({ slot_date: -1, slot_start_time: 1 }).lean();
}

async function getNoShows() {
  return Booking.find({ booking_status: { $regex: /^no.?show$/i } }).sort({ updatedAt: -1 }).lean();
}

async function getGuestPasses(monthStart, monthEnd) {
  return Booking.find({
    booking_type: 'guest_pass',
    slot_date: { $gte: monthStart, $lte: monthEnd },
  }).sort({ slot_date: -1 }).lean();
}

async function getBlocks() {
  return Booking.find({
    booking_type: 'block',
    booking_status: { $regex: /^confirmed$/i },
  }).sort({ slot_date: 1, slot_start_time: 1 }).lean();
}

async function getExpiredBlocks(nowDate, nowTime) {
  return Booking.find({
    booking_type:    'block',
    booking_status:  { $regex: /^confirmed$/i },
    expiry_notified: { $ne: true },
    $or: [
      { slot_date: { $lt: nowDate } },
      { slot_date: nowDate, slot_end_time: { $lte: nowTime } },
    ],
  }).lean();
}

async function markBlockExpired(booking_reference) {
  return Booking.findOneAndUpdate(
    { booking_reference },
    { expiry_notified: true }
  );
}

async function updateBlock(booking_reference, updates) {
  const allowed = ['facility_or_venue', 'slot_date', 'slot_start_time', 'slot_end_time', 'notes'];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }
  // Keep the name field in sync with reason
  if (filtered.notes) filtered.name = `BLOCK: ${filtered.notes}`;
  return Booking.findOneAndUpdate(
    { booking_reference, booking_type: 'block' },
    filtered,
    { new: true }
  ).lean();
}

async function getAllLateCancellations() {
  return Booking.find({ late_cancellation: true }).sort({ updatedAt: -1 }).lean();
}

async function markFeePaid(booking_reference, actioned_by) {
  return Booking.findOneAndUpdate(
    { booking_reference },
    { booking_status: 'late_fee_paid', waiver_by: actioned_by },
    { new: true }
  );
}

// ── Auto-expire past confirmed bookings → "Done" ────────────────────────────
async function markPastConfirmedDone(nowDate, nowTime) {
  const result = await Booking.updateMany(
    {
      booking_status: { $regex: /^confirmed$/i },
      booking_type:   { $nin: ['block'] },
      $or: [
        { slot_date: { $lt: nowDate } },
        { slot_date: nowDate, slot_end_time: { $ne: null, $lte: nowTime } },
      ],
    },
    { booking_status: 'Done' }
  );
  return result.modifiedCount || 0;
}

module.exports = {
  save, getByMember, updateStatus, updateBooking, getByDate, getByDateAndVenues,
  getLateCancellations, flagLateCancellation, waiveFee, getByReference,
  getAllBookings, getNoShows, getGuestPasses, getBlocks, getExpiredBlocks, markBlockExpired, updateBlock, getAllLateCancellations, markFeePaid,
  markPastConfirmedDone,
};
