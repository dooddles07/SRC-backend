// controllers/staffAuthController.js
// Staff accounts are declared here — no DB registration needed.
// To add/change accounts: edit STAFF_ACCOUNTS and redeploy.

const jwt = require('jsonwebtoken');

// ── Staff account list ────────────────────────────────────────────────────────
// Roles: frontdesk → staff.html | security → staff-qr.html | fnb → staff-fnb.html
const STAFF_ACCOUNTS = [
  { username: 'frontdesk1',  password: 'SRC@Desk1',  role: 'frontdesk', displayName: 'Front Desk 1'  },
  { username: 'frontdesk2',  password: 'SRC@Desk2',  role: 'frontdesk', displayName: 'Front Desk 2'  },
  { username: 'frontdesk3',  password: 'SRC@Desk3',  role: 'frontdesk', displayName: 'Front Desk 3'  },
  { username: 'security1',   password: 'SRC@Sec1',   role: 'security',  displayName: 'Security 1'    },
  { username: 'fnb_manager', password: 'SRC@FnB1',   role: 'fnb',       displayName: 'F&B Manager'   },
];

const staffLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(422).json({ success: false, message: 'Username and password are required.' });
    }

    const account = STAFF_ACCOUNTS.find(
      (a) => a.username === username.toLowerCase().trim()
    );

    if (!account || account.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      {
        username:    account.username,
        role:        account.role,
        displayName: account.displayName,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(200).json({
      success: true,
      token,
      staff: {
        username:    account.username,
        role:        account.role,
        displayName: account.displayName,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { staffLogin };
