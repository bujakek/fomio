/**
 * Soft, slowly drifting glow blobs + fine grain used as the page backdrop.
 * Purely decorative.
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
      <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] animate-glow-drift rounded-full bg-[radial-gradient(circle,rgba(150,120,255,0.16),transparent_70%)] blur-3xl" />
      {/* blue glow right */}
      <div className="absolute top-1/3 -right-52 h-[40rem] w-[40rem] animate-glow-drift rounded-full bg-[radial-gradient(circle,rgba(120,150,255,0.12),transparent_70%)] blur-3xl [animation-delay:-6s]" />
      {/* silver glow bottom */}
      <div className="absolute bottom-[-10rem] left-1/4 h-[34rem] w-[34rem] animate-glow-drift rounded-full bg-[radial-gradient(circle,rgba(210,214,229,0.08),transparent_70%)] blur-3xl [animation-delay:-12s]" />

      {/* grain */}
      <div className="grain absolute inset-0" />
    </div>
  )
}
