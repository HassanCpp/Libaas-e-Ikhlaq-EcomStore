const fs = require('fs');
const path = require('path');

const ejs = require('./node_modules/ejs');
const viewsDir = './views';

const mockProduct = {
    _id: '123456789012345678901234',
    name: 'Slate Grey Linen Kurta',
    price: 5500,
    discountPrice: 4500,
    image: '/slatygreylinen.png',
    category: 'kurta-pajama',
    stock: 25,
    rating: 4.5,
    sizes: {
        toObject: () => ({ XS: 4, S: 5, M: 8, L: 5, XL: 3 })
    }
};

const mockData = {
    locals: {
        success_msg: 'Operation successful!',
        error_msg: 'An error occurred.',
        query: { search: '' },
        session: {
            cart: [{ productId: '123456789012345678901234', quantity: 2, size: 'M' }],
            wishlist: ['123456789012345678901234']
        },
        currentUser: {
            id: '123',
            _id: '123',
            name: 'John Doe',
            role: 'admin'
        }
    },
    success_msg: 'Operation successful!',
    error_msg: 'An error occurred.',
    csrfToken: 'test_csrf_token_1234567890',
    query: { search: '' },
    session: {
        cart: [{ productId: '123456789012345678901234', quantity: 2, size: 'M' }],
        wishlist: ['123456789012345678901234']
    },
    currentUser: {
        id: '123',
        _id: '123',
        name: 'John Doe',
        role: 'admin'
    },
    
    // Dynamic Homepage Data
    newArrivals: [mockProduct, mockProduct, mockProduct, mockProduct],
    featuredOffers: [mockProduct, mockProduct, mockProduct, mockProduct],
    
    // Dynamic Details Data
    product: mockProduct,
    reviews: [],
    relatedProducts: [mockProduct, mockProduct, mockProduct, mockProduct],
    
    // Checkout & Cart page data
    cartItems: [{
        product: mockProduct,
        quantity: 2,
        size: 'M',
        totalItemPrice: 9000
    }],
    subtotal: 9000,
    discountAmount: 1000,
    couponApplied: { code: 'WELCOME10', discountAmount: 10, discountType: 'percentage' },
    totalAmount: 8000,
    wishlistItems: [mockProduct],
    
    // Orders page data
    orders: [
        {
            _id: '123456789012345678901234',
            createdAt: new Date(),
            totalAmount: 8000,
            paymentStatus: 'Paid',
            orderStatus: 'Processing',
            items: [{ name: 'Slate Grey Linen Kurta', quantity: 2, price: 4500, size: 'M' }],
            shippingAddress: { fullName: 'Hassan Waqar', addressLine: '123 St', city: 'LHR', postalCode: '54000', phone: '0300' }
        }
    ],
    order: {
        _id: '123456789012345678901234',
        createdAt: new Date(),
        totalAmount: 8000,
        paymentStatus: 'Paid',
        orderStatus: 'Processing',
        items: [{ name: 'Slate Grey Linen Kurta', quantity: 2, price: 4500, size: 'M' }],
        shippingAddress: { fullName: 'Hassan Waqar', addressLine: '123 St', city: 'LHR', postalCode: '54000', phone: '0300' }
    }
};

const templates = [
    'homepage.ejs',
    'product-detail.ejs',
    'cart.ejs',
    'wishlist.ejs',
    'checkout.ejs',
    'success.ejs',
    'my-orders.ejs',
    'api-docs.ejs'
];

let hasErrors = false;

templates.forEach(tpl => {
    const filePath = path.join(viewsDir, tpl);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        ejs.render(content, mockData, { filename: filePath });
        console.log(`✅ ${tpl} compiled successfully!`);
    } catch (err) {
        console.error(`❌ Error compiling ${tpl}:`);
        console.error(err.stack);
        hasErrors = true;
    }
});

if (hasErrors) {
    process.exit(1);
} else {
    console.log('🎉 All views compiled without errors!');
}
