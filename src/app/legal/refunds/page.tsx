import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Refund Policy | Keystone",
    description: "Keystone refund and cancellation policy for subscriptions billed through FastSpring.",
};

export default function RefundsPage() {
    return (
        <article className="prose prose-invert prose-sm max-w-none">
            <h1>Refund &amp; cancellation policy</h1>
            <p className="text-muted-foreground text-sm">Last updated: April 11, 2026</p>

            <h2>1. Who processes payments</h2>
            <p>
                Paid subscriptions for Keystone are sold by{" "}
                <strong>FastSpring</strong> as the merchant of record. FastSpring appears on your bank or card statement
                and handles payment processing, invoicing, and many buyer support flows. This policy describes how we
                work with that model; it does not replace FastSpring&apos;s terms for checkout.
            </p>

            <h2>2. Cancellations</h2>
            <p>
                You may <strong>cancel your subscription</strong> at any time. Cancellation typically stops renewal at
                the end of the current billing period unless FastSpring&apos;s checkout or account management shows a
                different effective date. After cancellation, your account moves to the appropriate free tier when
                FastSpring
                confirms the subscription has ended (including via webhooks to our app).
            </p>

            <h2>3. Refunds</h2>
            <p>
                Refund eligibility depends on what FastSpring allows for your transaction type, region, and timing. If
                you believe you are owed a refund, contact us first at your usual Keystone support channel (e.g. the
                email or in-app contact listed on your invoice or our site). We will coordinate with FastSpring where
                required.
            </p>
            <p>
                We do <strong>not</strong> guarantee refunds outside what we can operationally honor through FastSpring
                and
                applicable law. For statutory rights in your country, those remain with you independent of this page.
            </p>

            <h2>4. Trials</h2>
            <p>
                If a plan includes a trial, billing begins when the trial ends unless you cancel before that moment.
                Trial terms shown at checkout control if they differ from this summary.
            </p>

            <h2>5. Chargebacks</h2>
            <p>
                Chargebacks are handled by FastSpring and your payment network. We may restrict access if a dispute
                indicates abuse or fraud.
            </p>

            <p className="text-muted-foreground text-sm not-prose mt-8">
                See also{" "}
                <Link href="/legal/terms" className="text-primary hover:underline">
                    Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/pricing" className="text-primary hover:underline">
                    Pricing
                </Link>
                .
            </p>
        </article>
    );
}
