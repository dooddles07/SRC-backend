// controllers/webhookController.js
// Receives inbound webhook events FROM GHL (when automations fire back to us)

const bookingStore = require('../models/bookingStore');

const handleGhlEvent = async (req, res, next) => {
  try {
    // ── Simple secret guard ───────────────────────────────────────────────────
    const secret = process.env.GHL_WEBHOOK_SECRET;
    if (secret) {
      const provided = req.headers['x-ghl-secret'] || req.query.secret;
      if (provided !== secret) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }
    }

    const payload = req.body;

    // GHL sends the event type in different keys depending on the workflow config.
    // Common patterns: payload.event, payload.type, or a custom field you set.
    const eventType = payload.event || payload.type || 'unknown';

    console.log(`[GHL Inbound] Event: ${eventType}`, JSON.stringify(payload, null, 2));

    // ── Route to handler by event type ───────────────────────────────────────
    switch (eventType) {
      case 'no_show_confirmed':
        handleNoShow(payload);
        break;

      case 'feedback_sent':
        handleFeedbackSent(payload);
        break;

      case 'booking_status_update':
        handleStatusUpdate(payload);
        break;

      case 'pipeline_stage_changed':
        handlePipelineStageChange(payload);
        break;

      default:
        // Unknown event — still acknowledge so GHL doesn't retry
        console.log(`[GHL Inbound] Unhandled event type: "${eventType}"`);
    }

    // ── Always respond 200 immediately so GHL does not retry ─────────────────
    return res.status(200).json({ success: true, received: true, event: eventType });

  } catch (err) {
    next(err);
  }
};

// ─── Event handlers (extend these as your GHL workflows evolve) ──────────────

const handleNoShow = (payload) => {
  // payload should contain: booking_reference, email, slot_date, facility_or_venue
  // TODO: Persist to DB, push notification to staff dashboard, etc.
  console.log(`[GHL Event] No-show confirmed for booking: ${payload.booking_reference}`);
};

const handleFeedbackSent = (payload) => {
  // payload should contain: booking_reference, email
  console.log(`[GHL Event] Feedback sent for booking: ${payload.booking_reference}`);
};

const handleStatusUpdate = async (payload) => {
  // payload should contain: booking_reference, new_status
  const { booking_reference, new_status } = payload;
  if (!booking_reference || !new_status) return;
  await bookingStore.updateStatus(booking_reference, new_status);
  console.log(`[GHL Event] Status updated — ${booking_reference}: ${new_status}`);
};

const handlePipelineStageChange = (payload) => {
  // payload should contain: opportunity_id, pipeline_id, old_stage, new_stage, contact_id
  console.log(`[GHL Event] Pipeline stage changed: ${payload.opportunity_id} → ${payload.new_stage}`);
};

module.exports = { handleGhlEvent };
