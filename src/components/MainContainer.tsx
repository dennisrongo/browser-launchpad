import { ReactNode } from 'react'

interface MainContainerProps {
  children: ReactNode
  className?: string
}

export function MainContainer({ children, className = '' }: MainContainerProps) {
  return (
    <main className={`p-6 ${className}`}>
      {children}
    </main>
  )
}
