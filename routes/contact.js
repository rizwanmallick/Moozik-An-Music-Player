const express = require('express');
const router = express.Router();
const supabase = require('../modules/supabase');

router.get('/', (req, res) => {
    res.sendFile('contact.html', { root: './views' });
});

router.post('/', async (req, res) => {
    const { username, email, phone, message } = req.body;

    if (!username || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    try {
        const { error } = await supabase.from('contact').insert({
            username,
            email,
            phone: phone || '',
            message,
        });

        if (error) throw error;

        res.json({ success: true, message: 'Thank you! Your message has been sent successfully.' });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ error: 'Could not send your message. Please try again later.' });
    }
});

module.exports = router;
