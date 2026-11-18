import { Activity } from 'lucide-react';
import Link from 'next/link';
import { LEGAL_NAME, PRIVACY_UPDATED } from '@/lib/legal';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="flex items-center gap-2 mb-8 text-gray-600 hover:text-gray-900">
          <Activity className="w-5 h-5 text-red-600" />
          <span className="font-semibold">Cleary Health</span>
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {PRIVACY_UPDATED}. Operated by {LEGAL_NAME}.</p>

          <div className="prose prose-sm text-gray-700 space-y-6">

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>About this application:</strong> Cleary Health is a private, personal health tracking application. It is not a healthcare provider, health plan, or healthcare clearinghouse, and is not subject to HIPAA as a covered entity. We are not affiliated with or certified by any regulatory health authority. This app is a personal tool for organizing and tracking health information.
              </p>
            </div>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">1. Overview</h2>
              <p>Cleary Health is a private health tracking application intended for authorized users to organize, track, and share personal health information with their care team. All data is treated with strict confidentiality and is never sold or shared for commercial purposes.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">2. Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Health event records including symptoms, vitals, and notes</li>
                <li>Medical documents, lab results, and imaging files you upload</li>
                <li>Doctor visit notes and care team information</li>
                <li>Medication records and dosage information</li>
                <li>Questions and focus areas submitted for AI analysis, and the latest AI analysis for each person you track (saved so the chat can answer questions about it)</li>
                <li>Chat messages: sent to the AI to answer you and not saved by us. We keep only a count of messages the chat declined, by type (no message text and no names). Entries the chat saves at your request are stored like the ones you enter yourself.</li>
                <li>Account details: your name, email address, a scrambled (hashed) password, and a passkey public key if you turn on Face ID or fingerprint sign-in</li>
                <li>Security records: sign-in times, network (IP) addresses, and when you agreed to the Terms and gave health data consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">3. How We Use Your Information</h2>
              <p>Information you enter is used solely to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Display health tracking data within the application</li>
                <li>Generate AI-assisted research summaries for discussion with your doctor</li>
                <li>Produce briefing documents for medical appointments</li>
                <li>Send account emails such as a welcome message or password reset</li>
                <li>Keep accounts secure and stop abuse</li>
              </ul>
              <p className="mt-2">We do not use your health information for advertising, profiling, or any commercial purpose.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">4. Third-Party Services</h2>
              <p className="mb-2">These companies process data for us only to run the application. They are not allowed to sell it.</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li><strong>Vercel, Inc.</strong> hosts the application, so your requests pass through its servers.</li>
                <li><strong>Cloudflare, Inc.</strong> stores your account, health records and uploaded files (Cloudflare R2), and runs the human check on the sign-in, sign-up and password reset pages (Turnstile).</li>
                <li><strong>Resend</strong> sends account emails, using your name and email address.</li>
                <li><strong>Google</strong> signs you in if you choose &quot;Sign in with Google&quot;, and shares your name and email address with us.</li>
                <li><strong>Anthropic, PBC</strong> (Claude AI) runs the AI analysis and the follow-up chat.</li>
              </ul>
              <p className="font-semibold text-gray-900 mb-2">AI Analysis: what is sent</p>
              <p>When you run an AI analysis, or send a message in the chat, the following information about the person you are viewing may be sent to Anthropic through its API:</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>Patient first name, age, and primary medical concern</li>
                <li>Medication list with dosages</li>
                <li>Health event history, visits and notes</li>
                <li>Care team information</li>
                <li>Uploaded files you include in the analysis, their latest saved AI analysis, and your chat messages</li>
              </ul>
              <p>Anthropic processes this data to generate responses. You choose each time whether to run an analysis or send a chat message. Review Anthropic&apos;s privacy policy at <span className="text-blue-600">anthropic.com/privacy</span>.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">5. Data Security &amp; Isolation</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>All data is transmitted over encrypted HTTPS connections</li>
                <li>No security is perfect, so we can&apos;t promise data will never be lost or accessed without permission. If a breach affects your data, we&apos;ll tell you as the law requires.</li>
                <li>Access requires a verified account with a strong password and optional biometric authentication</li>
                <li>Each user&apos;s health data is stored in a separate area of our private cloud storage, and the application only shows you your own data</li>
                <li>We do not share your information with any third party except as disclosed above</li>
                <li>No data is sold or used for advertising purposes</li>
                <li>Biometric credentials (Face ID / Touch ID / fingerprint) are stored on your device only — we store only a cryptographic public key, never your biometric itself</li>
                <li>Session tokens are cryptographically signed and expire after 7 days</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">6. Data Retention &amp; Account Data</h2>
              <p>We keep your health records and uploaded files until you delete them. You can delete files one by one, or delete your whole account and its health data, uploads and passkeys at any time in Settings (&quot;Delete My Account&quot;), or ask the administrator to do it. Security logs and the record of when you agreed to the Terms may be kept after that, only as long as needed for security and legal records.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">7. Children</h2>
              <p>Accounts are only for adults 18 or older, and we don&apos;t knowingly let anyone under 18 create an account. A parent or guardian may track a child&apos;s health in their own account; that information is theirs to manage and delete, and it is protected the same way as all other data.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">8. Your Rights</h2>
              <p>Wherever you live, and including the rights some US state privacy laws give you, you can:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>See the data we hold about you, and ask for a copy</li>
                <li>Correct it, by editing it in the application or asking us</li>
                <li>Delete it: files at any time, or your whole account in Settings</li>
                <li>Opt out of the sale of your data, targeted advertising and profiling. We don&apos;t do any of these.</li>
                <li>Withdraw consent: stop using AI analysis, or delete your account to stop all health data collection</li>
                <li>Remove your biometric login at any time via Settings</li>
                <li>Appeal if we turn down a request, by replying to our answer</li>
              </ul>
              <p className="mt-2">To ask, contact the administrator (section 12). We&apos;ll answer within 45 days and won&apos;t treat you differently for using these rights.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">9. Medical Disclaimer</h2>
              <p className="text-red-700 font-medium">This application does not provide medical advice and is not a medical device. AI-generated analysis is for informational and research purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult a qualified, licensed healthcare provider for all medical decisions.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">10. Regulatory Status</h2>
              <p>Cleary Health is a private personal health tracking tool. It is not a covered entity under HIPAA, not an FDA-regulated medical device, and not affiliated with any regulatory health authority. It does not replace professional medical care.</p>
            </section>

            <section>
              <h2 id="consumer-health-data" className="text-lg font-bold text-gray-900 mb-2">11. Consumer Health Data Notice</h2>
              <p>Some states (for example Washington, Nevada and Connecticut) give you extra rights over &quot;consumer health data.&quot; In plain terms:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>What we collect:</strong> the health events, symptoms, conditions, medications, measurements, notes and medical files you or your family members choose to enter or upload, and the AI summaries made from them.</li>
                <li><strong>Where it comes from:</strong> only from you. We don&apos;t buy health data or get it from other companies.</li>
                <li><strong>Why:</strong> only to store and show it to you, prepare doctor briefings and AI research summaries you ask for, and keep your account secure.</li>
                <li><strong>Who gets it:</strong> only the service providers listed in section 4, which process it for us. <strong>We never sell your health data</strong> and never use it for advertising.</li>
                <li><strong>Your consent:</strong> we ask for your explicit consent, with its own checkbox, before you can enter health data (when you sign up, or on the agreement screen), and AI processing happens only when you run an analysis or send a chat message. You can withdraw consent at any time by deleting your data or your account.</li>
                <li><strong>Your rights:</strong> you can see, export or delete your health data, and withdraw consent. Use Settings or ask the administrator and we&apos;ll act within 45 days.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">12. Contact</h2>
              <p>For privacy-related questions or data deletion requests, contact the application administrator ({LEGAL_NAME}) directly.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
