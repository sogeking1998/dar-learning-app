// Vercel serverless function: issues a short-lived presigned PUT URL so the
// browser can upload a video straight to Cloudflare R2. The R2 secret never
// leaves the server — it lives only in Vercel env vars (and local .env).
import { AwsClient } from 'aws4fetch'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_PUBLIC_BASE,
  } = process.env

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_BASE) {
    res.status(500).json({ error: 'R2 is not configured on the server (missing env vars).' })
    return
  }

  // Vercel parses JSON bodies automatically; guard for string bodies too.
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const courseId = Number.isFinite(+body.courseId) ? String(+body.courseId) : 'misc'
  const ext = String(body.ext || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'
  const key = `videos/session-${courseId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const aws = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    region: 'auto',
    service: 's3',
  })

  // Presign a PUT (query-string auth) valid for 10 minutes.
  const signed = await aws.sign(`${endpoint}/${R2_BUCKET}/${key}?X-Amz-Expires=600`, {
    method: 'PUT',
    aws: { signQuery: true },
  })

  res.status(200).json({
    uploadUrl: signed.url,
    publicUrl: `${R2_PUBLIC_BASE.replace(/\/$/, '')}/${key}`,
    key,
  })
}
