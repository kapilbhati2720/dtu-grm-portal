const auth = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // Built-in Node.js module
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parseUserDataFromEmail } = require('../utils/helpers');
const sendEmail = require('../utils/sendemail');

// @route   POST /api/auth/register
// @desc    Register a new user and send verification email
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Check for valid DTU/DCE domain
    if (!email.endsWith('@dtu.ac.in') && !email.endsWith('@dce.ac.in')) {
        return res.status(400).json({ msg: 'Please use a valid DTU email address.' });
    }
    
    // 2. Check if user already exists
    let user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length > 0) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // 3. Parse user data, hash password, create verification token
    const { fullName, rollNumber, admissionYear, branchCode } = parseUserDataFromEmail(email);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // 4. Save user with the verification token
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, roll_number, admission_year, branch_code, verification_token) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [fullName, email, passwordHash, rollNumber, admissionYear, branchCode, verificationToken]
    );

    // 5. Send verification email
    const verificationURL = `http://localhost:5000/api/auth/verify-email?token=${verificationToken}`;
    const message = `<p>Thank you for registering. Please click the link below to verify your email address:</p><p><a href="${verificationURL}">Verify My Email</a></p>`;

    await sendEmail({
      email: email,
      subject: 'GRM Portal - Email Verification',
      html: message,
    });

    res.status(201).json({ msg: 'Registration successful. Please check your email to verify your account.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/auth/verify-email
// @desc    Verify user's email
router.get('/verify-email', async (req, res) => {
    try {
        const token = req.query.token;
        const user = await pool.query("SELECT * FROM users WHERE verification_token = $1", [token]);

        if (user.rows.length === 0) {
            return res.status(400).send('<h1>Error</h1><p>Invalid or expired verification token. Please try registering again.</p>');
        }

        await pool.query(
            "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1",
            [token]
        );

        res.send('<h1>Email Verified Successfully!</h1><p>You can now close this tab and log in to the portal.</p>');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const userData = user.rows[0];

    // Check if account is verified
    if (!userData.is_verified) {
        return res.status(400).json({ msg: 'Please verify your email before logging in.' });
    }

    const isMatch = await bcrypt.compare(password, userData.password_hash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = {
      user: {
        id: userData.user_id,
        name: userData.full_name,
        email: userData.email,
        role: userData.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/auth
// @desc    Get logged-in user's data
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Updated SELECT statement to fetch all required details
    const user = await pool.query(
      "SELECT user_id, full_name, email, role, roll_number, admission_year, branch_code FROM users WHERE user_id = $1",
      [req.user.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;