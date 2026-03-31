// controllers/managementAuthController.js
// Management dashboard accounts — separate from staff portal.
// To add/change accounts: edit MANAGEMENT_ACCOUNTS and redeploy.

const jwt = require('jsonwebtoken');

// ── Management account list ──────────────────────────────────────────────────
const MANAGEMENT_ACCOUNTS = [
  { username: 'nick', password: 'Nick123', displayName: 'Nick' },
];

const managementLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(422).json({ success: false, message: 'Username and password are required.' });
    }

    const account = MANAGEMENT_ACCOUNTS.find(
      (a) => a.username === username.toLowerCase().trim()
    );

    if (!account || account.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      {
        username:    account.username,
        role:        'management',
        displayName: account.displayName,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        username:    account.username,
        role:        'management',
        displayName: account.displayName,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { managementLogin };
