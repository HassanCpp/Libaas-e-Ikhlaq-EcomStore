const Product = require('../models/Product');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const nodemailer = require('nodemailer');

// 1. JWT Login (Stateless Authentication)
const apiLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

        // Generate the JWT Token (The Digital Passport)
        // Payload includes user ID and role. Expires in 1 hour.
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.json({ 
            success: true, 
            message: 'Login successful', 
            token: token // Handing the passport to the client!
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// 2. Get All Products (Public)
const getApiProducts = async (req, res) => {
    try {
        let { page = 1, category, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (category) query.category = category;

        const products = await Product.find(query).skip(skip).limit(Number(limit));
        
        res.json({ success: true, count: products.length, data: products });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// 3. Get Single Product (Public)
const getApiProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        
        res.json({ success: true, data: product });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Invalid ID or Server error' });
    }
};

// 4. Get User Profile (Protected - Requires JWT)
const getApiProfile = async (req, res) => {
    try {
        // req.user.id comes from our verifyToken middleware!
        const user = await User.findById(req.user.id).select('-password'); // '-password' hides the hash from the JSON output
        
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Helper to send transactional emails securely for API orders
const sendConfirmationEmail = async (order) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
            port: process.env.SMTP_PORT || 2525,
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || ''
            }
        });

        const isCredentialsConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;
        
        const mailOptions = {
            from: '"Libas-e-Ikhlaq Store" <noreply@libaseikhlaq.com>',
            to: order.shippingAddress.phone + '@mail.com', // mock client email mapping
            subject: `Order Confirmation - #${order._id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #111; text-align: center;">LIBAS-E-IKHLAQ</h2>
                    <h3 style="color: #2e7d32;">Thank you for your order, ${order.shippingAddress.fullName}!</h3>
                    <p>We are processing your order reference: <strong>#${order._id}</strong></p>
                    <hr style="border: 0; border-top: 1px solid #eee;" />
                    <h4>Delivery Details:</h4>
                    <p>
                        ${order.shippingAddress.addressLine}<br>
                        ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}<br>
                        Phone: ${order.shippingAddress.phone}
                    </p>
                    <hr style="border: 0; border-top: 1px solid #eee;" />
                    <h4>Order Summary:</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="padding: 8px; text-align: left;">Item</th>
                                <th style="padding: 8px; text-align: center;">Qty</th>
                                <th style="padding: 8px; text-align: right;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
                                    <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
                                    <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">PKR ${item.price.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <h3 style="text-align: right; color: #d32f2f;">Total Paid: PKR ${order.totalAmount.toLocaleString()}</h3>
                    <p style="font-size: 12px; color: #777; text-align: center; margin-top: 30px;">
                        This is an automated invoice. Thank you for shopping with Libas-e-Ikhlaq.
                    </p>
                </div>
            `
        };

        if (isCredentialsConfigured) {
            await transporter.sendMail(mailOptions);
            console.log(`✅ Transactional invoice email dispatched for order: ${order._id}`);
        } else {
            console.log('✉️ [SMTP Settings Empty] Email simulation logs:\n', mailOptions.html);
        }
    } catch (err) {
        console.error('❌ Failed to dispatch transactional email:', err);
    }
};

// 5. Submit an Order (Protected - Requires JWT)
const submitApiOrder = async (req, res) => {
    try {
        // Normalize input format: Support both single productId/quantity and items array
        let inputItems = [];
        if (req.body.items && Array.isArray(req.body.items)) {
            inputItems = req.body.items;
        } else if (req.body.productId) {
            inputItems = [{ productId: req.body.productId, quantity: req.body.quantity || 1 }];
        }

        if (inputItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Your order must contain at least one item.' });
        }

        // Validate items format and quantities
        for (let item of inputItems) {
            if (!item.productId || !item.productId.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ success: false, message: `Invalid product ID format: ${item.productId}` });
            }
            const qtyNum = Number(item.quantity);
            if (!Number.isInteger(qtyNum) || qtyNum < 1) {
                return res.status(400).json({ success: false, message: 'Quantity must be a positive integer.' });
            }
            item.quantity = qtyNum;
        }

        // Extract and validate shipping address fields
        const addressData = req.body.shippingAddress || req.body;
        const { fullName, addressLine, city, postalCode, phone } = addressData;
        if (!fullName || !addressLine || !city || !postalCode || !phone) {
            return res.status(400).json({
                success: false,
                message: 'All shipping address fields (fullName, addressLine, city, postalCode, phone) are required.'
            });
        }

        // Validate payment method
        const paymentMethod = req.body.paymentMethod || 'COD';
        if (paymentMethod !== 'COD' && paymentMethod !== 'Card') {
            return res.status(400).json({ success: false, message: 'Payment method must be COD or Card.' });
        }

        // Verify stock levels and build order items array
        let orderItems = [];
        let totalAmount = 0;

        for (let item of inputItems) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(400).json({ success: false, message: `Product with ID ${item.productId} was not found.` });
            }

            const isClothing = product.category === 'kurta-pajama' || product.category === 'waistcoats';
            if (isClothing) {
                if (!item.size || !['XS', 'S', 'M', 'L', 'XL'].includes(item.size)) {
                    return res.status(400).json({
                        success: false,
                        message: `Please select a valid size (XS, S, M, L, XL) for clothing product: ${product.name}`
                    });
                }
                const sizeStock = product.sizes.toObject()[item.size] || 0;
                if (sizeStock < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${product.name} (Size ${item.size}). Only ${sizeStock} units are left.`
                    });
                }
            } else {
                if (product.stock < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${product.name}. Only ${product.stock} units are left.`
                    });
                }
            }

            const activePrice = (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price) ? product.discountPrice : product.price;

            orderItems.push({
                product: product._id,
                name: product.name,
                price: activePrice,
                quantity: item.quantity,
                size: item.size || null
            });
            totalAmount += activePrice * item.quantity;
        }

        // Perform atomic operations to decrement stock and safeguard race conditions
        let updatedItems = [];
        let success = true;
        for (let item of inputItems) {
            const product = await Product.findById(item.productId);
            const isClothing = product.category === 'kurta-pajama' || product.category === 'waistcoats';

            let query = { _id: item.productId };
            let update = {};

            if (isClothing) {
                query['sizes.' + item.size] = { $gte: item.quantity };
                update.$inc = {
                    ['sizes.' + item.size]: -item.quantity,
                    stock: -item.quantity
                };
            } else {
                query.stock = { $gte: item.quantity };
                update.$inc = { stock: -item.quantity };
            }

            const result = await Product.findOneAndUpdate(query, update, { new: true });
            if (!result) {
                success = false;
                break;
            }
            updatedItems.push(item);
        }

        if (!success) {
            // Rollback already decremented stock items
            for (let item of updatedItems) {
                const product = await Product.findById(item.productId);
                const isClothing = product.category === 'kurta-pajama' || product.category === 'waistcoats';
                let update = {};
                if (isClothing) {
                    update.$inc = {
                        ['sizes.' + item.size]: item.quantity,
                        stock: item.quantity
                    };
                } else {
                    update.$inc = { stock: item.quantity };
                }
                await Product.findByIdAndUpdate(item.productId, update);
            }
            return res.status(409).json({
                success: false,
                message: 'One of the items in your checkout became out of stock. Transaction cancelled.'
            });
        }

        const isCardPaid = paymentMethod === 'Card';
        const transactionId = isCardPaid ? 'TXN-' + Date.now() + Math.floor(Math.random() * 1000) : null;

        const newOrder = new Order({
            user: req.user ? req.user.id : null,
            items: orderItems,
            shippingAddress: {
                fullName: fullName.trim(),
                addressLine: addressLine.trim(),
                city: city.trim(),
                postalCode: postalCode.trim(),
                phone: phone.trim()
            },
            paymentMethod,
            paymentStatus: isCardPaid ? 'Paid' : 'Pending',
            orderStatus: isCardPaid ? 'Processing' : 'Pending',
            totalAmount,
            transactionId
        });

        await newOrder.save();

        // Run notification delivery asynchronously
        sendConfirmationEmail(newOrder);

        res.status(201).json({
            success: true,
            message: 'Order placed successfully!',
            data: newOrder
        });
    } catch (err) {
        console.error('❌ API Checkout processing failed:', err);
        res.status(500).json({ success: false, message: 'Internal server error occurred.' });
    }
};

// GET Autocomplete search suggestions (AJAX)
const getSearchAutocomplete = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.json({ success: true, count: 0, data: [] });
        }

        // Perform case-insensitive partial match
        const regex = new RegExp(q.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        const products = await Product.find({ name: { $regex: regex } })
            .limit(5)
            .select('_id name price discountPrice image category');

        res.json({ success: true, count: products.length, data: products });
    } catch (err) {
        console.error('❌ API Search Autocomplete error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = { apiLogin, getApiProducts, getApiProductById, getApiProfile, submitApiOrder, getSearchAutocomplete };