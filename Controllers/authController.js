const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const renderLogin = (req, res) => res.render('login');

const renderRegister = (req, res) => res.render('register');

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // ── Password strength validation ──
        if (!password || password.length < 6) {
            req.flash('error_msg', 'Password must be at least 6 characters long.');
            return res.redirect('/register');
        }
        if (password.length > 128) {
            req.flash('error_msg', 'Password must not exceed 128 characters.');
            return res.redirect('/register');
        }
        if (!/[A-Z]/.test(password)) {
            req.flash('error_msg', 'Password must contain at least one uppercase letter.');
            return res.redirect('/register');
        }
        if (!/[0-9]/.test(password)) {
            req.flash('error_msg', 'Password must contain at least one number.');
            return res.redirect('/register');
        }

        // ── Name validation ──
        if (!name || name.trim().length === 0 || name.length > 100) {
            req.flash('error_msg', 'Please provide a valid name (max 100 characters).');
            return res.redirect('/register');
        }

        // ── Email validation ──
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!email || !emailRegex.test(email)) {
            req.flash('error_msg', 'Please provide a valid email address.');
            return res.redirect('/register');
        }

        let user = await User.findOne({ email: email.toLowerCase().trim() });
        
        if (user) {
            req.flash('error_msg', 'That email is already registered.');
            return res.redirect('/login');
        }

        user = new User({ name: name.trim(), email: email.toLowerCase().trim(), password });
        await user.save();

        req.flash('success_msg', 'Registration successful! You can now log in.');
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred during registration.');
        res.redirect('/login');
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email ? email.toLowerCase().trim() : '' });
        
        if (!user) {
            req.flash('error_msg', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error_msg', 'Invalid email or password.');
            return res.redirect('/login');
        }

        // ── Session regeneration to prevent session fixation ──
        const userData = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        // Retrieve guest wishlist and cart items before regenerating the session
        const guestWishlist = req.session.wishlist || [];
        const guestCart = req.session.cart || [];

        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regeneration error:', err);
                req.flash('error_msg', 'An error occurred during login.');
                return res.redirect('/login');
            }

            // Sync/Merge wishlist and cart from database and session
            User.findById(user._id).then(async (dbUser) => {
                if (dbUser) {
                    // 1. Merge wishlist
                    let mergedWishlist = dbUser.wishlist.map(id => id.toString());
                    for (let id of guestWishlist) {
                        if (!mergedWishlist.includes(id)) {
                            dbUser.wishlist.push(id);
                            mergedWishlist.push(id);
                        }
                    }

                    // 2. Merge cart
                    if (!dbUser.cart) {
                        dbUser.cart = [];
                    }
                    let cartMap = {};
                    for (let item of dbUser.cart) {
                        if (item.productId) {
                            const sizeVal = item.size || '';
                            const key = item.productId.toString() + '_' + sizeVal;
                            cartMap[key] = {
                                productId: item.productId.toString(),
                                size: item.size || null,
                                quantity: item.quantity
                            };
                        }
                    }
                    for (let item of guestCart) {
                        if (item.productId) {
                            const sizeVal = item.size || '';
                            const key = item.productId.toString() + '_' + sizeVal;
                            if (cartMap[key]) {
                                cartMap[key].quantity += item.quantity;
                            } else {
                                cartMap[key] = {
                                    productId: item.productId.toString(),
                                    size: item.size || null,
                                    quantity: item.quantity
                                };
                            }
                        }
                    }
                    dbUser.cart = Object.values(cartMap);

                    if (guestWishlist.length > 0 || guestCart.length > 0) {
                        await dbUser.save();
                    }

                    req.session.wishlist = mergedWishlist;
                    req.session.cart = dbUser.cart.map(item => ({
                        productId: item.productId.toString(),
                        size: item.size || null,
                        quantity: item.quantity
                    }));
                }
                
                req.session.user = userData;
                req.flash('success_msg', `Welcome back, ${user.name}!`);
                if (user.role === 'admin') {
                    res.redirect('/admin'); 
                } else {
                    res.redirect('/'); 
                }
            }).catch(dbErr => {
                console.error('Error loading user wishlist and cart on login:', dbErr);
                req.session.user = userData;
                res.redirect('/');
            });
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred during login.');
        res.redirect('/login');
    }
};

const logoutUser = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};

const renderForgotPassword = (req, res) => {
    res.render('forgot-password');
};

const sendPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email ? email.toLowerCase().trim() : '' });
        
        if (!user) {
            req.flash('success_msg', 'If that email exists in our system, a reset link has been sent.');
            return res.redirect('/forgot-password');
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = Date.now() + 3600000; 
        await user.save();

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
            port: process.env.SMTP_PORT || 2525,
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || ''
            }
        });

        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${rawToken}`;
        
        const mailOptions = {
            from: '"Libas-e-Ikhlaq Store" <noreply@libaseikhlaq.com>',
            to: user.email,
            subject: 'Password Reset Request - Libas-e-Ikhlaq',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #111; text-align: center;">LIBAS-E-IKHLAQ</h2>
                    <h3 style="color: #222;">Hello, ${user.name}</h3>
                    <p>We received a request to reset your password. You can reset your password by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #E85624; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">RESET PASSWORD</a>
                    </div>
                    <p>Or copy and paste this link in your browser:</p>
                    <p><a href="${resetUrl}">${resetUrl}</a></p>
                    <p style="color: #777; font-size: 12px; margin-top: 30px;">
                        This link is valid for 1 hour. If you did not request this, you can safely ignore this email.
                    </p>
                </div>
            `
        };

        const isCredentialsConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;
        if (isCredentialsConfigured) {
            await transporter.sendMail(mailOptions);
            console.log(`✉️ Password reset email dispatched to ${user.email}`);
        } else {
            console.log(`✉️ [SMTP Settings Empty] Password reset link simulated:\nLink: ${resetUrl}`);
        }

        req.flash('success_msg', 'If that email exists in our system, a reset link has been sent.');
        res.redirect('/forgot-password');
    } catch (err) {
        console.error('❌ Reset password token generation failed:', err);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/forgot-password');
    }
};

const renderResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }

        res.render('reset-password', { token });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred.');
        res.redirect('/forgot-password');
    }
};

const executePasswordReset = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            req.flash('error_msg', 'Passwords do not match.');
            return res.redirect('back');
        }

        if (!password || password.length < 6) {
            req.flash('error_msg', 'Password must be at least 6 characters long.');
            return res.redirect('back');
        }
        if (password.length > 128) {
            req.flash('error_msg', 'Password must not exceed 128 characters.');
            return res.redirect('back');
        }
        if (!/[A-Z]/.test(password)) {
            req.flash('error_msg', 'Password must contain at least one uppercase letter.');
            return res.redirect('back');
        }
        if (!/[0-9]/.test(password)) {
            req.flash('error_msg', 'Password must contain at least one number.');
            return res.redirect('back');
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }

        user.password = password;
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        req.flash('success_msg', 'Password has been successfully reset! You can now log in.');
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred during password reset.');
        res.redirect('/forgot-password');
    }
};

module.exports = { 
    renderLogin, 
    renderRegister, 
    registerUser, 
    loginUser, 
    logoutUser,
    renderForgotPassword,
    sendPasswordReset,
    renderResetPassword,
    executePasswordReset
};