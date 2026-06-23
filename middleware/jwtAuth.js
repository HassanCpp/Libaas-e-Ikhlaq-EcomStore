const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // 1. Look for the token in the request headers
    const authHeader = req.header('Authorization');

    // 2. If there is no header, or it doesn't start with "Bearer ", deny access
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: "Access Denied. No token provided." 
        });
    }

    // 3. Extract the actual token string (removing the word "Bearer ")
    const token = authHeader.split(' ')[1];

    try {
        // 4. Mathematically verify the token using your secret key
        const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);
        
        // 5. Attach the decrypted user data to the request so the controller can use it
        req.user = verifiedUser;
        
        // 6. Move to the next function on the assembly line!
        next();
    } catch (err) {
        // If the token is fake, expired, or tampered with, it throws an error
        res.status(403).json({ 
            success: false, 
            message: "Invalid or Expired Token." 
        });
    }
};

module.exports = { verifyToken };