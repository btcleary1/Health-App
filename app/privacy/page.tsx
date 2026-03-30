import { Activity } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="flex items-center gap-2 mb-8 text-gray-600 hover:text-gray-900">
          <Activity className="w-5 h-5 text-red-600" />
          <span className="font-semibold">Health Wiz</span>
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="prose prose-sm text-gray-700 space-y-6">

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>About this application:</strong> Health Wiz is a private, personal health tracking application. It is not a healthcare provider, health plan, or healthcare clearinghouse, and is not subject to HIPAA as a covered entity. We are not affiliated with or certified by any regulatory health authority. This app is a personal tool for organizing and tracking health information.
              </p>
            </div>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">1. Overview</h2>
              <p>Health Wiz is a private health tracking application intended for authorized users to organize, track, and share personal health information with their care team. All data is treated with strict confidentiality and is never sold or shared for commercial purposes.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">2. Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Health event records including symptoms, vitals, and notes</li>
                <li>Medical documents, lab results, and imaging files you upload</li>
                <li>Doctor visit notes and care team information</li>
                <li>Medication records and dosage information</li>
                <li>Questions and focus areas submitted for AI analysis</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">3. How We Use Your Information</h2>
              <p>Information you enter is used solely to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Display health tracking data within the application</li>
                <li>Generate AI-assisted research summaries for discussion with your doctor</li>
                <li>Produce briefing documents for medical appointments</li>
              </ul>
              <p className="mt-2">We do not use your health information for advertising, profiling, or any commercial purpose.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">4. Third-Party Services</h2>
              <p className="font-semibold text-orange-700 mb-2">⚠ AI Analysis — Data Transmission Disclosure</p>
              <p>When you use the AI Medical Analysis feature, the following information is transmitted to Anthropic, Inc. via their API:</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>Patient name, age, and primary medical concern</li>
                <li>Medication list with dosages</li>
                <li>Health event history including notes</li>
                <li>Care team information</li>
              </ul>
              <p>Anthropic processes this data to generate responses. By using the AI Analysis feature, you consent to this transmission. Review Anthropic's privacy policy at <span className="text-blue-600">anthropic.com/privacy</span>.</p>

              <p className="mt-3 font-semibold text-orange-700">⚠ File Storage</p>
              <p className="mt-1">Files you upload are stored using Vercel Blob, a cloud storage service operated by Vercel, Inc. Review Vercel's privacy policy at <span className="text-blue-600">vercel.com/legal/privacy-policy</span>.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">5. Data Security &amp; Isolation</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>All data is transmitted over encrypted HTTPS connections</li>
                <li>Access requires a verified account with a strong password and optional biometric authentication</li>
                <li>Each user's health data is stored in a separate, isolated namespace in Vercel Blob — no user can access another user's data</li>
                <li>We do not share your information with any third party except as disclosed above</li>
                <li>No data is sold or used for advertising purposes</li>
                <li>Biometric credentials (Face ID / Touch ID / fingerprint) are stored on your device only — we store only a cryptographic public key, never your biometric itself</li>
                <li>Session tokens are cryptographically signed and expire after 7 days</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">6. Data Retention &amp; Account Data</h2>
              <p>Health event data is stored in Vercel Blob cloud storage under your unique account, isolated from all other users. Uploaded files remain in storage until manually deleted by you or an administrator. Your account — including all associated health data — can be deleted at any time by an administrator upon your request.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">7. Minor's Data</h2>
              <p>This application may be used to track health information for a minor child. All access is restricted to authorized users — parents, guardians, or healthcare providers designated by the family. No data about minors is shared with unauthorized parties.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">8. Your Rights</h2>
              <p>As an authorized user, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Access all data displayed in this application</li>
                <li>Delete uploaded files at any time</li>
                <li>Withdraw consent for AI analysis at any time by not using that feature</li>
                <li>Request deletion of any stored data by contacting the application administrator</li>
                <li>Remove your biometric login at any time via Settings</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">9. Medical Disclaimer</h2>
              <p className="text-red-700 font-medium">This application does not provide medical advice and is not a medical device. AI-generated analysis is for informational and research purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult a qualified, licensed healthcare provider for all medical decisions.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">10. Regulatory Status</h2>
              <p>Health Wiz is a private personal health tracking tool. It is not a covered entity under HIPAA, not an FDA-regulated medical device, and not affiliated with any regulatory health authority. It does not replace professional medical care.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">11. Contact</h2>
              <p>For privacy-related questions or data deletion requests, contact the application administrator directly.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
