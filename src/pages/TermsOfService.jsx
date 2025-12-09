import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfService() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-slate-600">Last Updated: December 9, 2025</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Agreement to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              These Terms of Service ("Terms") govern your access to and use of the HealthInsight platform (the "Service"), 
              provided by HealthInsight ("Company," "we," "our," or "us"). By accessing or using the Service, you agree 
              to be bound by these Terms.
            </p>
            <p>
              If you do not agree to these Terms, you may not access or use the Service. If you are using the Service 
              on behalf of an organization, you represent and warrant that you have authority to bind that organization 
              to these Terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              HealthInsight is a healthcare market intelligence platform that provides:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Curated healthcare industry newsletters and content</li>
              <li>AI-powered analysis and summarization tools</li>
              <li>Business development recommendation engines</li>
              <li>Custom research packs and saved searches</li>
              <li>Company and topic tracking capabilities</li>
              <li>Professional formatting and export tools</li>
            </ul>
            <p className="mt-4">
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or 
              without notice.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <div>
              <h3 className="font-semibold mb-2">3.1 Account Creation</h3>
              <p>
                To access certain features of the Service, you must create an account. You agree to provide accurate, 
                current, and complete information during registration and to update such information as necessary.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3.2 Account Security</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3.3 Account Termination</h3>
              <p>
                We reserve the right to suspend or terminate your account at any time, with or without notice, for 
                violation of these Terms or for any other reason.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Acceptable Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Interfere with or disrupt the Service or servers or networks connected to the Service</li>
              <li>Transmit any viruses, malware, or other malicious code</li>
              <li>Use automated means to access the Service without our express written permission</li>
              <li>Reverse engineer, decompile, or disassemble any portion of the Service</li>
              <li>Remove, obscure, or alter any proprietary notices on the Service</li>
              <li>Use the Service to compete with us or create a similar service</li>
              <li>Share your account credentials with others</li>
              <li>Violate the intellectual property rights of others</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Intellectual Property Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <div>
              <h3 className="font-semibold mb-2">5.1 Our Rights</h3>
              <p>
                The Service, including all content, features, and functionality, is owned by HealthInsight and is 
                protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, 
                distribute, sell, or lease any part of the Service without our express written permission.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">5.2 Your Content</h3>
              <p>
                You retain ownership of any content you create using the Service (e.g., custom packs, notes, summaries). 
                By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to use, store, and 
                display your content solely for the purpose of operating and improving the Service.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">5.3 Third-Party Content</h3>
              <p>
                The Service may include content from third-party sources. We do not claim ownership of such content and 
                do not guarantee its accuracy or reliability.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. AI-Generated Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              The Service includes AI-powered agents that generate summaries, recommendations, and other content. 
              While we strive for accuracy, AI-generated content may contain errors or inaccuracies. You should verify 
              any critical information before relying on it for business decisions.
            </p>
            <p>
              We are not responsible for decisions you make based on AI-generated content provided through the Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Subscription and Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <div>
              <h3 className="font-semibold mb-2">7.1 Subscription Plans</h3>
              <p>
                Access to certain features of the Service may require a paid subscription. Subscription fees are billed 
                in advance on a recurring basis (e.g., monthly or annually) and are non-refundable except as required by law.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">7.2 Price Changes</h3>
              <p>
                We reserve the right to change our subscription prices at any time. We will provide reasonable notice 
                of price changes, and changes will apply to subsequent billing periods.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">7.3 Cancellation</h3>
              <p>
                You may cancel your subscription at any time. Cancellations will take effect at the end of your current 
                billing period. You will retain access to paid features until the end of the billing period.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Data and Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by 
              reference. By using the Service, you consent to the collection and use of your information as described in 
              the Privacy Policy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Disclaimers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p className="uppercase font-semibold mb-2">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
            </p>
            <p>
              We disclaim all warranties, including but not limited to:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Merchantability and fitness for a particular purpose</li>
              <li>Non-infringement of third-party rights</li>
              <li>Accuracy, reliability, or completeness of content</li>
              <li>Uninterrupted or error-free operation</li>
              <li>Security of data transmission</li>
            </ul>
            <p className="mt-4">
              We do not warrant that the Service will meet your requirements or that any errors will be corrected.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p className="uppercase font-semibold mb-2">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
            </p>
            <p>
              Our total liability to you for all claims arising from or related to the Service shall not exceed the 
              amount you paid us in the twelve (12) months preceding the claim.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. Indemnification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              You agree to indemnify, defend, and hold harmless HealthInsight and its officers, directors, employees, 
              and agents from any claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' 
              fees) arising from:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Content you submit or create using the Service</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12. Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              We may terminate or suspend your access to the Service immediately, without prior notice or liability, 
              for any reason, including breach of these Terms. Upon termination, your right to use the Service will 
              immediately cease.
            </p>
            <p>
              All provisions of these Terms that by their nature should survive termination shall survive, including 
              ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>13. Governing Law and Dispute Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <div>
              <h3 className="font-semibold mb-2">13.1 Governing Law</h3>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], 
                without regard to its conflict of law provisions.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">13.2 Dispute Resolution</h3>
              <p>
                Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in 
                accordance with the rules of [Arbitration Organization]. The arbitration shall take place in [Location].
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">13.3 Class Action Waiver</h3>
              <p>
                You agree that any dispute resolution proceedings will be conducted only on an individual basis and not 
                in a class, consolidated, or representative action.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>14. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              We reserve the right to modify these Terms at any time. We will provide notice of material changes by 
              posting the updated Terms on the Service and updating the "Last Updated" date. Your continued use of the 
              Service after changes constitutes acceptance of the modified Terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>15. General Provisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <div>
              <h3 className="font-semibold mb-2">15.1 Entire Agreement</h3>
              <p>
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and 
                HealthInsight regarding the Service.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">15.2 Severability</h3>
              <p>
                If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in 
                full force and effect.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">15.3 Waiver</h3>
              <p>
                Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">15.4 Assignment</h3>
              <p>
                You may not assign or transfer these Terms without our prior written consent. We may assign these Terms 
                without restriction.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>16. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>If you have questions about these Terms, please contact us:</p>
            <ul className="list-none space-y-1 mt-2">
              <li><strong>Email:</strong> legal@healthinsight.com</li>
              <li><strong>Address:</strong> [Your Company Address]</li>
            </ul>
          </CardContent>
        </Card>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mt-8">
          <p className="text-sm text-slate-600">
            By using HealthInsight, you acknowledge that you have read, understood, and agree to be bound by these 
            Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}