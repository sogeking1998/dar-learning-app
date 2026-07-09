import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { AwsClient } from 'aws4fetch'

// `vite` does not run the Vercel serverless functions in `frontend/api`, so in
// local dev we serve /api/r2-presign here with the same logic. The R2 secrets are
// read server-side only (no VITE_ prefix), so they never reach the browser.
function r2PresignDev(env) {
  return {
    name: 'r2-presign-dev',
    configureServer(server) {
      // Added directly in configureServer → runs before Vite's internal
      // middlewares (including the /api proxy below), so this wins the route.
      server.middlewares.use('/api/r2-presign', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        res.setHeader('Content-Type', 'application/json')

        const {
          R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE,
        } = env

        if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_BASE) {
          res.statusCode = 500
          res.end(JSON.stringify({
            error: 'R2 is not configured. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_BASE to frontend/.env, then restart the dev server.',
          }))
          return
        }

        try {
          let raw = ''
          for await (const chunk of req) raw += chunk
          const body = JSON.parse(raw || '{}')

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
          const signed = await aws.sign(`${endpoint}/${R2_BUCKET}/${key}?X-Amz-Expires=600`, {
            method: 'PUT',
            aws: { signQuery: true },
          })

          res.statusCode = 200
          res.end(JSON.stringify({
            uploadUrl: signed.url,
            publicUrl: `${R2_PUBLIC_BASE.replace(/\/$/, '')}/${key}`,
            key,
          }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: `Presign failed: ${e.message}` }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // '' prefix → load every var from .env (not just VITE_*), for server-side use.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), r2PresignDev(env)],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  }
})
