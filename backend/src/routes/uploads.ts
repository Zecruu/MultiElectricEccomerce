import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';


const router = Router();

router.post('/sign', requireAuth(), requireRole('employee'), async (req, res) => {
  try{
    const { folder = 'products' } = req.body || {};
    const region = process.env.AWS_REGION;
    const bucket = process.env.S3_BUCKET;
    if (!region || !bucket){
      return res.status(501).json({ error: 'Uploads provider not configured' });
    }

    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-\${filename}`;
    const s3 = new S3Client({ region });
    const { url, fields } = await createPresignedPost(s3, {
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
  }catch(err){
    console.error('S3 sign error', err);
    return res.status(500).json({ error: 'Failed to sign upload' });
  }
});

export default router;

