/** Railway healthcheck (does not call FastAPI). */
export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    ok: true,
    service: 'code-migration-web',
    unified: process.env.UNIFIED_DEPLOY === '1',
  })
}
