/**
 * Soft, slowly drifting glow blobs + fine grain used as the page backdrop.
 * Purely decorative — and, until measured, the most expensive thing the app
 * drew. See `.glow-blob` in globals.css: it owns the blur and the animation,
 * and stops the drift on touch devices. Keep the blur out of the markup so
 * those two decisions cannot drift apart from each other.
 */
export function BackgroundGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,#0d0d12_0%,#050505_55%)]" />

      {/* lilac glow top-left */}
      <div className="glow-blob absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(150,120,255,0.16),transparent_70%)]" />
      {/* blue glow right */}
      <div className="glow-blob absolute top-1/3 -right-52 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(120,150,255,0.12),transparent_70%)] [animation-delay:-6s]" />
      {/* silver glow bottom */}
      <div className="glow-blob absolute bottom-[-10rem] left-1/4 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(210,214,229,0.08),transparent_70%)] [animation-delay:-12s]" />

      {/* grain */}
      <div className="grain absolute inset-0" />
    </div>
  )
}
