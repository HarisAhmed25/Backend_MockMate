const rateLimitMap = new Map();

/**
 * Simple in-memory rate limiter middleware.
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum requests per window
 */
const rateLimiter = (windowMs, maxRequests) => {
    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const now = Date.now();
        console.log(`[RATE_LIMIT] Checking IP: ${ip} for window ${windowMs}ms, max ${maxRequests}`);

        if (!rateLimitMap.has(ip)) {
            rateLimitMap.set(ip, []);
        }

        let requests = rateLimitMap.get(ip);

        // Filter out requests outside the current window
        requests = requests.filter(timestamp => now - timestamp < windowMs);

        if (requests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later.'
            });
        }

        requests.push(now);
        rateLimitMap.set(ip, requests);
        next();
    };
};

module.exports = rateLimiter;
