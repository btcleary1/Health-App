import { Activity } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="flex items-center gap-2 mb-8 text-gray-600 hover:text-gray-900">
          <Activity className="w-5 h-5 text-red-600" />
          <span className="font-semibold">Ethan's Health</span>
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="prose prose-sm text-gray-700 space-y-6">

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">1. Acceptance of Terms</h2>
              <p>By accessing this application, you confirm that you are an authorized user — either a parent/guardian of Ethan Alvarez or a healthcare provider explicitly authorized by the family. Unauthorized access is prohibited.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">2. Authorized Use Only</h2>
              <p>This application is a private health tracking tool intended solely for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Tracking cardiac events and health data for Ethan Alvarez</li>
                <li>Sharing medical history with authorized healthcare providers</li>
                <li>Generating AI-assisted medical research for discussion with doctors</li>
                <li>Storing and organizing medical documents from doctor visits</li>
              </ul>
              <p className="mt-2">Any other use is strictly prohibited.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">3. Not Medical Advice</h2>
              <p className="text-red-700 font-semibold">IMPORTANT: This application does not provide medical advice.</p>
              <p className="mt-1">AI-generated analysis, summaries, and recommendations are for informational and research purposes only. They are not a substitute for professional medical judgment. Never make medical decisions based solely on information from this application. Always consult a licensed healthcare provider.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">4. File Upload Terms</h2>
              <p>By uploading files to this application, you confirm that:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You are the parent/guardian of Ethan Alvarez or an authorized representative</li>
                <li>You have the right to upload and share the documents you are uploading</li>
                <li>The files contain health information related to Ethan Alvarez's care</li>
                <li>You understand that uploaded files are stored on Vercel's cloud infrastructure</li>
                <li>You will not upload files containing information about other individuals without their consent</li>
                <li>You will not upload files containing illegal content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">5. AI Analysis Consent</h2>
              <p>By using the AI Medical Analysis feature, you explicitly consent to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Transmitting Ethan's medical history to Anthropic's Claude AI service for analysis</li>
                <li>The processing of Protected Health Information by a third-party AI service</li>
                <li>Receiving AI-generated medical research that may contain errors or inaccuracies</li>
              </ul>
              <p className="mt-2">You understand that AI analysis is a research tool to help prepare for doctor appointments — not a diagnostic service.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">6. Confidentiality</h2>
              <p>You agree to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Keep your access passphrase confidential</li>
                <li>Not share access credentials with unauthorized individuals</li>
                <li>Log out or close the application when not in use</li>
                <li>Notify the application administrator immediately if you suspect unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">7. Limitation of Liability</h2>
              <p>This application is provided as-is for personal family use. The application administrator is not liable for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Medical decisions made based on AI-generated analysis</li>
                <li>Inaccuracies in AI-generated content</li>
                <li>Service interruptions or data loss</li>
                <li>Unauthorized access resulting from compromised credentials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">8. Emergency Situations</h2>
              <p className="text-red-700 font-semibold">In any medical emergency, call 911 immediately. Do not rely on this application in an emergency.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">9. Changes to Terms</h2>
              <p>These terms may be updated periodically. Continued use of the application constitutes acceptance of updated terms.</p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
