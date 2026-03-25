// models/ghlService.js
// Handles all communication with GHL (webhooks + API reads)

const axios = require('axios');
const ghlConfig = require('../config/ghl');

// ─── Helper: POST to a GHL inbound webhook ───────────────────────────────────
const postToWebhook = async (url, payload) => {
  if (!url) throw new Error('GHL webhook URL is not configured in .env');

  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });

  return response.data;
};

// ─── Helper: GHL API GET request ─────────────────────────────────────────────
const ghlApiGet = async (endpoint, params = {}) => {
  const response = await axios.get(`${ghlConfig.api.baseUrl}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${ghlConfig.api.key}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
    },
    params,
    timeout: 10000,
  });

  return response.data;
};

// ─── Helper: GHL API POST request ────────────────────────────────────────────
const ghlApiPost = async (endpoint, payload = {}) => {
  const response = await axios.post(`${ghlConfig.api.baseUrl}${endpoint}`, payload, {
    headers: {
      Authorization: `Bearer ${ghlConfig.api.key}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
    },
    timeout: 10000,
  });

  return response.data;
};

// ─── Helper: GHL API PUT request ─────────────────────────────────────────────
const ghlApiPut = async (endpoint, payload = {}) => {
  const response = await axios.put(`${ghlConfig.api.baseUrl}${endpoint}`, payload, {
    headers: {
      Authorization: `Bearer ${ghlConfig.api.key}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
    },
    timeout: 10000,
  });

  return response.data;
};

// ─── Webhook #1: New Booking (FORM-01) ───────────────────────────────────────
const sendBooking = async (data) => {
  const payload = {
    email:                data.email,
    phone:                data.phone,
    name:                 data.name,
    membership_number:    data.membership_number,
    facility_or_venue:    data.facility_or_venue,
    booking_shift:        data.booking_shift || '',
    slot_date:            data.slot_date,
    slot_start_time:      data.slot_start_time,
    slot_end_time:        data.slot_end_time,
    outlet_pax:           data.outlet_pax,
    booking_reference:    data.booking_reference,
    booking_type:         data.booking_type || 'advance',
    cancellation_deadline: data.cancellation_deadline,
    overdue_check_at:     data.overdue_check_at,
    no_show_check_at:     data.no_show_check_at,
    feedback_send_at:     data.feedback_send_at,
  };

  return postToWebhook(ghlConfig.webhooks.booking, payload);
};

// ─── Webhook #2: Cancellation (FORM-02) ──────────────────────────────────────
const sendCancellation = async (data) => {
  const payload = {
    email:             data.email,
    booking_reference: data.booking_reference,
  };

  return postToWebhook(ghlConfig.webhooks.cancellation, payload);
};

// ─── Webhook #3: Guest Registration (FORM-03) ────────────────────────────────
const sendGuestRegistration = async (data) => {
  const payload = {
    email:              data.email,
    guest_name:         data.guest_name,
    guest_email:        data.guest_email,
    guest_phone:        data.guest_phone || '',
    inviting_member_id: data.inviting_member_id,
    slot_date:          data.slot_date,
    facility_or_venue:  data.facility_or_venue,
  };

  return postToWebhook(ghlConfig.webhooks.guestRegistration, payload);
};

// ─── Webhook #4: Walk-In (STAFF-01) ──────────────────────────────────────────
const sendWalkin = async (data) => {
  const payload = {
    name:              data.name,
    phone:             data.phone || '',
    facility:          data.facility,
    pax:               data.pax,
    staff_id:          data.staff_id,
  };

  return postToWebhook(ghlConfig.webhooks.walkin, payload);
};

// ─── Webhook #5: Check-In (SHARED-07) ────────────────────────────────────────
const sendCheckin = async (data) => {
  const payload = {
    email:             data.email,
    booking_reference: data.booking_reference,
    checked_in_by:     data.checked_in_by,
  };

  return postToWebhook(ghlConfig.webhooks.checkin, payload);
};

// ─── GHL API: Find contact by booking_reference (for check-in validation) ────
const findContactByReference = async (booking_reference) => {
  const data = await ghlApiGet('/contacts/search', {
    locationId: ghlConfig.api.locationId,
    query:      booking_reference,
  });

  // Return first matching contact
  const contacts = data.contacts || [];
  return contacts.find(
    (c) => c.customFields?.find(
      (f) => f.fieldKey === 'booking_reference' && f.value === booking_reference
    )
  ) || null;
};

// ─── GHL API: List all pipelines for this location ───────────────────────────
const getPipelines = async () => {
  const data = await ghlApiGet('/opportunities/pipelines', {
    locationId: ghlConfig.api.locationId,
  });
  return data.pipelines || [];
};

// ─── GHL API: Search opportunities (optionally filter by pipeline/stage) ─────
const getOpportunities = async ({ pipelineId, stageId, status, limit = 20, startAfter } = {}) => {
  const params = {
    location_id: ghlConfig.api.locationId,
  };
  if (pipelineId)  params.pipeline_id       = pipelineId;
  if (stageId)     params.pipeline_stage_id  = stageId;
  if (status)      params.status             = status;
  if (limit)       params.limit              = limit;
  if (startAfter)  params.startAfter         = startAfter;

  const data = await ghlApiGet('/opportunities/search', params);
  return {
    opportunities: data.opportunities || [],
    meta:          data.meta          || {},
  };
};

// ─── GHL API: Create a new opportunity ───────────────────────────────────────
const createOpportunity = async ({ pipelineId, pipelineStageId, contactId, name, status = 'open', monetaryValue }) => {
  const payload = {
    pipelineId,
    locationId:      ghlConfig.api.locationId,
    name,
    pipelineStageId,
    status,
    contactId,
  };
  if (monetaryValue !== undefined) payload.monetaryValue = monetaryValue;

  return ghlApiPost('/opportunities/', payload);
};

// ─── GHL API: Move opportunity to a different pipeline stage ─────────────────
const updateOpportunityStage = async (opportunityId, { pipelineStageId, status }) => {
  const payload = { pipelineStageId };
  if (status) payload.status = status;

  return ghlApiPut(`/opportunities/${opportunityId}`, payload);
};

// ─── GHL API: Find contacts by membership_number custom field ─────────────────
const findContactsByMember = async (membership_number) => {
  const data = await ghlApiGet('/contacts/search', {
    locationId: ghlConfig.api.locationId,
    query:      membership_number,
  });

  const contacts = data.contacts || [];
  return contacts.filter(
    (c) => c.customFields?.find(
      (f) => f.fieldKey === 'membership_number' && f.value === String(membership_number)
    )
  );
};

// ─── GHL API: Get a single contact by ID ─────────────────────────────────────
const getContactById = async (contactId) => {
  const data = await ghlApiGet(`/contacts/${contactId}`);
  return data.contact || null;
};

module.exports = {
  sendBooking,
  sendCancellation,
  sendGuestRegistration,
  sendWalkin,
  sendCheckin,
  findContactByReference,
  getPipelines,
  getOpportunities,
  createOpportunity,
  updateOpportunityStage,
  findContactsByMember,
  getContactById,
};
