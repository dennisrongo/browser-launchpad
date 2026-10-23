import { useEffect, useState } from 'react'

interface UpdatedAgoProps {
  fetchedAt: number | null
  className?: string
}

const MINUTE = 60 * 1000

export function UpdatedAgo({ fetchedAt, className }: UpdatedAgoProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (fetchedAt === null) return null
  const minutes = Math.floor((Math.max(now, fetchedAt) - fetchedAt) / MINUTE)
  if (minutes < 1) return null

  return <span className={className}>Updated {minutes} min ago</span>
}
