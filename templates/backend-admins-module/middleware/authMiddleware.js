import { verifyToken } from '../utils/authHelper.js';

/**
 * Authentication check middleware for Express routing.
 * Ensures the Bearer access token is valid and sets req.user.
 */
function checkAuth(req, res, next) {
    const adminUser = verifyToken(req);
    if (!adminUser) {
        return res.status(401).json({ success: false, message: 'Unauthorized access token.' });
    }
    req.user = adminUser;
    next();
}

export default checkAuth;

