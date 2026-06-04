/** Railway deploy probe: web process only (must not wait for FastAPI). */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: 'code-migration-web',
      live: true,
    },
    { status: 200 },
  )
}
