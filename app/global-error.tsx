'use client';

import './globals.css';
import LegalFooter from '@/components/LegalFooter';

// Shown when a page or the root layout crashes. It replaces the root layout, so it renders its own
// footer (copyright, "Not medical advice. In an emergency, call 911.", Terms and Privacy) to keep the
// legal line on every page, error pages included (Cleary suite legal baseline).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#050814', color: '#E5E7EB' }}>
        <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12 text-center">
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-400 mb-2">The app hit an error. Try again, or reload the page.</p>
          <p className="text-sm text-gray-400 mb-5">If this is a medical emergency, call 911 now.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-blue-500 text-white font-semibold"
          >
            Try again
          </button>
        </main>
        <LegalFooter />
      </body>
    </html>
  );
}
