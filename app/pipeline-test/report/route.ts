/**
 * Collection point for the browser-side pipeline test. Development only —
 * deleted along with the harness once Phase 3 is exercised on real devices.
 *
 * Exists because headless Chrome cannot be made to wait for async browser work:
 * --virtual-time-budget pauses while any network fetch is pending, and both the
 * dev server's HMR socket and the production build's analytics script keep one
 * open forever. So the page reports its own results and we poll for them.
 */
let latest: unknown = null

export async function POST(request: Request) {
  latest = await request.json()
  return Response.json({ ok: true })
}

export async function GET() {
  return Response.json(latest ?? { pending: true })
}
