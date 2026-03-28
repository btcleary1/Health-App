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

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">1. Overview</h2>
              <p>This application ("Health Wiz Dashboard") is a private, family-operated health tracking tool for Ethan Alvarez, a minor child. It is not a covered entity under HIPAA, but we treat all information with the same level of care and confidentiality as Protected Health Information (PHI).</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">2. Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cardiac event records including symptoms, vitals, and parent notes</li>
                <li>Medical documents, lab results, ECGs, and imaging you upload</li>
                <li>Doctor visit notes and care team information</li>
                <li>Medication records and dosage information</li>
                <li>Focus area questions submitted for AI analysis</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">3. How We Use Your Information</h2>
              <p>Information you enter is used solely to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Display health tracking data within the application</li>
                <li>Generate AI-powered medical research analysis</li>
                <li>Produce doctor briefing documents for appointments</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">4. Third-Party Services</h2>
              <p className="font-semibold text-orange-700 mb-2">⚠ Important Disclosure — AI Analysis</p>
              <p>When you use the AI Medical Analysis feature, the following information is transmitted to Anthropic, Inc. (claude.ai API):</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>Patient name, age, and primary medical concern</li>
                <li>Medication list with dosages</li>
                <li>Complete cardiac event history including parent notes</li>
                <li>Care team information</li>
              </ul>
              <p>Anthropic processes this data to generate responses. By using the AI Analysis feature, you consent to this transmission. Anthropic's privacy policy is available at <span className="text-blue-600">anthropic.com/privacy</span>.</p>

              <p className="mt-3 font-semibold text-orange-700">⚠ File Uploads</p>
              <p className="mt-1">Files you upload are stored using Vercel Blob storage. Vercel's privacy policy is available at <span className="text-blue-600">vercel.com/legal/privacy-policy</span>.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">5. Data Security</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>All data is transmitted over encrypted HTTPS connections</li>
                <li>Access to this application requires an authorized passphrase</li>
                <li>We do not share your information with any third party except as disclosed above</li>
                <li>No data is sold or used for advertising purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">6. Data Retention</h2>
              <p>Health event data entered in the application is stored in browser session memory and is not permanently stored on our servers. Uploaded files are stored in Vercel Blob storage until manually deleted.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">7. Children's Privacy</h2>
              <p>This application is operated by a parent/guardian on behalf of a minor child (Ethan Alvarez). All access is restricted to authorized family members and healthcare providers designated by the family.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">8. Your Rights</h2>
              <p>As the authorized user, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Access all data displayed in this application</li>
                <li>Delete uploaded files at any time</li>
                <li>Withdraw consent for AI analysis at any time by not using that feature</li>
                <li>Request deletion of any stored data by contacting the application administrator</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">9. Medical Disclaimer</h2>
              <p className="text-red-700 font-medium">This application does not provide medical advice. AI-generated analysis is for informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical decisions.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">10. Contact</h2>
              <p>For privacy-related questions or data deletion requests, contact the application administrator directly.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
