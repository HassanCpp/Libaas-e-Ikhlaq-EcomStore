const crypto = require('crypto');

// Generate and expose CSRF token
const csrfSetup = (req, res, next) => {
    // If there is no session (e.g. static files before session middleware), skip
    if (!req.session) return next();

    // Generate token if it doesn't exist in session
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    }

    // Expose to views
    res.locals.csrfToken = req.session.csrfToken;
    next();
};

// Validate CSRF token for state-changing requests
const csrfValidate = (req, res, next) => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    
    // 1. Skip safe methods
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // 2. Skip API routes (they are JWT-protected and stateless)
    if (req.path.startsWith('/api/')) {
        return next();
    }

    // 3. Retrieve token from request body, query, or headers
    const clientToken = req.body._csrf || 
                        req.query._csrf || 
                        req.headers['x-csrf-token'] || 
                        req.headers['x-xsrf-token'];

    const serverToken = req.session ? req.session.csrfToken : null;

    // 4. Compare tokens
    if (!serverToken || !clientToken || clientToken !== serverToken) {
        console.warn(`🛡️ CSRF Blocked: Method: ${req.method}, Path: ${req.path}, IP: ${req.ip}`);
        return res.status(403).render('error', {
            message: 'Cross-Site Request Forgery validation failed. Invalid or missing CSRF token.',
            error: {}
        });
    }

    next();
};

module.exports = { csrfSetup, csrfValidate };
