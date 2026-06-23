require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session); 
const flash = require('connect-flash');
const helmet = require('helmet');
const mongoSanitize = require('mongo-sanitize');
const rateLimit = require('express-rate-limit');

const app = express();

// ==========================================
// 1. SECURITY & SANDBOXING MIDDLEWARE
// ==========================================
// Protect headers but allow Google Fonts and Bootstrap/FontAwesome CDNs
app.use(helmet({
    contentSecurityPolicy: false
}));

// Prevent NoSQL Injection attacks by cleaning incoming data keys
app.use((req, res, next) => {
    req.body = mongoSanitize(req.body);
    req.query = mongoSanitize(req.query);
    req.params = mongoSanitize(req.params);
    next();
});

// Configure Rate Limiter to mitigate brute force/DoS attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 30, // 30 requests per IP max for auth endpoints
    message: 'Too many auth requests, please try again after 15 minutes.'
});
app.use('/login', authLimiter);
app.use('/register', authLimiter);
app.use('/api/v1/auth', authLimiter); // Protect API auth from brute force too

// ==========================================
// 2. SETTINGS & BASIC MIDDLEWARE
// ==========================================
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));
app.use(express.json()); // For handling API/Ajax json requests
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 3. MONGODB CONNECTION
// ==========================================
const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/libaseikhlaq';
mongoose.connect(dbUri)
.then(() => console.log('✅ Successfully connected to MongoDB!'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ==========================================
// 4. SESSIONS & FLASH MESSAGES
// ==========================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'libaseikhlaq_super_secret_key_2026', 
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ url: dbUri }), 
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        secure: false, // Set to true if deploying over HTTPS
        sameSite: 'lax'
    } 
}));
app.use(flash());

// CSRF Protection Middleware
const { csrfSetup, csrfValidate } = require('./middleware/csrf');
app.use(csrfSetup);
app.use(csrfValidate);

app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null; 
    res.locals.session = req.session; // expose session directly to EJS views
    res.locals.success_msg = req.flash('success_msg'); 
    res.locals.error_msg = req.flash('error_msg');     
    next();
});

// ==========================================
// 4. IMPORT & MOUNT ROUTES (MVC Pattern)
// ==========================================
const storeRoutes = require('./routes/storeRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const apiRoutes = require('./routes/apiRoutes');

app.use('/', storeRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes); // Automatically prefixes all admin routes with /admin
app.use('/api/v1', apiRoutes);

// ==========================================
// 404 CATCH-ALL (must be AFTER all routes)
// ==========================================
app.use((req, res) => {
    res.status(404).render('error', {
        message: 'Page not found. The page you are looking for does not exist.',
        error: {}
    });
});


// ==========================================
// 5. CENTRAL ERROR HANDLING MIDDLEWARE
// ==========================================
app.use((err, req, res, next) => {
    console.error('❌ Unhandled Exception:', err);
    const statusCode = err.status || 500;
    const safeMessage = statusCode === 500
        ? 'An internal server error occurred. Please try again later.'
        : err.message;
    res.status(statusCode).render('error', {
        message: safeMessage,
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// ==========================================
// 6. START SERVER / EXPORT
// ==========================================
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;