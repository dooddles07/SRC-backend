// controllers/managementController.js
// All management dashboard endpoints — reads from MongoDB, writes to GHL + MongoDB.

const ghlService   = require('../models/ghlService');
const bookingStore = require('../models/bookingStore');

const todaySGT = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });

// ── Venue capacity config ────────────────────────────────────────────────────
const VENUE_CAPACITY = {
  'Tennis':            { cap: 4, type: 'slot' },       // 4 courts, 1 booking/slot each
  'Squash':            { cap: 1, type: 'slot' },
  'Gym':               { cap: 20, type: 'pax' },
  'Le Mansion':        { cap: 15, buffer: 3, type: 'booking' },
  'Barkerslounge':     { cap: 10, buffer: 2, type: 'booking' },
  'Oasis':             { cap: 12, buffer: 2, type: 'booking' },
};

// Total slot capacity across all venues for utilisation %
const TOTAL_DAILY_CAPACITY = 4 + 1 + 20 + 15 + 15 + 10 + 12; // Tennis(4) + Squash(1) + Gym(20) + LeMansion Lunch(15) + Dinner(15) + Barkers(10) + Oasis(12) = 77

// ── GET /api/management/dashboard ────────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const date = todaySGT();
    const bookings = await bookingStore.getByDate(date);
    const lateCancellations = await bookingStore.getLateCancellations();

    const total      = bookings.length;
    const checkedIn  = bookings.filter(b => /^checked.?in$/i.test(b.booking_status)).length;
    const noShows    = bookings.filter(b => /^no.?show$/i.test(b.booking_status)).length;
    const cancelled  = bookings.filter(b => /^cancelled$/i.test(b.booking_status)).length;
    const lateCancel = lateCancellations.length;
    const guests     = bookings.filter(b => b.booking_type === 'guest_pass').length;

    // Utilisation: (confirmed + checked_in) / total capacity
    const active = bookings.filter(b =>
      /^confirmed$/i.test(b.booking_status) || /^checked.?in$/i.test(b.booking_status)
    ).length;
    const utilisation = TOTAL_DAILY_CAPACITY > 0
      ? Math.round((active / TOTAL_DAILY_CAPACITY) * 100)
      : 0;

    return res.json({
      success: true,
      date,
      kpis: { total, checkedIn, noShows, cancelled, lateCancel, guests, utilisation },
    });
  } catch (err) { next(err); }
};

// ── GET /api/management/schedule ─────────────────────────────────────────────
const getSchedule = async (req, res, next) => {
  try {
    const date = todaySGT();
    const bookings = await bookingStore.getByDate(date);
    return res.json({ success: true, date, count: bookings.length, bookings });
  } catch (err) { next(err); }
};

// ── GET /api/management/occupancy ────────────────────────────────────────────
const getOccupancy = async (req, res, next) => {
  try {
    const date     = todaySGT();
    const bookings = await bookingStore.getByDate(date);

    // Only count active bookings (confirmed + checked_in)
    const active = bookings.filter(b =>
      /^confirmed$/i.test(b.booking_status) || /^checked.?in$/i.test(b.booking_status)
    );

    // Tennis courts — assume bookings have facility_or_venue = "Tennis" (shared)
    const tennis = active.filter(b => /tennis/i.test(b.facility_or_venue));
    const squash = active.filter(b => /squash/i.test(b.facility_or_venue));
    const gym    = active.filter(b => /gym/i.test(b.facility_or_venue));

    const gymPax = gym.reduce((sum, b) => sum + (parseInt(b.outlet_pax) || 1), 0);

    // F&B — split by shift
    const leMansion = active.filter(b => /le.?mansion/i.test(b.facility_or_venue));
    const leMansionLunch  = leMansion.filter(b => /lunch/i.test(b.booking_shift));
    const leMansionDinner = leMansion.filter(b => /dinner/i.test(b.booking_shift));

    const barkers = active.filter(b => /barker/i.test(b.facility_or_venue));
    const oasis   = active.filter(b => /oasis/i.test(b.facility_or_venue));

    return res.json({
      success: true,
      date,
      venues: {
        tennis:           { count: tennis.length, cap: 4 },
        squash:           { count: squash.length, cap: 1 },
        gym:              { count: gymPax, cap: 20 },
        leMansionLunch:   { count: leMansionLunch.length, cap: 15, buffer: 3 },
        leMansionDinner:  { count: leMansionDinner.length, cap: 15, buffer: 3 },
        barkers:          { count: barkers.length, cap: 10, buffer: 2 },
        oasis:            { count: oasis.length, cap: 12, buffer: 2 },
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/management/analytics ────────────────────────────────────────────
// Returns all bookings — client-side filtering
const getAnalytics = async (req, res, next) => {
  try {
    const bookings = await bookingStore.getAllBookings();
    return res.json({ success: true, count: bookings.length, bookings });
  } catch (err) { next(err); }
};

// ── GET /api/management/no-shows ─────────────────────────────────────────────
const getNoShows = async (req, res, next) => {
  try {
    const bookings = await bookingStore.getNoShows();

    // Group by membership_number
    const map = {};
    for (const b of bookings) {
      const key = b.membership_number;
      if (!map[key]) {
        map[key] = {
          name: b.name,
          membership_number: key,
          count: 0,
          mostRecent: b.slot_date,
          facility: b.facility_or_venue,
        };
      }
      map[key].count++;
      if (b.slot_date > map[key].mostRecent) {
        map[key].mostRecent = b.slot_date;
        map[key].facility   = b.facility_or_venue;
      }
    }

    const members = Object.values(map).sort((a, b) => b.count - a.count);
    return res.json({ success: true, count: members.length, members });
  } catch (err) { next(err); }
};

// ── GET /api/management/guests ───────────────────────────────────────────────
const getGuests = async (req, res, next) => {
  try {
    const now   = new Date();
    const year  = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric' });
    const month = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore', month: '2-digit' });
    const monthStart = `${year}-${month}-01`;
    const monthEnd   = `${year}-${month}-31`;

    const passes = await bookingStore.getGuestPasses(monthStart, monthEnd);

    // Group by inviting member (membership_number as proxy)
    const map = {};
    for (const p of passes) {
      const key = p.membership_number;
      if (!map[key]) {
        map[key] = {
          name: p.name,
          membership_number: key,
          quota: 4,           // default tier quota
          used: 0,
          guests: {},
          records: [],
        };
      }
      map[key].used++;
      // Track same-guest (by guest name in notes or name field)
      const guestName = p.notes || p.name || 'Unknown';
      map[key].guests[guestName] = (map[key].guests[guestName] || 0) + 1;
      map[key].records.push(p);
    }

    const members = Object.values(map).map(m => ({
      ...m,
      sameGuestMax: Math.max(...Object.values(m.guests), 0),
      guests: undefined,
      records: m.records,
    }));

    return res.json({ success: true, count: members.length, members });
  } catch (err) { next(err); }
};

// ── GET /api/management/fees ─────────────────────────────────────────────────
const getFees = async (req, res, next) => {
  try {
    const bookings = await bookingStore.getAllLateCancellations();
    return res.json({ success: true, count: bookings.length, bookings });
  } catch (err) { next(err); }
};

// ── GET /api/management/blocks ───────────────────────────────────────────────
const getBlocks = async (req, res, next) => {
  try {
    const today  = todaySGT();
    let blocks   = await bookingStore.getBlocks();
    // Only current + future blocks
    blocks = blocks.filter(b => b.slot_date >= today);
    return res.json({ success: true, count: blocks.length, blocks });
  } catch (err) { next(err); }
};

// ── POST /api/management/blocks ──────────────────────────────────────────────
const createBlock = async (req, res, next) => {
  try {
    const { facility, date, startTime, endTime, reason } = req.body;
    if (!facility || !date || !startTime || !endTime || !reason) {
      return res.status(422).json({ success: false, message: 'All fields are required.' });
    }

    const booking_reference = `BLK-${Date.now()}`;
    const block = {
      booking_reference,
      membership_number: 'MGMT',
      email: `block+${Date.now()}@src.internal`,
      name: `BLOCK: ${reason}`,
      facility_or_venue: facility,
      booking_type: 'block',
      booking_status: 'Confirmed',
      slot_date: date,
      slot_start_time: startTime,
      slot_end_time: endTime,
      outlet_pax: '0',
      notes: reason,
    };

    await bookingStore.save(block);

    // Also send to GHL webhook so it syncs
    try {
      await ghlService.sendBooking({
        ...block,
        phone: '',
        calendar_id: '',
        booking_shift: '',
        special_request: reason,
        cancellation_deadline: '',
        overdue_check_at: '',
        no_show_check_at: '',
        feedback_send_at: '',
        slot_time: startTime,
      });
    } catch (_) { /* GHL sync is best-effort */ }

    return res.json({ success: true, message: 'Block created.', booking_reference });
  } catch (err) { next(err); }
};

// ── DELETE /api/management/blocks/:booking_reference ─────────────────────────
const removeBlock = async (req, res, next) => {
  try {
    const { booking_reference } = req.params;
    await bookingStore.updateStatus(booking_reference, 'Cancelled');

    // Update GHL too
    try {
      const contact = await ghlService.findContactByReference(booking_reference);
      if (contact) {
        await ghlService.updateContactCustomFields(contact.id, [
          { id: 'booking_status', field_value: 'Cancelled' },
        ]);
      }
    } catch (_) { /* best-effort */ }

    return res.json({ success: true, message: 'Block removed. Slot is now available.' });
  } catch (err) { next(err); }
};

// ── PUT /api/management/override-status ──────────────────────────────────────
const overrideStatus = async (req, res, next) => {
  try {
    const { booking_reference, new_status } = req.body;
    if (!booking_reference || !new_status) {
      return res.status(422).json({ success: false, message: 'booking_reference and new_status required.' });
    }

    await bookingStore.updateStatus(booking_reference, new_status);

    // Sync to GHL
    try {
      const contact = await ghlService.findContactByReference(booking_reference);
      if (contact) {
        await ghlService.updateContactCustomFields(contact.id, [
          { id: 'booking_status', field_value: new_status },
        ]);
      }
    } catch (_) { /* best-effort */ }

    return res.json({ success: true, message: `Status updated to ${new_status}.` });
  } catch (err) { next(err); }
};

// ── POST /api/management/add-note ────────────────────────────────────────────
const addNote = async (req, res, next) => {
  try {
    const { booking_reference, note } = req.body;
    if (!booking_reference || !note) {
      return res.status(422).json({ success: false, message: 'booking_reference and note required.' });
    }

    // Add note to GHL contact
    try {
      const contact = await ghlService.findContactByReference(booking_reference);
      if (contact) {
        await ghlService.addContactNote(contact.id, note);
      }
    } catch (_) { /* best-effort */ }

    return res.json({ success: true, message: 'Note saved.' });
  } catch (err) { next(err); }
};

// ── PUT /api/management/mark-paid ────────────────────────────────────────────
const markPaid = async (req, res, next) => {
  try {
    const { booking_reference } = req.body;
    if (!booking_reference) {
      return res.status(422).json({ success: false, message: 'booking_reference required.' });
    }

    await bookingStore.markFeePaid(booking_reference, req.mgmt.username);

    try {
      const contact = await ghlService.findContactByReference(booking_reference);
      if (contact) {
        await ghlService.updateContactCustomFields(contact.id, [
          { id: 'booking_status', field_value: 'late_fee_paid' },
        ]);
      }
    } catch (_) { /* best-effort */ }

    return res.json({ success: true, message: 'Marked as paid.' });
  } catch (err) { next(err); }
};

// ── PUT /api/management/waive-fee ────────────────────────────────────────────
const waiveFee = async (req, res, next) => {
  try {
    const { booking_reference, waiver_reason } = req.body;
    if (!booking_reference || !waiver_reason) {
      return res.status(422).json({ success: false, message: 'booking_reference and waiver_reason required.' });
    }

    const waiver_by = req.mgmt.username;
    await bookingStore.waiveFee(booking_reference, waiver_reason, waiver_by);

    try {
      const contact = await ghlService.findContactByReference(booking_reference);
      if (contact) {
        await ghlService.updateContactCustomFields(contact.id, [
          { id: 'N1P00iQI8CNFUfh2BzUN', field_value: 'true' },
          { id: 'SsjDZhq4Fe9gcaAnVEpo', field_value: waiver_reason },
          { id: 'Q2YmvIjxUJliP9Yah51r', field_value: waiver_by },
        ]);
      }
    } catch (_) { /* best-effort */ }

    return res.json({ success: true, message: 'Fee waived.' });
  } catch (err) { next(err); }
};

// ── POST /api/management/flag-member ─────────────────────────────────────────
const flagMember = async (req, res, next) => {
  try {
    const { membership_number } = req.body;
    if (!membership_number) {
      return res.status(422).json({ success: false, message: 'membership_number required.' });
    }

    try {
      const contacts = await ghlService.findContactsByMember(membership_number);
      if (contacts.length > 0) {
        await ghlService.addContactTags(contacts[0].id, ['management_flag']);
        await ghlService.addContactNote(contacts[0].id,
          `Flagged by management (${req.mgmt.displayName}) for repeated no-shows.`
        );
      }
    } catch (_) { /* best-effort */ }

    return res.json({ success: true, message: 'Member flagged.' });
  } catch (err) { next(err); }
};

// ── PUT /api/management/adjust-quota ─────────────────────────────────────────
const adjustQuota = async (req, res, next) => {
  try {
    const { membership_number, new_quota } = req.body;
    if (!membership_number || new_quota === undefined) {
      return res.status(422).json({ success: false, message: 'membership_number and new_quota required.' });
    }

    try {
      const contacts = await ghlService.findContactsByMember(membership_number);
      if (contacts.length > 0) {
        await ghlService.updateContactCustomFields(contacts[0].id, [
          { id: 'guest_quota_override', field_value: String(new_quota) },
        ]);
        await ghlService.addContactNote(contacts[0].id,
          `Guest quota adjusted to ${new_quota} by management (${req.mgmt.displayName}).`
        );
      }
    } catch (_) { /* best-effort */ }

    return res.json({ success: true, message: `Quota adjusted to ${new_quota}.` });
  } catch (err) { next(err); }
};

// ── GET /api/management/contact/:booking_reference ───────────────────────────
// Full GHL contact record for the "View Full Record" modal
const getFullRecord = async (req, res, next) => {
  try {
    const { booking_reference } = req.params;

    // First get from MongoDB for quick response
    const booking = await bookingStore.getByReference(booking_reference);

    // Try to get full GHL record
    let ghlContact = null;
    try {
      const contact = await ghlService.findContactByReference(booking_reference);
      if (contact) {
        ghlContact = await ghlService.getContactById(contact.id);
      }
    } catch (_) { /* best-effort */ }

    return res.json({ success: true, booking, ghlContact });
  } catch (err) { next(err); }
};

module.exports = {
  getDashboard, getSchedule, getOccupancy, getAnalytics, getNoShows, getGuests,
  getFees, getBlocks, createBlock, removeBlock, overrideStatus, addNote,
  markPaid, waiveFee, flagMember, adjustQuota, getFullRecord,
};
