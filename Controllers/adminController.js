const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Review = require('../models/Review');

const getDashboard = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.render('admin-dashboard', { products });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

const renderAddProduct = (req, res) => res.render('admin-add-product');

const addProduct = async (req, res) => {
    try {
        const { name, price, discountPrice, stock, category, sizes } = req.body;
        
        // Handle the physical file uploaded via Multer
        // If a file was uploaded, generate its new path. Otherwise, use a default image.
        const imagePath = req.file ? '/uploads/' + req.file.filename : '/sale.png';
        
        const isClothing = category === 'kurta-pajama' || category === 'waistcoats';
        let stockVal = Number(stock);
        let sizesObj = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };

        if (isClothing && sizes) {
            sizesObj = {
                XS: Number(sizes.XS) || 0,
                S: Number(sizes.S) || 0,
                M: Number(sizes.M) || 0,
                L: Number(sizes.L) || 0,
                XL: Number(sizes.XL) || 0
            };
            stockVal = Object.values(sizesObj).reduce((a, b) => a + b, 0);
        }

        const newProduct = new Product({
            name: name,
            price: Number(price),
            discountPrice: discountPrice ? Number(discountPrice) : null,
            stock: stockVal,
            category: category,
            sizes: sizesObj,
            image: imagePath // Save the Multer-generated path to MongoDB
        });

        await newProduct.save();
        req.flash('success_msg', 'Product successfully added!');
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to add product.');
        res.redirect('/admin/products/add');
    }
};

const deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Product deleted successfully.');
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to delete product.');
        res.redirect('/admin');
    }
};

const renderEditProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.redirect('/admin');
        res.render('admin-edit-product', { product });
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
};

const updateProduct = async (req, res) => {
    try {
        const { name, price, discountPrice, stock, category, sizes } = req.body;
        
        const isClothing = category === 'kurta-pajama' || category === 'waistcoats';
        let stockVal = Number(stock);
        let sizesObj = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };

        if (isClothing && sizes) {
            sizesObj = {
                XS: Number(sizes.XS) || 0,
                S: Number(sizes.S) || 0,
                M: Number(sizes.M) || 0,
                L: Number(sizes.L) || 0,
                XL: Number(sizes.XL) || 0
            };
            stockVal = Object.values(sizesObj).reduce((a, b) => a + b, 0);
        }

        // Prepare the basic data to update
        let updateData = {
            name: name,
            price: Number(price),
            discountPrice: discountPrice ? Number(discountPrice) : null,
            stock: stockVal,
            category: category,
            sizes: sizesObj
        };

        // If the admin uploaded a NEW image, add it to the update object
        // If they didn't upload a new image, this gets skipped and the old image is kept!
        if (req.file) {
            updateData.image = '/uploads/' + req.file.filename;
        }
        
        await Product.findByIdAndUpdate(req.params.id, updateData);

        req.flash('success_msg', 'Product updated successfully.');
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to update product.');
        res.redirect(`/admin/products/edit/${req.params.id}`);
    }
};

const getOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.render('admin-orders', { orders });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderStatus, paymentStatus } = req.body;
        await Order.findByIdAndUpdate(req.params.id, { orderStatus, paymentStatus });
        req.flash('success_msg', 'Order status updated successfully.');
        res.redirect('/admin/orders');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to update order status.');
        res.redirect('/admin/orders');
    }
};

const getAnalytics = async (req, res) => {
    try {
        const orders = await Order.find();
        const products = await Product.find();

        let totalRevenue = 0;
        let totalOrders = orders.length;
        let pendingDeliveries = 0;

        for (let order of orders) {
            if (order.orderStatus !== 'Cancelled') {
                totalRevenue += order.totalAmount;
            }
            if (order.orderStatus === 'Pending' || order.orderStatus === 'Processing') {
                pendingDeliveries++;
            }
        }

        const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
        const lowStockProducts = products.filter(p => p.stock <= 5);

        const productSales = {};
        for (let order of orders) {
            if (order.orderStatus === 'Cancelled') continue;
            for (let item of order.items) {
                if (item.product) {
                    const pidStr = item.product.toString();
                    if (!productSales[pidStr]) {
                        productSales[pidStr] = {
                            name: item.name,
                            unitsSold: 0,
                            revenue: 0
                        };
                    }
                    productSales[pidStr].unitsSold += item.quantity;
                    productSales[pidStr].revenue += (item.price * item.quantity);
                }
            }
        }

        const productMap = {};
        for (let p of products) {
            productMap[p._id.toString()] = p.category;
        }

        const topProductsList = Object.keys(productSales).map(pid => {
            return {
                _id: pid,
                name: productSales[pid].name,
                unitsSold: productSales[pid].unitsSold,
                revenue: productSales[pid].revenue,
                category: productMap[pid] || 'N/A'
            };
        });

        topProductsList.sort((a, b) => b.unitsSold - a.unitsSold);
        const topProducts = topProductsList.slice(0, 5);

        // Generate list of the last 7 days (YYYY-MM-DD)
        const salesTrend = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            salesTrend.push({ date: dateStr, amount: 0 });
        }

        // Sum order totals for non-cancelled orders on these dates
        for (let order of orders) {
            if (order.orderStatus === 'Cancelled') continue;
            const orderDateStr = new Date(order.createdAt).toISOString().split('T')[0];
            const dayEntry = salesTrend.find(entry => entry.date === orderDateStr);
            if (dayEntry) {
                dayEntry.amount += order.totalAmount;
            }
        }

        res.render('admin-analytics', {
            totalRevenue,
            totalOrders,
            pendingDeliveries,
            averageOrderValue,
            lowStockProducts,
            topProducts,
            salesLabels: salesTrend.map(entry => entry.date),
            salesAmounts: salesTrend.map(entry => entry.amount)
        });
    } catch (err) {
        console.error('❌ Analytics computation failed:', err);
        res.status(500).send("Server Error");
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        const usersWithOrderCount = await Promise.all(users.map(async (user) => {
            const orderCount = await Order.countDocuments({ user: user._id });
            const userObj = user.toObject();
            userObj.orderCount = orderCount;
            return userObj;
        }));

        res.render('admin-users', { users: usersWithOrderCount });
    } catch (err) {
        console.error('Error fetching admin users:', err);
        res.status(500).send("Server Error");
    }
};

const toggleUserRole = async (req, res) => {
    try {
        const userId = req.params.id;

        if (userId === req.session.user.id) {
            req.flash('error_msg', 'You cannot change your own admin role.');
            return res.redirect('/admin/users');
        }

        const user = await User.findById(userId);
        if (!user) {
            req.flash('error_msg', 'User not found.');
            return res.redirect('/admin/users');
        }

        user.role = user.role === 'admin' ? 'customer' : 'admin';
        await user.save();

        req.flash('success_msg', `User role successfully updated to ${user.role}!`);
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error toggling user role:', err);
        req.flash('error_msg', 'Failed to update user role.');
        res.redirect('/admin/users');
    }
};

const getReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('product', 'name category')
            .populate('user', 'email')
            .sort({ createdAt: -1 });

        res.render('admin-reviews', { reviews });
    } catch (err) {
        console.error('Error fetching admin reviews:', err);
        res.status(500).send("Server Error");
    }
};

const deleteReview = async (req, res) => {
    try {
        const reviewId = req.params.id;
        const review = await Review.findById(reviewId);
        if (!review) {
            req.flash('error_msg', 'Review not found.');
            return res.redirect('/admin/reviews');
        }

        const productId = review.product;
        await Review.findByIdAndDelete(reviewId);

        const remainingReviews = await Review.find({ product: productId });
        let averageRating = 0;
        if (remainingReviews.length > 0) {
            const totalRating = remainingReviews.reduce((sum, r) => sum + r.rating, 0);
            averageRating = Number((totalRating / remainingReviews.length).toFixed(1));
        }

        await Product.findByIdAndUpdate(productId, { rating: averageRating });

        req.flash('success_msg', 'Review successfully deleted and product rating updated.');
        res.redirect('/admin/reviews');
    } catch (err) {
        console.error('Error deleting review:', err);
        req.flash('error_msg', 'Failed to delete review.');
        res.redirect('/admin/reviews');
    }
};

module.exports = { 
    getDashboard, 
    renderAddProduct, 
    addProduct, 
    deleteProduct, 
    renderEditProduct, 
    updateProduct, 
    getOrders, 
    updateOrderStatus,
    getAnalytics,
    getUsers,
    toggleUserRole,
    getReviews,
    deleteReview
};