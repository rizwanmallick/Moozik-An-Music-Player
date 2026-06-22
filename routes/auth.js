const express = require('express');
const router = express.Router();
const supabase = require('../modules/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { safeRedirectPath } = require('../modules/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

router.get('/', (req, res) => {
  res.sendFile('auth.html', { root: './views' });
});

router.post('/signup', async (req, res) => {
  const { username, email, password, next } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from('user').insert({ username, email, password: hashedPassword });

    if (error) {
      throw error;
    }

    const token = jwt.sign({ sub: email, username }, JWT_SECRET, { expiresIn: '1d' });

    res.cookie('userToken', token, { httpOnly: true, sameSite: 'lax', maxAge: 86400000 });
    res.cookie('userData', JSON.stringify({ username, email }), { httpOnly: true, sameSite: 'lax', maxAge: 86400000 });
    res.redirect(302, safeRedirectPath(next || '/chat/lobby'));

  } catch (error) {
    console.error('Error signing up:', error);
    const message = error.code === '23505' || error.message?.includes('duplicate')
      ? 'This email is already registered. Try signing in.'
      : 'Sign-up failed. Please try again.';
    return res.status(400).json({ error: message });
  }
});

router.post('/signin', async (req, res) => {
  const { email, password, next } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const { data: users, error } = await supabase
      .from('user')
      .select('*')
      .eq('email', email);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error fetching user data. Please try again.' });
    }

    if (!users || !users.length) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];
    const match = await bcrypt.compare(password, user.password || '');
    if (!match) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ sub: user.email, username: user.username }, JWT_SECRET, { expiresIn: '1d' });

    res.cookie('userToken', token, { httpOnly: true, sameSite: 'lax', maxAge: 86400000 });
    res.cookie('userData', JSON.stringify({ username: user.username, email: user.email }), { httpOnly: true, sameSite: 'lax', maxAge: 86400000 });
    res.redirect(302, safeRedirectPath(next || '/chat/lobby'));

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

router.get('/signout', (req, res) => {
  try {
    res.clearCookie('userToken');
    res.clearCookie('userData');
  } catch (e) {}
  res.redirect('/auth');
});

module.exports = router;
