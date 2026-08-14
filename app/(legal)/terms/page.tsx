import type { Metadata } from "next";
import {
  LegalList,
  LegalParagraph,
  LegalSection,
  LegalTitle,
  LegalUpdated,
} from "@/app/(legal)/_components/legal-prose";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the terms and conditions that govern your use of CollaBill's collaboration and billing platform.",
};

const TermsOfServicePage = () => (
  <article>
    <LegalTitle>Terms of Service</LegalTitle>
    <LegalUpdated>August 14, 2026</LegalUpdated>

    <LegalSection title="Acceptance of Terms">
      <LegalParagraph>
        Welcome to CollaBill. These Terms of Service ("Terms") govern your
        access to and use of the CollaBill website and services. By creating an
        account, accessing, or using our services, you agree to be bound by
        these Terms and our Privacy Policy. If you do not agree, you may not
        access or use the services.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Eligibility">
      <LegalParagraph>
        You must be at least 16 years old to use our services. By using our
        services, you represent and warrant that you meet this requirement and
        that you have the full power and authority to enter into these Terms.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Account Registration and Security">
      <LegalParagraph>
        To access certain features, you must create an account. You are
        responsible for maintaining the confidentiality of your login
        credentials and for all activities that occur under your account. You
        agree to provide accurate and complete information and to notify us
        promptly of any unauthorized use of your account.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Use of the Services">
      <LegalParagraph>
        CollaBill provides collaboration, project management, and billing tools.
        You agree to use the services only for lawful purposes and in accordance
        with these Terms. You may not:
      </LegalParagraph>
      <LegalList>
        <li>Use the services to violate any applicable law or regulation.</li>
        <li>
          Attempt to access, interfere with, or damage any part of the services,
          servers, or networks connected to the platform.
        </li>
        <li>
          Reverse engineer, decompile, or disassemble any part of the services.
        </li>
        <li>Upload or transmit viruses, malware, or any harmful code.</li>
        <li>
          Use the services to transmit unlawful, infringing, or harassing
          content.
        </li>
        <li>
          Impersonate any person or entity or misrepresent your affiliation.
        </li>
        <li>
          Sell, resell, or sublicense access to the services without our written
          consent.
        </li>
      </LegalList>
    </LegalSection>

    <LegalSection title="Subscriptions, Billing, and Payments">
      <LegalParagraph>
        Certain features of our services are offered on a subscription basis.
        Subscription fees, billing cycles, and payment terms will be presented
        to you at the time of purchase. Unless otherwise stated, fees are billed
        in advance and are non-refundable except as required by law or as
        specified in your plan. Payment information is processed by third-party
        payment providers, and you agree to transact in accordance with their
        terms.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="User Content">
      <LegalParagraph>
        You retain ownership of the content, data, and files you upload to or
        create through the services ("User Content"). By submitting User
        Content, you grant CollaBill a worldwide, royalty-free, non-exclusive
        license to host, store, process, and display such content solely to
        provide and improve the services. You are solely responsible for your
        User Content and for ensuring it does not violate these Terms or the
        rights of third parties.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Intellectual Property Rights">
      <LegalParagraph>
        The services, including all software, text, graphics, logos, and
        features, are owned by CollaBill or its licensors and are protected by
        intellectual property laws. You are granted a limited, non-exclusive,
        non-transferable license to use the services for your internal business
        or personal purposes. No other rights are granted without our express
        written consent.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Third-Party Services">
      <LegalParagraph>
        Our services may integrate with or link to third-party services and
        websites. We do not control and are not responsible for the content,
        policies, or practices of any third-party services. Your use of such
        services is subject to their own terms and privacy policies.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Disclaimer of Warranties">
      <LegalParagraph>
        The services are provided on an "as is" and "as available" basis without
        warranties of any kind, whether express or implied, including but not
        limited to implied warranties of merchantability, fitness for a
        particular purpose, and non-infringement. We do not warrant that the
        services will be uninterrupted, secure, or error-free, or that results
        will be accurate or reliable.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Limitation of Liability">
      <LegalParagraph>
        To the maximum extent permitted by law, CollaBill and its affiliates,
        officers, and employees shall not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or for any lost
        profits, data, or goodwill, arising out of or related to your use of the
        services. Our total aggregate liability shall not exceed the amounts you
        paid us in the twelve (12) months preceding the event giving rise to the
        claim.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Indemnification">
      <LegalParagraph>
        You agree to indemnify, defend, and hold harmless CollaBill and its
        affiliates from and against any claims, liabilities, damages, losses,
        and expenses arising out of or related to your use of the services, your
        User Content, or your violation of these Terms or applicable law.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Termination">
      <LegalParagraph>
        You may stop using our services at any time and cancel your subscription
        in accordance with your plan's terms. We may suspend or terminate your
        access to the services at our discretion, with or without notice, if you
        violate these Terms or if we believe it is necessary to protect the
        platform or your rights. Upon termination, your right to access the
        services ceases, and we may retain or delete your data in accordance
        with our Privacy Policy.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Modifications to These Terms">
      <LegalParagraph>
        We may revise these Terms from time to time. We will notify you of
        material changes by posting the updated Terms on this page and updating
        the "Last updated" date above. Your continued use of the services after
        changes take effect constitutes your acceptance of the revised Terms.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Governing Law">
      <LegalParagraph>
        These Terms shall be governed by and construed in accordance with the
        laws of the jurisdiction in which CollaBill is established, without
        regard to its conflict of law provisions. You agree to submit to the
        exclusive jurisdiction of the courts located in that jurisdiction for
        any disputes arising out of these Terms or your use of the services.
      </LegalParagraph>
    </LegalSection>

    <LegalSection title="Contact Us">
      <LegalParagraph>
        If you have any questions about these Terms, please contact us at{" "}
        <a
          href="mailto:legal@collabill.com"
          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
        >
          legal@collabill.com
        </a>
        .
      </LegalParagraph>
    </LegalSection>
  </article>
);

export default TermsOfServicePage;
