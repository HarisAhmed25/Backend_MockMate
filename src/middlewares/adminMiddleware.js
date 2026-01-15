/**
 * Middleware to restrict access to admin-only routes.
 * Should be used AFTER authMiddleware.
 */
const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Not authorized, user data missing" });
    }

    try {
        // Fetch latest user data from DB to ensure role is current
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role === 'admin' || user.role === 'super-admin') {
            // Attach full user object to req for downstream use
            req.user = user;
            next();
        } else {
            res.status(403).json({
                success: false,
                message: "Access denied. Admin privileges required.",
                requiredRole: "admin",
                currentRole: user.role || "user"
            });
        }
    } catch (error) {
        console.error("Admin Middleware Error:", error);
        res.status(500).json({ message: "Internal server error during authorization" });
    }
};

module.exports = adminMiddleware;
