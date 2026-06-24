const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

// Helper to escape special regex characters for search safety (ReDoS protection)
const escapeRegex = (string) => {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

// Helper to send transactional emails securely
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

const renderHomepage = async (req, res) => {
    try {
        const newArrivals = await Product.find({}).sort({ createdAt: -1 }).limit(4);
        
        // Fetch up to 4 discounted products. If less than 4, fill remaining slots with top-rated ones.
        let featuredOffers = await Product.find({ discountPrice: { $ne: null, $gt: 0 } }).limit(4);
        if (featuredOffers.length < 4) {
            const excludeIds = featuredOffers.map(p => p._id);
            const additional = await Product.find({ _id: { $nin: excludeIds } })
                .sort({ rating: -1 })
                .limit(4 - featuredOffers.length);
            featuredOffers = [...featuredOffers, ...additional];
        }
        
        res.render('homepage', { newArrivals, featuredOffers });
    } catch (err) {
        console.error('Error rendering homepage:', err);
        res.status(500).render('error', { message: 'Failed to load the homepage.' });
    }
};

const renderContact = (req, res) => res.render('contact');

const getProducts = async (req, res) => {
    try {
        let { page = 1, category, search, minPrice, maxPrice, sort } = req.query;
        const limit = 8; 
        const skip = (page - 1) * limit;

        let query = {};
        if (category) query.category = category;
        if (search) query.name = { $regex: escapeRegex(search), $options: 'i' }; 
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        let sortQuery = {};
        if (sort === 'price-asc') sortQuery.price = 1;
        if (sort === 'price-desc') sortQuery.price = -1;

        const products = await Product.find(query).sort(sortQuery).skip(skip).limit(limit);
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('products', {
            products,
            currentPage: Number(page),
            totalPages,
            totalProducts,
            query: req.query 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// GET single product page detail with verified reviews
const getProductDetail = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).render('error', { message: 'Product not found.' });

        const reviews = await Review.find({ product: product._id }).sort({ createdAt: -1 });
        
        // Fetch up to 4 related products in the same category, excluding the current product
        let relatedProducts = await Product.find({ category: product.category, _id: { $ne: product._id } }).limit(4);
        
        // Fallback: If less than 4 items, fill remaining slots with other top-rated products
        if (relatedProducts.length < 4) {
            const excludeIds = [product._id, ...relatedProducts.map(p => p._id)];
            const additional = await Product.find({ _id: { $nin: excludeIds } })
                .sort({ rating: -1 })
                .limit(4 - relatedProducts.length);
            relatedProducts = [...relatedProducts, ...additional];
        }

        res.render('product-detail', { 
            product, 
            reviews,
            relatedProducts
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to retrieve product details.' });
    }
};

// GET shopping cart view
const getCart = async (req, res) => {
    try {
        // Fallback: If logged in but session cart is not initialized/missing, load from DB
        if (req.session.user && !req.session.cart) {
            const user = await User.findById(req.session.user.id);
            if (user && user.cart) {
                req.session.cart = user.cart.map(item => ({
                    productId: item.productId.toString(),
                    size: item.size || null,
                    quantity: item.quantity
                }));
            }
        }

        const cart = req.session.cart || [];
        let cartItems = [];
        let subtotal = 0;

        for (let item of cart) {
            const product = await Product.findById(item.productId);
            if (product) {
                const activePrice = (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price) ? product.discountPrice : product.price;
                const totalItemPrice = activePrice * item.quantity;
                subtotal += totalItemPrice;
                cartItems.push({
                    product,
                    quantity: item.quantity,
                    size: item.size || null,
                    totalItemPrice
                });
            }
        }

        res.render('cart', { cartItems, subtotal });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to open cart page.' });
    }
};

// POST add item to cart
const addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1, size } = req.body;
        const qtyNum = Number(quantity);

        // Validate quantity is a positive integer >= 1
        if (!Number.isInteger(qtyNum) || qtyNum < 1) {
            req.flash('error_msg', 'Quantity must be a positive integer.');
            return res.redirect('back');
        }

        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('back');
        }

        const isClothing = product.category === 'kurta-pajama' || product.category === 'waistcoats';
        let itemSize = null;

        if (isClothing) {
            if (!size || !['XS', 'S', 'M', 'L', 'XL'].includes(size)) {
                req.flash('error_msg', 'Please select a valid size.');
                return res.redirect('back');
            }
            itemSize = size;
        }

        const availableStock = isClothing ? (product.sizes.toObject()[itemSize] || 0) : product.stock;

        if (availableStock < qtyNum) {
            req.flash('error_msg', `Only ${availableStock} units of this size/item are currently available.`);
            return res.redirect('back');
        }

        if (req.session.user) {
            const user = await User.findById(req.session.user.id);
            if (user) {
                if (!user.cart) {
                    user.cart = [];
                }
                const dbItem = user.cart.find(item => 
                    item.productId.toString() === productId && 
                    (item.size || '') === (itemSize || '')
                );
                if (dbItem) {
                    const newQty = dbItem.quantity + qtyNum;
                    if (availableStock < newQty) {
                        req.flash('error_msg', `Cannot add more. Max available stock is ${availableStock}.`);
                        return res.redirect('back');
                    }
                    dbItem.quantity = newQty;
                } else {
                    user.cart.push({ productId, size: itemSize, quantity: qtyNum });
                }
                await user.save();
                req.session.cart = user.cart.map(item => ({
                    productId: item.productId.toString(),
                    size: item.size || null,
                    quantity: item.quantity
                }));
            }
        } else {
            if (!req.session.cart) {
                req.session.cart = [];
            }
            const existingItem = req.session.cart.find(item => 
                item.productId === productId && 
                (item.size || '') === (itemSize || '')
            );
            if (existingItem) {
                const newQty = existingItem.quantity + qtyNum;
                if (availableStock < newQty) {
                    req.flash('error_msg', `Cannot add more. Max available stock is ${availableStock}.`);
                    return res.redirect('back');
                }
                existingItem.quantity = newQty;
            } else {
                req.session.cart.push({ productId, size: itemSize, quantity: qtyNum });
            }
        }

        req.flash('success_msg', `${product.name} added to cart.`);
        res.redirect('/cart');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to update shopping cart.' });
    }
};

// POST update cart quantity
const updateCart = async (req, res) => {
    try {
        const { productId, quantity, size } = req.body;
        const qtyNum = Number(quantity);
        const itemSize = size || null;

        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error_msg', 'Product not found.');
            if (req.session.user) {
                const user = await User.findById(req.session.user.id);
                if (user) {
                    user.cart = user.cart.filter(item => 
                        !(item.productId.toString() === productId && (item.size || '') === (itemSize || ''))
                    );
                    await user.save();
                    req.session.cart = user.cart.map(item => ({
                        productId: item.productId.toString(),
                        size: item.size || null,
                        quantity: item.quantity
                    }));
                }
            } else if (req.session.cart) {
                req.session.cart = req.session.cart.filter(item => 
                    !(item.productId === productId && (item.size || '') === (itemSize || ''))
                );
            }
            return res.redirect('/cart');
        }

        const isClothing = product.category === 'kurta-pajama' || product.category === 'waistcoats';
        const availableStock = isClothing ? (product.sizes.toObject()[itemSize] || 0) : product.stock;

        if (qtyNum > 0 && qtyNum > availableStock) {
            req.flash('error_msg', `Only ${availableStock} units of this size/item are in stock.`);
            return res.redirect('/cart');
        }

        if (req.session.user) {
            const user = await User.findById(req.session.user.id);
            if (user) {
                if (!user.cart) {
                    user.cart = [];
                }
                if (qtyNum <= 0) {
                    user.cart = user.cart.filter(item => 
                        !(item.productId.toString() === productId && (item.size || '') === (itemSize || ''))
                    );
                } else {
                    const dbItem = user.cart.find(item => 
                        item.productId.toString() === productId && (item.size || '') === (itemSize || '')
                    );
                    if (dbItem) {
                        dbItem.quantity = qtyNum;
                    } else {
                        user.cart.push({ productId, size: itemSize, quantity: qtyNum });
                    }
                }
                await user.save();
                req.session.cart = user.cart.map(item => ({
                    productId: item.productId.toString(),
                    size: item.size || null,
                    quantity: item.quantity
                }));
            }
        } else {
            if (!req.session.cart) {
                req.session.cart = [];
            }
            if (qtyNum <= 0) {
                req.session.cart = req.session.cart.filter(item => 
                    !(item.productId === productId && (item.size || '') === (itemSize || ''))
                );
            } else {
                const cartItem = req.session.cart.find(item => 
                    item.productId === productId && (item.size || '') === (itemSize || '')
                );
                if (cartItem) {
                    cartItem.quantity = qtyNum;
                } else {
                    req.session.cart.push({ productId, size: itemSize, quantity: qtyNum });
                }
            }
        }
        res.redirect('/cart');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to update shopping cart.' });
    }
};

// POST remove item from cart
const removeFromCart = async (req, res) => {
    try {
        const { productId, size } = req.body;
        const itemSize = size || null;
        
        if (req.session.user) {
            const user = await User.findById(req.session.user.id);
            if (user) {
                if (user.cart) {
                    user.cart = user.cart.filter(item => 
                        !(item.productId.toString() === productId && (item.size || '') === (itemSize || ''))
                    );
                    await user.save();
                }
                req.session.cart = user.cart.map(item => ({
                    productId: item.productId.toString(),
                    size: item.size || null,
                    quantity: item.quantity
                }));
            }
        } else {
            if (req.session.cart) {
                req.session.cart = req.session.cart.filter(item => 
                    !(item.productId === productId && (item.size || '') === (itemSize || ''))
                );
            }
        }
        res.redirect('/cart');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to remove product from cart.' });
    }
};

// GET Checkout form rendering
const renderCheckout = async (req, res) => {
    try {
        const cart = req.session.cart || [];
        if (cart.length === 0) {
            req.flash('error_msg', 'Your cart is empty.');
            return res.redirect('/cart');
        }

        let cartItems = [];
        let subtotal = 0;

        for (let item of cart) {
            const product = await Product.findById(item.productId);
            if (product) {
                const activePrice = (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price) ? product.discountPrice : product.price;
                subtotal += activePrice * item.quantity;
                cartItems.push({
                    product,
                    quantity: item.quantity,
                    size: item.size || null
                });
            }
        }

        let discountAmount = 0;
        let couponApplied = null;

        if (req.session.coupon) {
            const sessionCoupon = req.session.coupon;
            const coupon = await Coupon.findOne({ code: sessionCoupon.code, isActive: true });
            if (coupon && coupon.expiryDate >= new Date() && subtotal >= coupon.minOrderAmount) {
                couponApplied = coupon;
                if (coupon.discountType === 'percentage') {
                    discountAmount = Math.round(subtotal * (coupon.discountAmount / 100));
                } else {
                    discountAmount = coupon.discountAmount;
                }
                discountAmount = Math.min(discountAmount, subtotal);
            } else {
                req.session.coupon = null;
            }
        }

        const totalAmount = subtotal - discountAmount;

        res.render('checkout', { cartItems, subtotal, discountAmount, couponApplied, totalAmount });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to load checkout details.' });
    }
};

// POST Checkout order submission with atomic stock updates
const processCheckout = async (req, res) => {
    try {
        const cart = req.session.cart || [];
        if (cart.length === 0) {
            req.flash('error_msg', 'Your cart is empty.');
            return res.redirect('/cart');
        }

        const { fullName, addressLine, city, postalCode, phone, paymentMethod, cardNumber } = req.body;

        // Verify stock levels before performing edits
        let orderItems = [];
        let totalAmount = 0;

        for (let item of cart) {
            const product = await Product.findById(item.productId);
            if (!product) {
                req.flash('error_msg', 'One of the items in your cart is no longer available.');
                return res.redirect('/cart');
            }

            const isClothing = product.category === 'kurta-pajama' || product.category === 'waistcoats';
            if (isClothing) {
                if (!item.size || !['XS', 'S', 'M', 'L', 'XL'].includes(item.size)) {
                    req.flash('error_msg', `Please select a valid size for ${product.name}.`);
                    return res.redirect('/cart');
                }
                const sizeStock = product.sizes.toObject()[item.size] || 0;
                if (sizeStock < item.quantity) {
                    req.flash('error_msg', `Insufficient stock for ${product.name} (Size ${item.size}). Only ${sizeStock} left.`);
                    return res.redirect('/cart');
                }
            } else {
                if (product.stock < item.quantity) {
                    req.flash('error_msg', `Insufficient stock for ${product.name}. Only ${product.stock} left.`);
                    return res.redirect('/cart');
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
        for (let item of cart) {
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
            req.flash('error_msg', 'An item went out of stock during the checkout process. Please try again.');
            return res.redirect('/cart');
        }

        // Apply coupon discount if applicable
        let discountAmount = 0;
        let appliedCouponCode = null;

        if (req.session.coupon) {
            const sessionCoupon = req.session.coupon;
            const coupon = await Coupon.findOne({ code: sessionCoupon.code, isActive: true });
            if (coupon && coupon.expiryDate >= new Date() && totalAmount >= coupon.minOrderAmount) {
                appliedCouponCode = coupon.code;
                if (coupon.discountType === 'percentage') {
                    discountAmount = Math.round(totalAmount * (coupon.discountAmount / 100));
                } else {
                    discountAmount = coupon.discountAmount;
                }
                discountAmount = Math.min(discountAmount, totalAmount);
            }
        }

        const finalTotalAmount = totalAmount - discountAmount;

        const isCardPaid = paymentMethod === 'Card';
        const transactionId = isCardPaid ? 'TXN-' + Date.now() + Math.floor(Math.random() * 1000) : null;

        const newOrder = new Order({
            user: req.session.user ? req.session.user.id : null,
            items: orderItems,
            shippingAddress: { fullName, addressLine, city, postalCode, phone },
            paymentMethod,
            paymentStatus: isCardPaid ? 'Paid' : 'Pending',
            orderStatus: isCardPaid ? 'Processing' : 'Pending',
            discountAmount,
            couponCode: appliedCouponCode,
            totalAmount: finalTotalAmount,
            transactionId
        });

        await newOrder.save();
        
        // Track the last placed order ID in session for guest confirmation page access control
        req.session.lastPlacedOrderId = newOrder._id.toString();

        // Empty user cart in database if logged in
        if (req.session.user) {
            const user = await User.findById(req.session.user.id);
            if (user) {
                user.cart = [];
                await user.save();
            }
        }

        // Empty session cart
        req.session.cart = [];

        // Clear coupon from session
        req.session.coupon = null;

        // Run notification delivery asynchronously
        sendConfirmationEmail(newOrder);

        res.redirect(`/orders/success/${newOrder._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Transaction processing failed.' });
    }
};

// GET Order Confirmation page
const renderSuccess = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).render('error', { message: 'Order not found.' });

        // Access Control Verification:
        // 1. If user is logged in: Must be the owner of the order OR an admin.
        // 2. If it is a guest checkout (user is null): Must match the lastPlacedOrderId in session OR requestor is an admin.
        const isUserAdmin = req.session.user && req.session.user.role === 'admin';
        
        if (order.user) {
            const isOwner = req.session.user && req.session.user.id === order.user.toString();
            if (!isOwner && !isUserAdmin) {
                return res.status(403).render('error', { message: 'Access denied. You do not have permission to view this order.' });
            }
        } else {
            const isLastPlaced = req.session.lastPlacedOrderId === order._id.toString();
            if (!isLastPlaced && !isUserAdmin) {
                return res.status(403).render('error', { message: 'Access denied. You do not have permission to view this order.' });
            }
        }

        res.render('success', { order });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to retrieve success page.' });
    }
};

// POST add product review
const addReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const productId = req.params.id;

        const newReview = new Review({
            product: productId,
            user: req.session.user.id,
            userName: req.session.user.name,
            rating: Number(rating),
            comment: comment
        });

        await newReview.save();

        // Calculate and update the product's average rating dynamically
        const reviews = await Review.find({ product: productId });
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = (totalRating / reviews.length).toFixed(1);

        await Product.findByIdAndUpdate(productId, { rating: Number(averageRating) });

        req.flash('success_msg', 'Review submitted successfully!');
        res.redirect(`/products/${productId}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to save review.');
        res.redirect('back');
    }
};

// GET Wishlist page
const getWishlist = async (req, res) => {
    try {
        let wishlistItems = [];
        
        if (req.session.user) {
            // Logged-in user: retrieve from database populated fields
            const user = await User.findById(req.session.user.id).populate('wishlist');
            if (user && user.wishlist) {
                wishlistItems = user.wishlist;
                // Double-check session is synchronized
                req.session.wishlist = user.wishlist.map(item => item._id.toString());
            }
        } else {
            // Guest user: retrieve from session
            const wishlist = req.session.wishlist || [];
            for (let productId of wishlist) {
                const product = await Product.findById(productId);
                if (product) {
                    wishlistItems.push(product);
                }
            }
        }
        
        res.render('wishlist', { wishlistItems });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to retrieve wishlist items.' });
    }
};

// POST add item to wishlist
const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        
        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('back');
        }
        
        if (req.session.user) {
            // Logged-in user: save to user's database wishlist
            const user = await User.findById(req.session.user.id);
            if (user) {
                const isAlreadyInWishlist = user.wishlist.some(id => id.toString() === productId);
                if (!isAlreadyInWishlist) {
                    user.wishlist.push(productId);
                    await user.save();
                    // Sync session cache
                    req.session.wishlist = user.wishlist.map(id => id.toString());
                    req.flash('success_msg', `${product.name} added to wishlist.`);
                } else {
                    req.flash('error_msg', `${product.name} is already in your wishlist.`);
                }
            }
        } else {
            // Guest user: save to session
            if (!req.session.wishlist) {
                req.session.wishlist = [];
            }
            if (!req.session.wishlist.includes(productId)) {
                req.session.wishlist.push(productId);
                req.flash('success_msg', `${product.name} added to wishlist.`);
            } else {
                req.flash('error_msg', `${product.name} is already in your wishlist.`);
            }
        }
        
        res.redirect('back');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to update wishlist.' });
    }
};

// POST remove item from wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        
        if (req.session.user) {
            // Logged-in user: remove from database
            const user = await User.findById(req.session.user.id);
            if (user) {
                user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
                await user.save();
                // Sync session cache
                req.session.wishlist = user.wishlist.map(id => id.toString());
                req.flash('success_msg', 'Product removed from wishlist.');
            }
        } else {
            // Guest user: remove from session
            if (req.session.wishlist) {
                req.session.wishlist = req.session.wishlist.filter(id => id !== productId);
                req.flash('success_msg', 'Product removed from wishlist.');
            }
        }
        
        res.redirect('back');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to update wishlist.' });
    }
};

// POST subscribe newsletter
const subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;
        // Verify email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!email || !emailRegex.test(email)) {
            req.flash('error_msg', 'Please provide a valid email address.');
            return res.redirect('back');
        }
        
        console.log(`✉️ New Newsletter Subscriber: ${email}`);
        
        req.flash('success_msg', 'Thank you for subscribing to our newsletter! A welcome code has been sent to your email.');
        res.redirect('back');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Newsletter subscription failed.' });
    }
};

// GET Customer My Orders page
const getMyOrders = async (req, res) => {
    try {
        // Retrieve orders matching current user ID
        const orders = await Order.find({ user: req.session.user.id }).sort({ createdAt: -1 });
        res.render('my-orders', { orders });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to retrieve your order history.' });
    }
};

// POST apply coupon code (AJAX)
const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        if (!couponCode) {
            return res.json({ success: false, message: 'Please enter a coupon code.' });
        }

        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid or inactive coupon code.' });
        }

        if (coupon.expiryDate < new Date()) {
            return res.json({ success: false, message: 'This coupon code has expired.' });
        }

        // Calculate current cart subtotal
        const cart = req.session.cart || [];
        let subtotal = 0;
        for (let item of cart) {
            const product = await Product.findById(item.productId);
            if (product) {
                const activePrice = (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price) ? product.discountPrice : product.price;
                subtotal += activePrice * item.quantity;
            }
        }

        if (subtotal < coupon.minOrderAmount) {
            return res.json({
                success: false,
                message: `Minimum order amount of Rs. ${coupon.minOrderAmount} is required to apply this coupon.`
            });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = Math.round(subtotal * (coupon.discountAmount / 100));
        } else if (coupon.discountType === 'flat') {
            discountAmount = coupon.discountAmount;
        }

        discountAmount = Math.min(discountAmount, subtotal);
        const finalTotal = subtotal - discountAmount;

        // Store coupon in session
        req.session.coupon = {
            code: coupon.code,
            discountType: coupon.discountType,
            discountAmount: coupon.discountAmount,
            minOrderAmount: coupon.minOrderAmount
        };

        res.json({
            success: true,
            message: 'Coupon applied successfully!',
            couponCode: coupon.code,
            discountAmount,
            finalTotal
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error while applying coupon.' });
    }
};

// GET Download Order Invoice (PDF)
const downloadInvoice = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).render('error', { message: 'Order not found.' });

        // Access Control Verification:
        const isUserAdmin = req.session.user && req.session.user.role === 'admin';
        if (order.user) {
            const isOwner = req.session.user && req.session.user.id === order.user.toString();
            if (!isOwner && !isUserAdmin) {
                return res.status(403).render('error', { message: 'Access denied. You do not have permission to download this invoice.' });
            }
        } else {
            const isLastPlaced = req.session.lastPlacedOrderId === order._id.toString();
            if (!isLastPlaced && !isUserAdmin) {
                return res.status(403).render('error', { message: 'Access denied. You do not have permission to download this invoice.' });
            }
        }

        const doc = new PDFDocument({ margin: 50 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${order._id}.pdf`);
        
        doc.pipe(res);

        // Header Section
        doc.fillColor('#E85624').fontSize(24).text('LIBAS-E-IKHLAQ', { align: 'left' });
        doc.fillColor('#777777').fontSize(10).text('Premium Eastern Apparel Store', { align: 'left' });
        
        doc.moveDown();
        
        doc.fillColor('#333333').fontSize(14).text('INVOICE', { align: 'right' });
        doc.fontSize(10).text(`Invoice Number: INV-${order._id.toString().substring(0, 8).toUpperCase()}`, { align: 'right' });
        doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: 'right' });
        
        doc.moveDown(2);
        
        // Shipping Details
        doc.fillColor('#E85624').fontSize(12).text('BILL TO:', { underline: true });
        doc.fillColor('#333333').fontSize(10);
        doc.text(`Name: ${order.shippingAddress.fullName}`);
        doc.text(`Address: ${order.shippingAddress.addressLine}`);
        doc.text(`City: ${order.shippingAddress.city}`);
        doc.text(`Postal Code: ${order.shippingAddress.postalCode}`);
        doc.text(`Phone: ${order.shippingAddress.phone}`);
        
        doc.moveDown(2);

        // Table Header
        const startY = doc.y;
        doc.fillColor('#E85624').fontSize(10);
        doc.text('Item Description', 50, startY);
        doc.text('Size', 250, startY);
        doc.text('Price', 320, startY, { width: 60, align: 'right' });
        doc.text('Qty', 400, startY, { width: 40, align: 'right' });
        doc.text('Total', 460, startY, { width: 80, align: 'right' });
        
        doc.moveTo(50, startY + 15).lineTo(540, startY + 15).strokeColor('#E85624').stroke();
        
        let currentY = startY + 25;
        doc.fillColor('#333333');
        
        let subtotal = 0;
        for (let item of order.items) {
            doc.text(item.name, 50, currentY, { width: 190 });
            doc.text(item.size || 'N/A', 250, currentY);
            doc.text(`Rs. ${item.price}`, 320, currentY, { width: 60, align: 'right' });
            doc.text(item.quantity.toString(), 400, currentY, { width: 40, align: 'right' });
            const itemTotal = item.price * item.quantity;
            doc.text(`Rs. ${itemTotal}`, 460, currentY, { width: 80, align: 'right' });
            subtotal += itemTotal;
            currentY += 20;
        }
        
        doc.moveTo(50, currentY).lineTo(540, currentY).strokeColor('#dddddd').stroke();
        currentY += 15;
        
        // Summary
        doc.text('Subtotal:', 350, currentY, { width: 110, align: 'right' });
        doc.text(`Rs. ${subtotal}`, 460, currentY, { width: 80, align: 'right' });
        currentY += 15;

        if (order.discountAmount && order.discountAmount > 0) {
            doc.text(`Discount (${order.couponCode || 'Promo'}):`, 300, currentY, { width: 160, align: 'right' });
            doc.text(`-Rs. ${order.discountAmount}`, 460, currentY, { width: 80, align: 'right' });
            currentY += 15;
        }

        doc.fillColor('#E85624').fontSize(11).text('Grand Total:', 350, currentY, { width: 110, align: 'right' });
        doc.text(`Rs. ${order.totalAmount}`, 460, currentY, { width: 80, align: 'right' });
        
        doc.moveDown(4);
        doc.fillColor('#777777').fontSize(10).text('Thank you for shopping with Libas-e-Ikhlaq!', { align: 'center', italic: true });
        
        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Failed to generate invoice.' });
    }
};

// POST remove coupon code (AJAX)
const removeCoupon = async (req, res) => {
    req.session.coupon = null;
    res.json({ success: true, message: 'Coupon removed successfully!' });
};

module.exports = {
    renderHomepage,
    renderContact,
    getProducts,
    getProductDetail,
    getCart,
    addToCart,
    updateCart,
    removeFromCart,
    renderCheckout,
    processCheckout,
    renderSuccess,
    addReview,
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    subscribeNewsletter,
    getMyOrders,
    applyCoupon,
    removeCoupon,
    downloadInvoice
};