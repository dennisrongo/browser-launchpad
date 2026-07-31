import { Link } from 'lucide-react'

import { getBookmarkIconDisplay } from '../utils/favicon'

interface BookmarkIconProps {
  url: string
  icon?: string
  className?: string
}

export function BookmarkIcon({ url, icon, className = 'w-4 h-4' }: BookmarkIconProps) {
  const display = getBookmarkIconDisplay(url, icon)

  if (display.type === 'image') {
    return (
      <img
        src={display.content}
        alt=""
        draggable={false}
        className={`${className} flex-shrink-0 object-contain rounded`}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }

  if (display.type === 'emoji') {
    return (
      <span
        className={`${className} flex-shrink-0 flex items-center justify-center text-sm leading-none`}
        aria-hidden
      >
        {display.content}
      </span>
    )
  }

  return <Link className={`${className} flex-shrink-0 text-text-muted`} />
}
