import { LoadingStatus } from '@/components/loading-status'

export default function EventLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <LoadingStatus title="Betöltés…" />
    </div>
  )
}
