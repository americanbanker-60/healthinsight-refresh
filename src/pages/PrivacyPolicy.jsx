import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-600">Last Updated: December 9, 2025</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Introduction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              Welcome to HealthInsight ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, 
              and safeguard your information when you use our healthcare intelligence platform (the "Service"). 
              Please read this privacy policy carefully.
            </p>
            <p>
              By accessing or using the Service, you agree to this Privacy Policy. If you do not agree with the terms 
              of this privacy policy, please do not access the Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <div>
              <h3 className="font-semibold mb-2">2.1 Personal Information</h3>
              <p className="mb-2">We may collect personal information that you provide to us, including:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Name and contact information (email address)</li>
                <li>Account credentials</li>
                <li>Professional information (company, role, industry focus)</li>
                <li>User preferences and settings</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2.2 Usage Data</h3>
              <p className="mb-2">We automatically collect certain information when you access the Service:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Search queries and filter preferences</li>
                <li>Content viewed and saved</li>
                <li>Learning packs and topics accessed</li>
                <li>Usage patterns and interactions with the platform</li>
                <li>Device information and browser type</li>
                <li>IP address and location data</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2.3 Content Data</h3>
              <p className="mb-2">When you use the Service, we collect:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Custom packs and saved searches you create</li>
                <li>Notes and annotations you add</li>
                <li>Summaries and reports you generate</li>
                <li>Interactions with AI agents</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>We use the information we collect to:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Provide, operate, and maintain the Service</li>
              <li>Improve, personalize, and expand the Service</li>
              <li>Understand and analyze how you use the Service</li>
              <li>Develop new features, products, and services</li>
              <li>Communicate with you about updates, support, and administrative messages</li>
              <li>Send you marketing and promotional communications (with your consent)</li>
              <li>Process your transactions and manage your account</li>
              <li>Prevent fraud and enhance security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. How We Share Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p className="mb-2">We may share your information in the following circumstances:</p>
            
            <div>
              <h3 className="font-semibold mb-2">4.1 Service Providers</h3>
              <p>
                We may share your information with third-party service providers who perform services on our behalf, 
                such as hosting, data analysis, customer service, email delivery, and AI processing.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4.2 Business Transfers</h3>
              <p>
                In connection with any merger, sale of company assets, financing, or acquisition of all or a portion 
                of our business, user information may be transferred.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4.3 Legal Requirements</h3>
              <p>
                We may disclose your information if required to do so by law or in response to valid requests by 
                public authorities (e.g., a court or government agency).
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4.4 With Your Consent</h3>
              <p>
                We may share your information for any other purpose with your explicit consent.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Data Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              We implement appropriate technical and organizational security measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Employee training on data protection</li>
            </ul>
            <p className="mt-4">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive 
              to protect your personal information, we cannot guarantee its absolute security.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this 
              Privacy Policy, unless a longer retention period is required or permitted by law. When we no longer need 
              your information, we will securely delete or anonymize it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Your Privacy Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p className="mb-2">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc ml-6 space-y-1">
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request a copy of your data in a structured format</li>
              <li><strong>Objection:</strong> Object to processing of your personal information</li>
              <li><strong>Restriction:</strong> Request restriction of processing your personal information</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us using the information provided in the "Contact Us" section below.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Cookies and Tracking Technologies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              We use cookies and similar tracking technologies to track activity on our Service and store certain information. 
              These technologies help us understand user behavior, improve our Service, and provide a better user experience.
            </p>
            <p>
              You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, 
              if you do not accept cookies, you may not be able to use some portions of our Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              Our Service may contain links to third-party websites or services that are not owned or controlled by us. 
              We are not responsible for the privacy practices of these third parties. We encourage you to review the 
              privacy policies of any third-party services you access.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              Our Service is not intended for use by children under the age of 18. We do not knowingly collect personal 
              information from children under 18. If you become aware that a child has provided us with personal information, 
              please contact us, and we will take steps to delete such information.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              Your information may be transferred to and maintained on computers located outside of your state, province, 
              country, or other governmental jurisdiction where data protection laws may differ. By using the Service, 
              you consent to such transfers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12. Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
              Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy 
              Policy periodically for any changes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>13. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>If you have questions or concerns about this Privacy Policy, please contact us:</p>
            <ul className="list-none space-y-1 mt-2">
              <li><strong>Email:</strong> privacy@healthinsight.com</li>
              <li><strong>Address:</strong> [Your Company Address]</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}