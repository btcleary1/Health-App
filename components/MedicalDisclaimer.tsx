import Link from 'next/link';
import { AlertTriangle, Lock } from 'lucide-react';

// Medical disclaimer shown under the health tools (AI analysis, doctor briefing, uploads).
export default function MedicalDisclaimer() {
  return (
    <footer className="mt-12 pb-20 sm:pb-8 px-4">
      <div className="max-w-4xl mx-auto border-t border-gray-200 pt-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            <AlertTriangle className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />
            <strong>Medical Disclaimer:</strong> This application is for health tracking and research purposes only. It is not medical advice, diagnosis, or treatment, and no doctor–patient relationship is created. AI-generated content comes from an AI, not a person or a doctor, and can be wrong. Always consult a qualified healthcare provider. In an emergency, call <strong>911</strong>.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
          <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" aria-hidden="true" /> Sensitive health data. Authorized access only.</span>
          <Link href="/privacy" className="hover:text-gray-600 underline" style={{ minHeight: 'unset' }}>Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-600 underline" style={{ minHeight: 'unset' }}>Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
