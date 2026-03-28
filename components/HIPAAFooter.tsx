import Link from 'next/link';

export default function HIPAAFooter() {
  return (
    <footer className="mt-12 pb-20 sm:pb-8 px-4">
      <div className="max-w-4xl mx-auto border-t border-gray-200 pt-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>⚠ Medical Disclaimer:</strong> This application is for health tracking and research purposes only. AI-generated analysis does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider. In an emergency, call <strong>911</strong>.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
          <span>🔒 PHI — Authorized Access Only</span>
          <Link href="/privacy" className="hover:text-gray-600 underline" style={{ minHeight: 'unset' }}>Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-600 underline" style={{ minHeight: 'unset' }}>Terms of Service</Link>
          <span>© {new Date().getFullYear()} Health Wiz</span>
        </div>
      </div>
    </footer>
  );
}
