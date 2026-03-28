import { SignIn } from '@clerk/nextjs';
import { Activity } from 'lucide-react';

export const metadata = { title: 'Sign In' };

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-2xl mb-3">
          <Activity className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Ethan's Health Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Authorized access only — PHI protected</p>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full max-w-sm',
            card: 'shadow-sm border border-gray-200 rounded-2xl',
          },
        }}
      />

      <p className="text-center text-xs text-gray-400 mt-6">
        <a href="/privacy" className="hover:underline">Privacy Policy</a>
        {' · '}
        <a href="/terms" className="hover:underline">Terms of Service</a>
      </p>
    </div>
  );
}
