require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product'); 

const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/libaseikhlaq';
mongoose.connect(dbUri)
.then(() => console.log('🔄 Connected to MongoDB. Starting Seed Process...'))
.catch(err => console.error(err));

const products = [
    // --- UNSTITCHED ---
    { name: "Premium Wash & Wear", price: 4500, category: "unstitched", rating: 4.8, stock: 25, image: "/washnwear-premium.png" },
    { name: "Signature Cotton - White", price: 5200, category: "unstitched", rating: 4.9, stock: 15, image: "/cotton-white.png" },
    { name: "Classic Latha", price: 3800, category: "unstitched", rating: 4.5, stock: 40, image: "/white-latha-unstitched.png" },
    { name: "Blended Karandi", price: 4100, category: "unstitched", rating: 4.6, stock: 20, image: "/karandi.png" },
    { name: "Boski Fall Finish", price: 4800, category: "unstitched", rating: 4.7, stock: 18, image: "/boski-uns.png" },
    { name: "Egyptian Cotton Suit", price: 6500, category: "unstitched", rating: 5.0, stock: 10, image: "/egyptian-cotton.png" },
    { name: "Hard Finish Cotton", price: 3500, category: "unstitched", rating: 4.3, stock: 35, image: "/hardfinishcotton.png" },
    { name: "Summer Breeze Lawn", price: 3200, category: "unstitched", rating: 4.4, stock: 50, image: "/lawn.png" },
    { name: "Winter Wool Blend", price: 7500, category: "unstitched", rating: 4.8, stock: 12, image: "/wool-blended.png" },
    { name: "Royal Silk Unstitched", price: 8500, category: "unstitched", rating: 4.9, stock: 8, image: "/silk.png" },

    // --- KURTA PAJAMA  ---
    { name: "Classic White Kurta Pajama", price: 6500, category: "kurta-pajama", rating: 4.7, stock: 12, image: "/whitekurtapj.png" },
    { name: "Boski Kurta", price: 7200, category: "kurta-pajama", rating: 4.8, stock: 8, image: "/boski.png" },
    { name: "Black Shalwar Kameez", price: 8500, category: "kurta-pajama", rating: 4.9, stock: 14, image: "/black-kp.png " },
    { name: "Textured Cotton Suit", price: 7800, category: "kurta-pajama", rating: 4.6, stock: 22, image: "/white-cotton.png" },
    { name: "Grey Wash & Wear Kurta", price: 4500, category: "kurta-pajama", rating: 4.4, stock: 30, image: "/grey-kurta.png" },
     { name: "Navy Blue Classic Suit", price: 6800, category: "kurta-pajama", rating: 4.5, stock: 15, image: "/navyblue.png" },
    { name: "Maroon Embroidered Kameez", price: 7500, category: "kurta-pajama", rating: 4.6, stock: 18, image: "/maroon-emb.png" },
    { name: "Slate Grey Linen Kurta", price: 5500, category: "kurta-pajama", rating: 4.5, stock: 25, image: "/slatygreylinen.png" },
    { name: "Olive Green Shalwar Suit", price: 6200, category: "kurta-pajama", rating: 4.7, stock: 20, image: "/olivegreen.png" },
    { name: "Premium White Latha Suit", price: 8000, category: "kurta-pajama", rating: 4.8, stock: 10, image: "/white-latha.png" },

    // --- WAISTCOATS ---
    { name: "Waistcoat - Maroon", price: 8500, category: "waistcoats", rating: 4.8, stock: 10, image: "/maroon-wc.png" },
    { name: "Velvet Embroidered", price: 12500, category: "waistcoats", rating: 5.0, stock: 4, image: "/velvetemb-wc.png" },
    { name: "Black Waistcoat", price: 6800, category: "waistcoats", rating: 4.7, stock: 18, image: "/classicblack-wc.png" },
    { name: "Textured Raw Silk", price: 9500, category: "waistcoats", rating: 4.9, stock: 6, image: "/silk-wc.png" },
    { name: "Festive Waistcoat", price: 11000, category: "waistcoats", rating: 4.8, stock: 5, image: "/festive.png" },
    { name: "Slate Grey Suiting", price: 7200, category: "waistcoats", rating: 4.5, stock: 14, image: "/slategrey-wc.png" },
    { name: "Navy Blue", price: 8200, category: "waistcoats", rating: 4.6, stock: 15, image: "/navyblue.png" },
    { name: "Beige Summer Waistcoat", price: 6500, category: "waistcoats", rating: 4.4, stock: 22, image: "/beige-wc.png" },
    { name: "Emerald Green Silk", price: 10500, category: "waistcoats", rating: 4.9, stock: 7, image: "/emgreensilk-wc.png" },
    { name: "Charcoal Grey Premium", price: 8800, category: "waistcoats", rating: 4.7, stock: 11, image: "/charcoal-wc.png" },

    // --- FRAGRANCE ---
    { name: "J. Zarar Eau De Parfum", price: 4800, category: "fragrance", rating: 4.9, stock: 40, image: "/zarar.png" },
    { name: "J. Wasim Akram 414", price: 5500, category: "fragrance", rating: 4.8, stock: 35, image: "/414.png" },
    { name: "MTJ Oudh-e-Tariq", price: 6500, category: "fragrance", rating: 5.0, stock: 20, image: "/mtjoud.png" },
    { name: "J. Vocal by Junaid Jamshed", price: 4200, category: "fragrance", rating: 4.6, stock: 50, image: "/vocal.png" },
    { name: "MTJ Musk-e-Rijal", price: 5200, category: "fragrance", rating: 4.7, stock: 25, image: "/mtjmusk.png" },
    { name: "J. Khumar Pour Homme", price: 3800, category: "fragrance", rating: 4.5, stock: 45, image: "/khumar.png" },
    { name: "MTJ Itr-e-Gilgit", price: 3200, category: "fragrance", rating: 4.4, stock: 30, image: "/mtjitr.png" },
    { name: "J. Janan Signature", price: 5800, category: "fragrance", rating: 4.9, stock: 28, image: "/janan.png" },
    { name: "MTJ Amber Classic", price: 4500, category: "fragrance", rating: 4.5, stock: 32, image: "/redamber.png" },
    { name: "J. Essence of Arabia", price: 6200, category: "fragrance", rating: 4.8, stock: 15, image: "/essence.png" },
    { name: "MTJ Musk Pro", price: 7000, category: "fragrance", rating: 5.0, stock: 12, image: "/muskpro.png" },

    // --- ACCESSORIES ---

    { name: "Silver Cufflinks", price: 2200, category: "accessories", rating: 4.5, stock: 60, image: "/silvercuff.png" },
    { name: "Gold-Plated Cufflinks", price: 2800, category: "accessories", rating: 4.6, stock: 40, image: "/goldcuff.png" },
    { name: "Leather Wallet", price: 3200, category: "accessories", rating: 4.6, stock: 45, image: "/wallet.png" },
   
];


const distributeStock = (totalStock) => {
    const sizes = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };
    if (totalStock <= 0) return sizes;
    
    // Proportions: XS (15%), S (20%), M (30%), L (20%), XL (15%)
    const proportions = { XS: 0.15, S: 0.20, M: 0.30, L: 0.20, XL: 0.15 };
    let distributedSum = 0;
    
    const sizeKeys = ['XS', 'S', 'M', 'L'];
    for (let size of sizeKeys) {
        sizes[size] = Math.round(totalStock * proportions[size]);
        distributedSum += sizes[size];
    }
    sizes.XL = Math.max(0, totalStock - distributedSum);
    return sizes;
};

const seedDB = async () => {
    try {
        await Product.deleteMany({});
        
        const processedProducts = products.map(p => {
            if (p.category === 'kurta-pajama' || p.category === 'waistcoats') {
                const sizes = distributeStock(p.stock);
                return {
                    ...p,
                    sizes,
                    stock: Object.values(sizes).reduce((a, b) => a + b, 0)
                };
            }
            return p;
        });

        await Product.insertMany(processedProducts);
        console.log(`✅ Successfully seeded ${processedProducts.length} products!`);
        mongoose.connection.close(); 
    } catch (error) {
        console.error("❌ Error seeding database:", error);
    }
};

seedDB();