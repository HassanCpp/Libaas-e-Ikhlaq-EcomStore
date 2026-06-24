const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { isLoggedIn } = require('../middleware/auth');

// Public Store Pages
router.get('/', storeController.renderHomepage);
router.get('/contact-us', storeController.renderContact);
router.get('/products', storeController.getProducts);
router.get('/products/:id', storeController.getProductDetail);

// Shopping Cart Actions
router.get('/cart', storeController.getCart);
router.post('/cart/add', storeController.addToCart);
router.post('/cart/update', storeController.updateCart);
router.post('/cart/remove', storeController.removeFromCart);

// Wishlist Actions
router.get('/wishlist', storeController.getWishlist);
router.post('/wishlist/add', storeController.addToWishlist);
router.post('/wishlist/remove', storeController.removeFromWishlist);

// Newsletter Subscription
router.post('/newsletter/subscribe', storeController.subscribeNewsletter);

// Developer API Documentation
router.get('/api-docs', (req, res) => res.render('api-docs'));

// Checkout & Order Actions
router.get('/checkout', storeController.renderCheckout);
router.post('/checkout', storeController.processCheckout);
router.post('/checkout/apply-coupon', storeController.applyCoupon);
router.post('/checkout/remove-coupon', storeController.removeCoupon);
router.get('/orders/success/:id', storeController.renderSuccess);
router.get('/orders/:id/invoice', storeController.downloadInvoice);

// Customer Orders History
router.get('/orders', isLoggedIn, storeController.getMyOrders);

// Product Reviews (Requires Login)
router.post('/products/:id/reviews', isLoggedIn, storeController.addReview);

module.exports = router;