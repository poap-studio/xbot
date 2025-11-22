/**
 * NextAuth v5 Configuration
 * Handles user authentication with Twitter OAuth
 */

import NextAuth from 'next-auth';
import Twitter from 'next-auth/providers/twitter';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Add Twitter user ID to the token
      if (account && profile && profile.id) {
        token.id = profile.id;
        token.username = (profile as any).data?.username || (profile as any).username || '';
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID to the session
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.username = token.username || '';
      }
      return session;
    },
  },
  pages: {
    signIn: '/claim', // Redirect to claim page for sign in
    error: '/claim',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
});
