import type { Metadata } from "next";
import {
  LegalList,
  LegalParagraph,
  LegalSection,
  LegalTitle,
  LegalUpdated,
} from "@/app/(legal)/_components/legal-prose";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how CollaBill collects, uses, and protects your personal information.",
};

const PrivacyPolicyPage = () => (
  <article>
    <LegalTitle>Privacy Policy</LegalTitle>
    <LegalUpdated>August 14, 2026</LegalUpdated>

    <LegalSection title="Introduction">
      <LegalParagraph>
        CollaBill ("we", "us", or "our") provides a collaborative billing and
        project management platform. This Privacy Policy explains how we
        collect, use, disclose, and safeguard your information when you visit
        our website or use our services. By accessing or using CollaBill, you
        agree to the collection and use of information in accordance with this
        policy.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Information We Collect">
      <LegalParagraph>
        We collect information you provide directly to us and information we
        collect automatically when you use our services. This includes:
      </LegalParagraph>
      <LegalList>
        <li>
          <strong>Account Information:</strong> your name, email address,
          password, and organization details when you create an account.
        </li>
        <li>
          <strong>Profile Data:</strong> avatar, team member roles, and
          preferences you configure within your account.
        </li>
        <li>
          <strong>Content and Files:</strong> projects, tasks, invoices,
          comments, and any documents or data you upload to the platform.
        </li>
        <li>
          <strong>Billing Information:</strong> payment details processed on our
          behalf by third-party payment providers. We do not store full payment
          card numbers on our servers.
        </li>
        <li>
          <strong>Usage Data:</strong> log data, device information, IP address,
          browser type, pages visited, and how you interact with our services.
        </li>
      </LegalList>
    </LegalSection>

    <LegalSection title="How We Use Your Information">
      <LegalParagraph>
        We use the information we collect to provide, maintain, and improve our
        services. Specifically, we use your information to:
      </LegalParagraph>
      <LegalList>
        <li>Create and manage your account and organization.</li>
        <li>Process transactions and manage subscriptions.</li>
        <li>Provide customer support and respond to your requests.</li>
        <li>Send you service notifications, updates, and marketing emails.</li>
        <li>
          Analyze usage trends to improve functionality and user experience.
        </li>
        <li>Detect, prevent, and address security or technical issues.</li>
        <li>Comply with legal obligations and enforce our Terms of Service.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="How We Share Your Information">
      <LegalParagraph>
        We do not sell your personal information. We may share your information
        in the following circumstances:
      </LegalParagraph>
      <LegalList>
        <li>
          <strong>Service Providers:</strong> with vendors that help us operate
          the platform, such as hosting, payment processing, email delivery, and
          analytics providers.
        </li>
        <li>
          <strong>Team Members:</strong> within your organization, so that
          collaborators can access shared projects, tasks, and invoices.
        </li>
        <li>
          <strong>Legal Requirements:</strong> when required by law, regulation,
          legal process, or governmental request.
        </li>
        <li>
          <strong>Business Transfers:</strong> in connection with a merger,
          acquisition, or sale of assets, where your information may be
          transferred as part of the transaction.
        </li>
      </LegalList>
    </LegalSection>

    <LegalSection title="Data Retention">
      <LegalParagraph>
        We retain your personal information only for as long as necessary to
        fulfill the purposes described in this Privacy Policy, comply with legal
        obligations, resolve disputes, and enforce our agreements. When you
        delete your account, we will delete or anonymize your personal data
        within a reasonable period, unless retention is required by law.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Data Security">
      <LegalParagraph>
        We implement appropriate technical and organizational measures to
        protect your information against unauthorized access, alteration,
        disclosure, or destruction. These measures include encryption in transit
        and at rest, access controls, and routine security monitoring. However,
        no method of transmission over the Internet or electronic storage is
        completely secure, and we cannot guarantee absolute security.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Your Rights and Choices">
      <LegalParagraph>
        Depending on your location, you may have certain rights regarding your
        personal information, including the right to:
      </LegalParagraph>
      <LegalList>
        <li>Access, correct, or update your personal information.</li>
        <li>Request deletion of your personal information.</li>
        <li>Object to or restrict certain processing activities.</li>
        <li>Receive a copy of your data in a portable format.</li>
        <li>
          Withdraw consent at any time where processing is based on consent.
        </li>
        <li>Lodge a complaint with a supervisory authority.</li>
      </LegalList>
      <LegalParagraph>
        To exercise any of these rights, contact us using the details below. We
        will respond to your request within the timeframe required by applicable
        law.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Cookies and Tracking Technologies">
      <LegalParagraph>
        We use cookies and similar technologies to operate and improve our
        services, remember your preferences, and understand how you use the
        platform. You can control cookies through your browser settings;
        however, disabling them may affect certain functionality. We also use
        analytics tools, such as Google Analytics, which may collect usage data
        on our behalf.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Children's Privacy">
      <LegalParagraph>
        Our services are not directed to individuals under the age of 16. We do
        not knowingly collect personal information from children. If you believe
        a child has provided us with personal information, please contact us and
        we will take steps to delete such information.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="International Data Transfers">
      <LegalParagraph>
        Your information may be transferred to and processed in countries other
        than the one in which you reside. Where such transfers occur, we take
        appropriate safeguards to protect your personal information in
        accordance with applicable data protection laws.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Changes to This Privacy Policy">
      <LegalParagraph>
        We may update this Privacy Policy from time to time. We will notify you
        of material changes by posting the new policy on this page and updating
        the "Last updated" date above. Your continued use of our services after
        any changes constitutes acceptance of the revised policy.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Contact Us">
      <LegalParagraph>
        If you have any questions about this Privacy Policy or how we handle
        your personal information, please contact us at{" "}
        <a
          href="mailto:privacy@collabill.com"
          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
        >
          privacy@collabill.com
        </a>
        .
      </LegalParagraph>
    </LegalSection>
  </article>
);

export default PrivacyPolicyPage;
