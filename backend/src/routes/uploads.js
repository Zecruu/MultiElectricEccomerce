"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_presigned_post_1 = require("@aws-sdk/s3-presigned-post");
const router = (0, express_1.Router)();
router.post('/sign', (0, auth_1.requireAuth)(), (0, auth_1.requireRole)('employee'), async (req, res) => {
    try {
        const { folder = 'products' } = req.body || {};
        const region = process.env.AWS_REGION;
        const bucket = process.env.S3_BUCKET;
        if (!region || !bucket) {
            return res.status(501).json({ error: 'Uploads provider not configured' });
        }
        const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-\${filename}`;
        const s3 = new client_s3_1.S3Client({ region });
        const { url, fields } = await (0, s3_presigned_post_1.createPresignedPost)(s3, {
            Bucket: bucket,
            Key: key,
            Expires: 300,
            Fields: { acl: 'public-read' },
            Conditions: [
                ["content-length-range", 0, 10_000_000],
                ["starts-with", "$Content-Type", "image/"],
                { acl: 'public-read' }
            ],
        });
        return res.json({ provider: 's3', url, fields });
    }
    catch (err) {
        console.error('S3 sign error', err);
        return res.status(500).json({ error: 'Failed to sign upload' });
    }
});
exports.default = router;
//# sourceMappingURL=uploads.js.map