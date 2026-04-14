import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service",
    description:
        "Dreyv terms of service governing use of our treasury management platform.",
    alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
    return (
        <article className="prose prose-invert prose-sm max-w-none">
            <h1>Terms of Service</h1>
            <p className="text-muted-foreground text-sm">Last updated: April 6, 2026</p>

            <h2>1. Acceptance of Terms</h2>
            <p>
                By accessing or using Keystone ("the Service"), you agree to be bound by these Terms of Service.
                If you do not agree, do not use the Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
                Keystone is a treasury management platform that provides tools for managing digital assets
                on the Solana blockchain, including portfolio management, transaction execution, DCA automation,
                and AI-powered analytics.
            </p>

            <h2>3. Eligibility</h2>
            <p>
                You must be at least 18 years old and legally capable of entering into binding agreements.
                The Service is not available in jurisdictions where digital asset services are prohibited.
            </p>

            <h2>4. User Responsibilities</h2>
            <ul>
                <li>You are solely responsible for the security of your wallet private keys and credentials.</li>
                <li>You are responsible for all transactions initiated through the Service.</li>
                <li>You agree not to use the Service for unlawful activities, including money laundering or sanctions evasion.</li>
                <li>You understand that blockchain transactions are irreversible.</li>
            </ul>

            <h2>5. Risk Disclaimer</h2>
            <p>
                Digital assets are volatile and speculative. The Service does not provide financial advice.
                AI-generated transaction suggestions are informational only. You should review all transactions
                via the Simulation Firewall before approving execution.
            </p>

            <h2>6. Limitation of Liability</h2>
            <p>
                Keystone is provided "as is" without warranties. We are not liable for losses arising from
                blockchain transactions, smart contract failures, market volatility, or third-party service
                outages (including but not limited to Solana network, Jupiter, or Helius).
            </p>

            <h2>7. Intellectual Property</h2>
            <p>
                The Service, including all code, design, and documentation, is the intellectual property of
                Keystone. Mini-apps created by users remain the intellectual property of their creators.
            </p>

            <h2>8. Termination</h2>
            <p>
                We may suspend or terminate your access for violations of these terms. You may delete your
                account at any time through Settings, which will remove your personal data per our Privacy Policy.
            </p>

            <h2>9. Governing Law</h2>
            <p>
                These terms are governed by the laws of the State of Delaware, USA, without regard to
                conflict of law provisions.
            </p>

            <h2>10. Contact</h2>
            <p>
                For questions about these terms, contact us at <strong>legal@keystone.so</strong>.
            </p>
        </article>
    );
}
