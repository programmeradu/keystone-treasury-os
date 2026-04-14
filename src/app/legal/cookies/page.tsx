import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Cookie Policy",
    description: "dreyv cookie policy — what cookies we use and why.",
    alternates: { canonical: "/legal/cookies" },
};

export default function CookiesPage() {
    return (
        <article className="prose prose-invert prose-sm max-w-none">
            <h1>Cookie Policy</h1>
            <p className="text-muted-foreground text-sm">Last updated: April 6, 2026</p>

            <h2>What Are Cookies</h2>
            <p>
                Cookies are small text files stored on your device when you visit a website.
                They help the site remember your preferences and maintain your session.
            </p>

            <h2>Cookies We Use</h2>

            <h3>Essential Cookies (Always Active)</h3>
            <table>
                <thead>
                    <tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>keystone-siws-session</code></td>
                        <td>Authentication session (Sign-In With Solana JWT)</td>
                        <td>7 days</td>
                    </tr>
                    <tr>
                        <td><code>keystone-cookie-consent</code></td>
                        <td>Remembers your cookie consent preference</td>
                        <td>1 year</td>
                    </tr>
                </tbody>
            </table>

            <h3>Analytics Cookies (Optional)</h3>
            <p>
                We currently do not use third-party analytics cookies. If we introduce analytics
                in the future, this policy will be updated and your consent will be requested.
            </p>

            <h2>Managing Cookies</h2>
            <p>
                You can manage cookies through your browser settings. Note that disabling essential
                cookies will prevent you from signing in to dreyv.
            </p>

            <h2>Contact</h2>
            <p>
                For questions about our cookie practices, contact <strong>privacy@keystone.so</strong>.
            </p>
        </article>
    );
}
