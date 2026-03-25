// controllers/authController.js
// Issues JWT tokens for authenticated members

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const ghlService = require('../models/ghlService');

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { membership_number, email } = req.body;

    // Look up the member in GHL by membership_number
    const contacts = await ghlService.findContactsByMember(membership_number);

    // Find the contact whose email also matches
    const member = contacts.find(
      (c) => c.email && c.email.toLowerCase() === email.toLowerCase()
    );

    if (!member) {
      return res.status(401).json({
        success: false,
        message: 'Invalid membership number or email.',
      });
    }

    const token = jwt.sign(
      {
        id:                member.id,
        membership_number: membership_number,
        email:             member.email,
        name:              `${member.firstName || ''} ${member.lastName || ''}`.trim(),
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(200).json({
      success: true,
      token,
      member: {
        membership_number,
        email:  member.email,
        name:   `${member.firstName || ''} ${member.lastName || ''}`.trim(),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login };
