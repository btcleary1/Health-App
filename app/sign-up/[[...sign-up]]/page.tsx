'use client';

import { useState } from 'react';
import { SignUp } from '@clerk/nextjs';
import { Activity } from 'lucide-react';

export default function SignUpPage() {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-2xl mb-3">
          <Activity className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Request Access</h1>
        <p className="text-sm text-gray-500 mt-1">Ethan's Health Dashboard — Authorized users only</p>
      </div>

      {/* T&C consent — must agree before showing sign-up form */}
      {!agreed ? (
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Before Creating Your Account</h2>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>⚠ HIPAA Notice:</strong> This application contains Protected Health Information (PHI) for a minor child. Unauthorized access is prohibited and may be subject to civil and criminal penalties.
            </p>
          </div>

          <div className="space-y-3 mb-5 text-xs text-gray-700">
            <p className="font-semibold text-gray-900">By creating an account, you confirm that:</p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>You are a parent, guardian, or authorized healthcare provider for Ethan Alvarez</li>
              <li>You have been explicitly authorized by the family to access this application</li>
              <li>You will keep your login credentials confidential</li>
              <li>You will not share access with unauthorized individuals</li>
              <li>AI-generated analysis does not constitute medical advice</li>
              <li>In an emergency, you will call <strong>911</strong></li>
            </ul>
          </div>

          <label className="flex items-start gap-3 cursor-pointer mb-5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 shrink-0"
              style={{ minHeight: 'unset' }}
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              I am an authorized user. I have read and agree to the{' '}
              <a href="/terms" target="_blank" className="text-blue-600 underline" style={{ minHeight: 'unset' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" className="text-blue-600 underline" style={{ minHeight: 'unset' }}>Privacy Policy</a>.
              I understand this app contains PHI.
            </span>
          </label>

          <button
            onClick={() => setAgreed(true)}
            disabled={!agreed}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            I Agree — Continue to Create Account
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Already have access?{' '}
            <a href="/sign-in" className="text-blue-600 hover:underline" style={{ minHeight: 'unset' }}>Sign in</a>
          </p>
        </div>
      ) : (
        <div className="w-full max-w-sm">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-xs text-green-800">
            ✓ Terms accepted — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <SignUp
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-sm border border-gray-200 rounded-2xl',
              },
            }}
          />
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-6">
        <a href="/privacy" className="hover:underline">Privacy Policy</a>
        {' · '}
        <a href="/terms" className="hover:underline">Terms of Service</a>
      </p>
    </div>
  );
}
