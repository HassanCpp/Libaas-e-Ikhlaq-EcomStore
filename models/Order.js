const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Allows support for guest checkouts
        index: true
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            name: { type: String, required: true },
            price: { type: Number, required: true, min: 0 },
            quantity: { type: Number, required: true, min: 1 },
            size: { type: String, default: null }
        }
    ],
    shippingAddress: {
        fullName: { type: String, required: true, maxlength: 200 },
        addressLine: { type: String, required: true, maxlength: 200 },
        city: { type: String, required: true, maxlength: 200 },
        postalCode: { type: String, required: true, maxlength: 200 },
        phone: { type: String, required: true, maxlength: 200 }
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Card'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending'
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    discountAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    couponCode: {
        type: String,
        default: null
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    transactionId: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', orderSchema);
