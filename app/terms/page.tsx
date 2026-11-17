import { Activity } from 'lucide-react';
import Link from 'next/link';
import { BRAND, GOVERNING_STATE, LEGAL_NAME, LEGAL_OWNER, TERMS_UPDATED, TERMS_VERSION } from '@/lib/legal';

export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="flex items-center gap-2 mb-8 text-gray-600 hover:text-gray-900">
          <Activity className="w-5 h-5 text-red-600" />
          <span className="font-semibold">Cleary Health</span>
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {TERMS_UPDATED} (version {TERMS_VERSION}). These Terms are a contract between you and {LEGAL_NAME} (&quot;{BRAND},&quot; &quot;we,&quot; &quot;us&quot;).</p>

          <div className="prose prose-sm text-gray-700 space-y-6">

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>Important:</strong> Cleary Health is a private personal health tracking tool. It is not a licensed medical service, not a covered entity under HIPAA, and not an FDA-regulated medical device. It does not provide medical advice.
              </p>
            </div>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">1. Acceptance of Terms</h2>
              <p>You agree to these Terms by checking the agreement box when you sign up or on the agreement screen, or by using the application. By doing so, you confirm that:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You are at least 18 years of age</li>
                <li>You are an authorized user who has been granted access by the application owner</li>
                <li>You accept full responsibility for all activity under your account</li>
              </ul>
              <p className="mt-2">Unauthorized access is strictly prohibited and may be subject to applicable laws.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">2. Authorized Use Only</h2>
              <p>This application is a private health tracking tool intended solely for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Tracking health events, symptoms, and medical data for the registered patient</li>
                <li>Sharing medical history with authorized healthcare providers</li>
                <li>Generating AI-assisted research summaries for discussion with doctors</li>
                <li>Storing and organizing medical documents</li>
              </ul>
              <p className="mt-2">Any other use is strictly prohibited.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">3. Not Medical Advice — Important Disclaimer</h2>
              <p className="text-red-700 font-semibold">IMPORTANT: This application does not provide medical advice and is not a substitute for professional medical care.</p>
              <p className="mt-1">AI-generated analysis, summaries, and content are for informational and research purposes only. They do not constitute medical advice, diagnosis, or treatment recommendations. Never make medical decisions based solely on this application. Always consult a licensed healthcare provider.</p>
              <p className="mt-1">Using the application does not create a doctor–patient or any other healthcare provider relationship. The AI analysis and the follow-up chat are produced by an AI, not by a person, a doctor or any licensed healthcare professional, and AI can be wrong or incomplete.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">4. File Upload Terms</h2>
              <p>By uploading files, you confirm that:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You are an authorized user with the right to upload and share these documents</li>
                <li>The files are health-related and relevant to the registered patient's care</li>
                <li>You understand uploaded files are stored with our cloud storage provider (Cloudflare R2), as described in the <Link href="/privacy" className="underline">Privacy Policy</Link></li>
                <li>You will not upload files containing information about other individuals without their consent</li>
                <li>You will not upload illegal content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">5. AI Analysis Consent</h2>
              <p>By using the AI Medical Analysis feature, you explicitly consent to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Transmitting the patient's medical history to Anthropic's Claude AI service for analysis</li>
                <li>The processing of sensitive health information by a third-party AI service</li>
                <li>Receiving AI-generated research that may contain errors or inaccuracies</li>
              </ul>
              <p className="mt-2">AI analysis is a research tool to help prepare for doctor appointments — not a diagnostic service.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">6. Account Responsibility &amp; Confidentiality</h2>
              <p>You agree to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Keep your password and credentials strictly confidential — never share them</li>
                <li>Not share your account with other people; each person must have their own account</li>
                <li>Log out or close the application when not in use on shared devices</li>
                <li>Notify the application administrator immediately if you suspect unauthorized access</li>
                <li>Accept full responsibility for all actions taken under your account</li>
              </ul>
              <p className="mt-2">Your health data is visible only to you. Other users of this application cannot access your data, and you cannot access theirs.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">7. Limitation of Liability</h2>
              <p>This application is provided as-is for personal use. The application owner and developer are not liable for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Medical decisions made based on AI-generated analysis</li>
                <li>Inaccuracies or errors in AI-generated content</li>
                <li>Service interruptions or data loss</li>
                <li>Unauthorized access resulting from compromised credentials</li>
                <li>Any health outcome related to use or reliance on this application</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">8. Emergency Situations</h2>
              <p className="text-red-700 font-semibold">In any medical emergency, call 911 immediately. Do not use this application in place of emergency services.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">9. Regulatory Disclaimer</h2>
              <p>Cleary Health is not a HIPAA-covered entity, not an FDA-regulated medical device, and not affiliated with any healthcare authority. Use of the term "health information" refers to personal data you choose to track — not legally defined Protected Health Information under HIPAA.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">10. Changes to Terms</h2>
              <p>These terms may be updated periodically. We&apos;ll post the new version with a new date and, for material changes, ask you to confirm again when you next sign in. Continued use of the application constitutes acceptance of updated terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">11. Disclaimer of Warranties</h2>
              <p>THE APPLICATION IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY AND NON-INFRINGEMENT. We don&apos;t promise that the application, its AI analysis or its records are accurate, complete, secure, always available or free of errors, or that data will never be lost. Keep your own copies of important medical records.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">12. Limit on Damages</h2>
              <p>TO THE FULLEST EXTENT THE LAW ALLOWS, {LEGAL_OWNER.toUpperCase()} AND {BRAND.toUpperCase()} WON&apos;T BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR FOR ANY HEALTH OUTCOME, AND OUR TOTAL LIABILITY FOR ANY CLAIM IS LIMITED TO THE GREATER OF $100 OR WHAT YOU PAID US FOR THE APPLICATION IN THE 12 MONTHS BEFORE THE CLAIM. Some places don&apos;t allow some of these limits, so they may not all apply to you.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">13. Indemnity</h2>
              <p>You agree to cover {LEGAL_OWNER}&apos;s losses and reasonable legal costs from claims by others that arise from your use of the application, the data or files you upload (including information about other people), or your breaking these Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">14. Our Intellectual Property</h2>
              <p>The application, its software, design, names and logos (including the CT monogram) belong to {LEGAL_OWNER} and are protected by copyright and other laws. © {LEGAL_OWNER}. All rights reserved. Your health data stays yours; you let us store and process it only to run the application for you.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">15. Ending Your Use</h2>
              <p>You can stop using the application at any time. We may suspend or end access at any time, for example to protect the security of the application or other users. Sections 3, 5, 7 to 9, 11 to 14 and 16 to 19 survive.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">16. Governing Law and Disputes</h2>
              <p>These Terms are governed by the laws of the State of {GOVERNING_STATE}, without regard to its conflict-of-laws rules. Any dispute will be handled only in the state or federal courts located in {GOVERNING_STATE}, and you and we consent to their jurisdiction.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">17. Severability and Entire Agreement</h2>
              <p>If any part of these Terms can&apos;t be enforced, the rest still applies, and that part is enforced as far as the law allows. These Terms and the <Link href="/privacy" className="underline">Privacy Policy</Link> are the whole agreement between you and us about the application. Our not enforcing a term right away doesn&apos;t waive it.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">18. Assumption of Risk</h2>
              <p>You use the application, its AI analysis and its records at your own risk. Health decisions are yours and your healthcare providers&apos;, and you accept the risk that information in the application may be wrong, missing or out of date.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">19. Third-Party Services</h2>
              <p>The application relies on other companies to work, such as hosting, storage, email, Google sign-in, the human check on sign-in pages, and the AI provider (listed in the <Link href="/privacy" className="underline">Privacy Policy</Link>). Their services have their own terms, and we aren&apos;t responsible for their outages, errors or actions.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">20. Contact</h2>
              <p>Questions about these Terms: contact {LEGAL_NAME}, who runs the application, through the administrator who gave you access.</p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
