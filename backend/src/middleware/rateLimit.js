const buckets = new Map();

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || "unknown";
}

function emailKey(req) {
  return String(req.body?.email || "").trim().toLowerCase();
}

export function rateLimit({ windowMs, max, keyPrefix, message }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${clientKey(req)}:${emailKey(req)}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message });
    }

    current.count += 1;
    buckets.set(key, current);
    next();
  };
}
