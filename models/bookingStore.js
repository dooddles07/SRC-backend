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
  return Booking.find({ membership_number }).sort({ createdAt: -1 }).lean();
}

async function updateStatus(booking_reference, booking_status) {
  const result = await Booking.findOneAndUpdate(
    { booking_reference },
    { booking_status }
  );
  return !!result;
}

module.exports = { save, getByMember, updateStatus };
