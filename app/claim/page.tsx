/**
 * Claim Page - Redirect to Home
 * This route redirects to the home page (/) which handles claim functionality
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClaimRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
