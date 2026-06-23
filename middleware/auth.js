module.exports = {
    // 1. The Logged-In Bouncer
    isLoggedIn: function(req, res, next) {
        if (req.session.user) {
            return next(); // User has a session badge, let them through
        }
        // No badge? Flash an error and kick them to the login page
        req.flash('error_msg', 'Please log in to access this page.');
        res.redirect('/login');
    },

    // 2. The Admin Bouncer
    isAdmin: function(req, res, next) {
        if (req.session.user && req.session.user.role === 'admin') {
            return next(); // User is logged in AND is an admin, let them through
        }
        // If they are just a regular customer (or not logged in), kick them out
        req.flash('error_msg', 'Access Denied: Administrators Only.');
        res.redirect('/');
    }
};