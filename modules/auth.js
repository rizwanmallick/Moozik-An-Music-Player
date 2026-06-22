const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function parseCookies(cookieString) {
    const cookies = {};
    (cookieString || '').split(';').forEach(cookie => {
        const [name, ...rest] = cookie.split('=');
        const value = rest.join('=').trim();
        if (!name || !value) return;
        cookies[name.trim()] = decodeURIComponent(value);
    });
    return cookies;
}

function verifyTokenFromCookie(cookieString) {
    try {
        const cookies = parseCookies(cookieString || '');
        if (!cookies.userToken) return null;
        return jwt.verify(cookies.userToken, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

function requireAuth(req, res, next) {
    const tokenPayload = verifyTokenFromCookie(req.headers.cookie || '');
    if (!tokenPayload || !tokenPayload.username) {
        const nextUrl = encodeURIComponent(req.originalUrl);
        return res.redirect(`/auth?next=${nextUrl}`);
    }
    req.user = tokenPayload;
    next();
}

function requireAuthApi(req, res, next) {
    const tokenPayload = verifyTokenFromCookie(req.headers.cookie || '');
    if (!tokenPayload || !tokenPayload.username) {
        return res.status(401).json({ error: 'Please sign in to continue' });
    }
    req.user = tokenPayload;
    next();
}

function safeRedirectPath(path) {
    if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) {
        return path;
    }
    return '/chat/lobby';
}

module.exports = {
    JWT_SECRET,
    parseCookies,
    verifyTokenFromCookie,
    requireAuth,
    requireAuthApi,
    safeRedirectPath,
};
