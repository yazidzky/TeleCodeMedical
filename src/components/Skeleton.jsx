/**
 * Phantom UI Skeleton — animated shimmer placeholders.
 * Usage:
 *   <Skeleton className="h-4 w-32 rounded" />
 *   <SkeletonCard lines={3} />
 *   <SkeletonTable rows={5} cols={4} />
 */
import { motion } from 'framer-motion';

const shimmer = {
  initial: { backgroundPosition: '-400px 0' },
  animate: {
    backgroundPosition: ['−400px 0', '400px 0'],
    transition: { repeat: Infinity, duration: 1.4, ease: 'linear' },
  },
};

/** Base shimmer block — use `className` to set size & shape */
export function Skeleton({ className = '' }) {
  return (
    <motion.div
      className={`relative overflow-hidden bg-gray-100 ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(90deg, #f0f0f0 0px, #e8e8e8 40px, #f0f0f0 80px)',
        backgroundSize: '800px 100%',
      }}
      initial={{ backgroundPosition: '-400px 0' }}
      animate={{ backgroundPosition: ['−400px 0', '800px 0'] }}
      transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
    />
  );
}

/** Card skeleton with avatar + text lines */
export function SkeletonCard({ lines = 2, showAvatar = false }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      {showAvatar && (
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 rounded-full ${i === lines - 1 ? 'w-3/5' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

/** Table skeleton */
export function SkeletonTable({ rows = 4, cols = 4 }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* header */}
      <div className="grid gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 rounded-full" />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r}
          className="grid gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-3 rounded-full ${c === cols - 1 ? 'w-2/3' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Stat tile skeleton */
export function SkeletonStat() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24 rounded-full" />
        <Skeleton className="w-8 h-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-16 rounded-lg" />
      <Skeleton className="h-2.5 w-3/4 rounded-full" />
    </div>
  );
}

/** Full page skeleton (Dashboard-like) */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* hero */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-4">
        <Skeleton className="h-4 w-48 rounded-full" />
        <Skeleton className="h-9 w-96 rounded-xl" />
        <Skeleton className="h-9 w-72 rounded-xl" />
        <Skeleton className="h-4 w-80 rounded-full" />
        <Skeleton className="h-4 w-64 rounded-full" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-11 w-44 rounded-xl" />
          <Skeleton className="h-11 w-44 rounded-xl" />
        </div>
      </div>
      {/* stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <SkeletonStat key={i} />)}
      </div>
      {/* cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} lines={3} showAvatar />)}
      </div>
    </div>
  );
}
