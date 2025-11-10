import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Get the admin password from environment variable
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin'

        if (!credentials?.password) {
          return null
        }

        // Simple password check (in production, use bcrypt or similar)
        if (credentials.password === adminPassword) {
          return {
            id: '1',
            name: 'Admin',
            email: 'admin@portfolio.local',
          }
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
