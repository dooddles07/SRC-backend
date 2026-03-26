// controllers/staffController.js

const ghlService   = require('../models/ghlService');
const bookingStore = require('../models/bookingStore');

// ── Helper: today's date in Singapore timezone (YYYY-MM-DD) ──────────────────
const todaySGT = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });

// ── GET /api/staff/schedule ───────────────────────────────────────────────────
const getSchedule = async (req, res, next) => {
  try {
    const date  = todaySGT();
    let bookings = await bookingStore.getByDate(date);

    const { type, venue } = req.query;
    if (type)  bookings = bookings.filter((b) => b.booking_type  === type);
    if (venue) bookings = bookings.filter((b) => b.facility_or_venue === venue);

    return res.status(200).json({ success: true, date, count: bookings.length, bookings });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/staff/fnb ────────────────────────────────────────────────────────
const getFnbBookings = async (req, res, next) => {
  try {
    const date      = todaySGT();
    const FNB_VENUES = ['Le_mansion', 'Barkerslounge', 'Oasis', 'Le Mansion', "Barker's Lounge"];
    let bookings     = await bookingStore.getByDateAndVenues(date, FNB_VENUES);

    const { venue, shift } = req.query;
    if (venue) bookings = bookings.filter((b) => b.facility_or_venue === venue);
    if (shift) bookings = bookings.filter((b) => b.booking_shift    === shift);

    return res.status(200).json({ success: true, date, count: bookings.length, bookings });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/staff/member/:membership_number ──────────────────────────────────
const searchMember = async (req, res, next) => {
  try {
    const { membership_number } = req.params;
    const contacts = await ghlService.findContactsByMember(membership_number);

    if (!contacts || contacts.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const contact  = contacts[0];
    const getField = (key) =>
      contact.customFields?.find((f) => f.fieldKey === `contact.${key}`)?.value || null;

    const date          = todaySGT();
    const allToday      = await bookingStore.getByDate(date);
    const todaysBookings = allToday.filter((b) => b.membership_number === membership_number);

    return res.status(200).json({
      success: true,
      contact: {
        id:                contact.id,
        name:              `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        membership_number,
        membership_tier:   getField('membership_tier'),
        email:             contact.email,
        phone:             contact.phone,
      },
      todays_bookings: todaysBookings,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/staff/late-cancellations ─────────────────────────────────────────
const getLateCancellations = async (req, res, next) => {
  try {
    const bookings = await bookingStore.getLateCancellations();
    return res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/staff/waive-fee ─────────────────────────────────────────────────
const waiveFee = async (req, res, next) => {
  try {
    const { booking_reference, waiver_reason } = req.body;
    if (!booking_reference || !waiver_reason) {
      return res.status(422).json({ success: false, message: 'booking_reference and waiver_reason are required.' });
    }

    const waiver_by = req.staff.username;
    await bookingStore.waiveFee(booking_reference, waiver_reason, waiver_by);

    // Update GHL contact fields
    const contact = await ghlService.findContactByReference(booking_reference);
    if (contact) {
      await ghlService.updateContactCustomFields(contact.id, [
        { id: 'N1P00iQI8CNFUfh2BzUN', field_value: 'true'          },
        { id: 'SsjDZhq4Fe9gcaAnVEpo', field_value: waiver_reason    },
        { id: 'Q2YmvIjxUJliP9Yah51r', field_value: waiver_by        },
      ]);
    }

    return res.status(200).json({ success: true, message: 'Fee waived.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSchedule, getFnbBookings, searchMember, getLateCancellations, waiveFee };
