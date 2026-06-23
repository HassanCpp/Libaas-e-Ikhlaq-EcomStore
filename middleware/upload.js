const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
} catch (err) {
    console.warn('⚠️ Warning: Could not create uploads directory:', err.message);
}

// Allowed image extensions (whitelist)
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// 1. Configure Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Tell Multer to save files in the public/uploads folder
        cb(null, uploadsDir); 
    },
    filename: function (req, file, cb) {
        // Force a safe extension from the whitelist
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// 2. File Filter (Security) — validates BOTH mimetype AND extension
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidMime = file.mimetype.startsWith('image/');
    const isValidExt = ALLOWED_EXTENSIONS.includes(ext);

    if (isValidMime && isValidExt) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, JPEG, PNG, GIF, and WEBP images are allowed.'), false);
    }
};

// 3. Initialize Multer
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // Limit file size to 5MB
});

module.exports = upload;