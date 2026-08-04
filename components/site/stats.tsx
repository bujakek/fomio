'use client'

import { useCountUp } from './use-count-up'

interface Stat {
  end: number
  format: (v: number) => string
  label: string
}

const stats: Stat[] = [
  {
    end: 4.9,
    format: (v) => v.toLocaleString('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    label: 'átlagos értékelés',
  },
  {
    end: 3.2,
    format: (v) => `${v.toLocaleString('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} millió`,
    label: 'összegyűjtött fotó',
  },
  {
    end: 12400,
    format: (v) => `${Math.round(v).toLocaleString('hu-HU')}+`,
    label: 'megörökített esemény',
  },
  {
    end: 0,
    format: () => '0',
    label: 'letöltendő alkalmazás',
  },
]

function StatCard({ stat, delay }: { stat: Stat; delay: number }) {
  const { ref, value } = useCountUp(stat.end)
  return (
    <div
      ref={ref}
      className="glass glass-hover flex flex-col items-center rounded-3xl px-6 py-8 text-center"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="text-gradient text-4xl font-semibold tracking-tight sm:text-5xl">
        {stat.format(value)}
      </span>
      <span className="mt-2 text-sm text-muted-foreground">{stat.label}</span>
    </div>
  )
}

export function Stats() {
  return (
    <section className="relative px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} delay={i * 80} />
        ))}
      </div>
    </section>
  )
}
