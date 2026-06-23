const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload'); // <--- IMPORT MULTER CONFIG

router.get('/', isAdmin, adminController.getDashboard);
router.get('/products/add', isAdmin, adminController.renderAddProduct);

// --- UPDATE THESE TWO POST ROUTES ---
// Add upload.single('image') before the controller!
router.post('/products/add', isAdmin, upload.single('image'), adminController.addProduct);
router.post('/products/edit/:id', isAdmin, upload.single('image'), adminController.updateProduct);

router.post('/products/delete/:id', isAdmin, adminController.deleteProduct);
router.get('/products/edit/:id', isAdmin, adminController.renderEditProduct);

// Admin Order Management
router.get('/orders', isAdmin, adminController.getOrders);
router.post('/orders/status/:id', isAdmin, adminController.updateOrderStatus);

// Admin Analytics Dashboard
router.get('/analytics', isAdmin, adminController.getAnalytics);

// Admin User Management
router.get('/users', isAdmin, adminController.getUsers);
router.post('/users/role/:id', isAdmin, adminController.toggleUserRole);

// Admin Review Moderation
router.get('/reviews', isAdmin, adminController.getReviews);
router.post('/reviews/delete/:id', isAdmin, adminController.deleteReview);

module.exports = router;