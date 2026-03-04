import { ReactNode } from 'react'

interface MainContainerProps {
  children: ReactNode
  className?: string
}

export function MainContainer({ children, className = '' }: MainContainerProps) {
  return (
    <main className={`p-4 sm:p-6 min-h-[calc(100vh-80px)] bg-gradient-mesh ${className}`}>
      {children}
    </main>
  )
}
