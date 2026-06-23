const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.renderLogin);
router.get('/register', authController.renderRegister);
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/logout', authController.logoutUser);

// Password Recovery Routes
router.get('/forgot-password', authController.renderForgotPassword);
router.post('/forgot-password', authController.sendPasswordReset);
router.get('/reset-password/:token', authController.renderResetPassword);
router.post('/reset-password/:token', authController.executePasswordReset);

module.exports = router;