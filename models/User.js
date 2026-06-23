const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'] 
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6,
        maxlength: 128 
    },
    role: { 
        type: String, 
        default: 'customer',
        enum: ['customer', 'admin'] 
    },
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    cart: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        size: {
            type: String,
            default: null,
            enum: ['XS', 'S', 'M', 'L', 'XL', null, '']
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity cannot be less than 1']
        }
    }],
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpires: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Hash password before saving to database (Modern Async approach, NO 'next' used!)
userSchema.pre('save', async function() {
    // If password is not modified, skip this process
    if (!this.isModified('password')) {
        return;
    }
    
    // Scramble the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);