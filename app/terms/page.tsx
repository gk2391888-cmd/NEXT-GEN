import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui';

export const metadata: Metadata = { title: 'Terms of Use' };

const CONTACT = 'gaurav.kumar.mail1109@gmail.com';

export default function TermsPage() {
  return (
    <article className="card legal">
      <PageHead kicker="Legal" title="Terms of Use" description="Last updated: 3 November 2026" />

      <p>By using NEXT GEN you agree to these terms. If you don’t agree, please don’t use the site.</p>

      <h2>About NEXT GEN</h2>
      <p>
        NEXT GEN is a free, independent study aid run by THE TECH HUB. It is not affiliated with, endorsed by, or a substitute for IIT Madras or
        its official course material.
      </p>

      <h2>Study material</h2>
      <ul>
        <li>Notes, questions and mock tests are written independently and may contain mistakes. Always check against your official course material.</li>
        <li>Mock tests are practice only. Scores here say nothing about your official grades.</li>
        <li>The material is for your personal study. Please don’t copy or republish it in bulk.</li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>Keep access to your email or Google account secure; anyone who can sign in to it can see your progress.</li>
        <li>Don’t misuse the site, for example by trying to access other students’ data or overload the service.</li>
        <li>You can delete your account at any time from <Link href="/profile">My profile</Link>.</li>
      </ul>

      <h2>Pro plan and payments</h2>
      <ul>
        <li>New accounts get a 7-day free trial with full access. No card is needed. There is one free trial per person: a new account on an email address, device or network that has already had one may not get another, and temporary email addresses can’t be used.</li>
        <li>When the trial or a Pro period ends, notes, practice, mock tests and the other study tools lock until you buy Pro. Week 1 of every subject, Qualifier Prep and the grade calculator stay free. Your progress is kept, and comes back as soon as you pay.</li>
        <li>Pro costs ₹99 for 30 days, paid by UPI or through Razorpay. It does not renew automatically; each payment adds 30 days.</li>
        <li>We sometimes run limited-time offers (for example a Diwali price). An offer price applies once per account, to a payment made during the stated dates; later payments are at the normal price.</li>
        <li>If you were charged but Pro didn’t activate, or you were charged twice, email us within 7 days and we’ll fix it or refund you.</li>
        <li>Apart from that, payments for a period that has already started are not refundable.</li>
        <li>Pro features and limits (such as the AI doubt fair-use limit) may change; we’ll announce changes on the site.</li>
      </ul>

      <h2>No warranty</h2>
      <p>
        NEXT GEN is provided “as is”, without guarantees of availability or accuracy. We may change or discontinue features at any time.
      </p>

      <h2>Privacy</h2>
      <p>How we handle your data is described in our <Link href="/privacy">Privacy Policy</Link>.</p>

      <h2>Contact</h2>
      <p>Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </article>
  );
}
