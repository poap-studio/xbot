/**
 * NextAuth v5 Configuration
 * Handles user authentication with Twitter OAuth
 */

import NextAuth from 'next-auth';
import Twitter from 'next-auth/providers/twitter';

const baseUrl = process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://xbot.poap.studio';

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: '/api/auth',
  trustHost: true, // Required for Vercel and other hosted environments
  providers: [
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID?.trim()!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET?.trim()!,
      authorization: {
        url: 'https://twitter.com/i/oauth2/authorize',
        params: {
          scope: 'tweet.read users.read offline.access', // Minimal scopes for user login
        },
      },
      token: 'https://api.twitter.com/2/oauth2/token',
      userinfo: 'https://api.twitter.com/2/users/me',
      profile(profile: any) {
        console.log('=== RAW TWITTER PROFILE ===');
        console.log('Full profile:', JSON.stringify(profile, null, 2));
        console.log('============================');

        // Twitter OAuth 2.0 returns user data in a 'data' object
        const userData = profile.data || profile;

        return {
          id: userData.id || profile.id,
          name: userData.name || profile.name,
          email: userData.email ?? null,
          image: userData.profile_image_url || profile.profile_image_url,
          username: userData.username || profile.username, // Add username to the profile
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, trigger }) {
      console.log('=== JWT CALLBACK ===');
      console.log('Trigger:', trigger);
      console.log('Has account:', !!account);
      console.log('Has profile:', !!profile);

      // Add Twitter user ID and username to the token on first sign in
      if (account && profile) {
        console.log('=== TWITTER JWT CALLBACK (FIRST SIGN IN) ===');
        console.log('Account:', JSON.stringify(account, null, 2));
        console.log('Profile:', JSON.stringify(profile, null, 2));
        console.log('=============================================');

        // Store Twitter user ID from account.providerAccountId (the actual Twitter ID)
        token.twitterId = account.providerAccountId;
        token.id = account.providerAccountId;
        token.username = (profile as any).username || (profile as any).name || '';
      }

      console.log('Token after:', JSON.stringify(token, null, 2));
      console.log('====================');
      return token;
    },
    async session({ session, token }) {
      console.log('=== SESSION CALLBACK ===');
      console.log('Token:', JSON.stringify(token, null, 2));
      console.log('Session before:', JSON.stringify(session, null, 2));

      // Add user ID to the session
      // Use token.sub (standard JWT subject) as the user ID
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.username = (token.username as string) || (token.name as string) || '';
      }

      console.log('Session after:', JSON.stringify(session, null, 2));
      console.log('========================');
      return session;
    },
  },
  pages: {
    signIn: '/', // Redirect to home page for sign in
    error: '/',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET?.trim(),
});
