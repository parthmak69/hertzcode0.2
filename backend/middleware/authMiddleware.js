import { verifyToken } from '../utils/authHelper.js';

/**
 * Production-ready Authentication Guard Middleware for Express routing.
 * Ensures the Bearer access token is valid and attaches decoded user to req.user.
 */
export function checkAuth(req, res, next) {
    const adminUser = verifyToken(req);
    if (!adminUser) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Missing, invalid, or expired access token. Please login again.'
        });
    }
    req.user = adminUser;
    next();
}

export default checkAuth;
