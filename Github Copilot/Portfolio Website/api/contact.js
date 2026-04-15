function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const rateLimitStore = new Map();

function getClientIp(req) {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
        return forwardedFor.split(",")[0].trim();
    }

    return req.socket?.remoteAddress || "unknown";
}

function pruneRateLimitStore(now) {
    for (const [key, value] of rateLimitStore.entries()) {
        if (value.resetAt <= now) {
            rateLimitStore.delete(key);
        }
    }
}

function isRateLimited(clientIp, now) {
    const maxRequests = Number(process.env.CONTACT_RATE_LIMIT_MAX || 5);
    const windowMs = Number(process.env.CONTACT_RATE_LIMIT_WINDOW_MS || 600000);

    pruneRateLimitStore(now);

    const entry = rateLimitStore.get(clientIp);

    if (!entry || entry.resetAt <= now) {
        rateLimitStore.set(clientIp, {
            count: 1,
            resetAt: now + windowMs
        });
        return false;
    }

    if (entry.count >= maxRequests) {
        return true;
    }

    entry.count += 1;
    rateLimitStore.set(clientIp, entry);
    return false;
}

function containsSuspiciousLinks(value) {
    const links = value.match(/https?:\/\//gi);
    return (links || []).length > 2;
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const now = Date.now();
    const clientIp = getClientIp(req);

    if (isRateLimited(clientIp, now)) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    const { name, email, subject, message, company, formStartedAt } = req.body || {};
    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim();
    const normalizedSubject = String(subject || "").trim();
    const normalizedMessage = String(message || "").trim();
    const normalizedCompany = String(company || "").trim();
    const startedAt = Number(formStartedAt || 0);

    if (!normalizedName || !normalizedEmail || !normalizedSubject || !normalizedMessage) {
        return res.status(400).json({ error: "All fields are required." });
    }

    if (normalizedCompany) {
        return res.status(400).json({ error: "Spam detected." });
    }

    if (!Number.isFinite(startedAt) || now - startedAt < 3000) {
        return res.status(400).json({ error: "Submission was too fast. Please try again." });
    }

    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: "Please provide a valid email address." });
    }

    if (containsSuspiciousLinks(normalizedSubject) || containsSuspiciousLinks(normalizedMessage)) {
        return res.status(400).json({ error: "Please reduce links in your message and try again." });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.CONTACT_TO_EMAIL;
    const fromEmail = process.env.CONTACT_FROM_EMAIL;

    if (!resendApiKey || !toEmail || !fromEmail) {
        return res.status(500).json({ error: "Server email configuration is incomplete." });
    }

    try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: fromEmail,
                to: [toEmail],
                subject: `Portfolio Contact: ${normalizedSubject}`,
                reply_to: normalizedEmail,
                text: [
                    `Name: ${normalizedName}`,
                    `Email: ${normalizedEmail}`,
                    `Client IP: ${clientIp}`,
                    "",
                    "Message:",
                    normalizedMessage
                ].join("\n")
            })
        });

        if (!resendResponse.ok) {
            const resendError = await resendResponse.text();
            return res.status(502).json({ error: `Email service error: ${resendError}` });
        }

        return res.status(200).json({ success: true });
    } catch (_error) {
        return res.status(500).json({ error: "Failed to process your request." });
    }
};