"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const alerts_1 = require("../services/alerts");
const router = (0, express_1.Router)();
// Recent alerts (employees/admins)
router.get('/recent', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('employee'), async (_req, res) => {
    res.json({ alerts: (0, alerts_1.getRecent)() });
});
// SSE stream
router.get('/stream', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('employee'), async (req, res) => {
    var _a;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Allow CORS preconfigured globally; include credentials.
    (_a = res.flushHeaders) === null || _a === void 0 ? void 0 : _a.call(res);
    (0, alerts_1.subscribe)(res);
    const hb = setInterval(() => {
        try {
            res.write(`: ping ${Date.now()}\n\n`);
        }
        catch { }
    }, 20000);
    req.on('close', () => { clearInterval(hb); (0, alerts_1.unsubscribe)(res); try {
        res.end();
    }
    catch { } });
});
exports.default = router;
//# sourceMappingURL=alerts.js.map