const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Import the middleware we built in the previous step
const { verifyToken } = require('../middleware/jwtAuth');

// --- PUBLIC ROUTES ---
router.post('/auth/login', apiController.apiLogin);
router.get('/products', apiController.getApiProducts);
router.get('/products/:id', apiController.getApiProductById);
router.get('/search-autocomplete', apiController.getSearchAutocomplete);

// --- PROTECTED ROUTES (Requires JWT Passport) ---
// The verifyToken middleware checks the header before allowing the controller to run
router.get('/user/profile', verifyToken, apiController.getApiProfile);
router.post('/orders', verifyToken, apiController.submitApiOrder);

module.exports = router;