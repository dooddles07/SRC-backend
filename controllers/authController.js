// controllers/authController.js
// Issues JWT tokens for authenticated members

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const ghlService = require('../models/ghlService');

// ── Dev-only member accounts (used when NODE_ENV=development) ─────────────────
// These let you test the API without needing real GHL contacts.
// Remove or ignore these in production — only GHL contacts will be used.
const DEV_MEMBERS = [
  {
    id:                'dev-001',
    membership_number: 'SRC-0001',
    email:             'alice.tan@src.com',
    firstName:         'Alice',
    lastName:          'Tan',
  },
  {
    id:                'dev-002',
    membership_number: 'SRC-0002',
    email:             'bob.lim@src.com',
    firstName:         'Bob',
    lastName:          'Lim',
  },
  {
    id:                'dev-003',
    membership_number: 'SRC-0003',
    email:             'carol.ng@src.com',
    firstName:         'Carol',
    lastName:          'Ng',
  },
];

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { membership_number, email } = req.body;
    let member = null;

    // ── Dev mode: check local accounts first ──────────────────────────────────
    if (process.env.NODE_ENV === 'development') {
      member = DEV_MEMBERS.find(
        (m) =>
          m.membership_number === membership_number &&
          m.email.toLowerCase() === email.toLowerCase()
      ) || null;
    }

    // ── Production (or dev fallback): look up in GHL ──────────────────────────
    if (!member) {
      const contacts = await ghlService.findContactsByMember(membership_number);
      const match = contacts.find(
        (c) => c.email && c.email.toLowerCase() === email.toLowerCase()
      );

      if (match) {
        member = {
          id:                match.id,
          membership_number: membership_number,
          email:             match.email,
          firstName:         match.firstName || '',
          lastName:          match.lastName  || '',
        };
      }
    }

    if (!member) {
      return res.status(401).json({
        success: false,
        message: 'Invalid membership number or email.',
      });
    }

    const fullName = `${member.firstName} ${member.lastName}`.trim();

    const token = jwt.sign(
      {
        id:                member.id,
        membership_number: member.membership_number,
        email:             member.email,
        name:              fullName,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(200).json({
      success: true,
      token,
      member: {
        membership_number: member.membership_number,
        email:             member.email,
        name:              fullName,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login };
