import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Panel - Photography Portfolio',
  description: 'Admin panel for managing portfolio images',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
