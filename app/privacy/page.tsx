import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/ui';

export const metadata: Metadata = { title: 'Privacy Policy' };

const CONTACT = 'gaurav.kumar.mail1109@gmail.com';

export default function PrivacyPage() {
  return (
    <article className="card legal">
      <PageHead kicker="Legal" title="Privacy Policy" description="Last updated: 3 November 2026" />

      <p>
        NEXT GEN (“we”, “us”) is an independent learning website run by THE TECH HUB for IIT Madras BS students. It is not
        affiliated with IIT Madras. This policy explains what we collect, why, and the choices you have.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details</strong>: your email address and, if you sign in with Google, your name and profile picture URL from Google.</li>
        <li><strong>Learning progress</strong>: the questions you answer and whether they were correct, mock test attempts and scores, weeks you mark as done or save for revision, the last week you opened, and the subjects you choose in your profile.</li>
        <li><strong>Without an account</strong>: progress is stored only in your browser’s local storage and is never sent to us.</li>
        <li><strong>AI doubts</strong>: the messages you send to the AI Doubt Solver are sent to our AI provider (currently Groq) to write the answer. We keep a daily count of your requests and the size of the answers to apply plan limits; we don’t store the chat itself.</li>
        <li><strong>Usage statistics</strong>: anonymous page views and page-speed measurements through Vercel Web Analytics and Speed Insights. They use no cookies and don’t identify you.</li>
      </ul>
      <p>We do not collect payment details, your location, or your contacts, and we do not use advertising or tracking cookies.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To log you in and keep your progress in sync across your devices.</li>
        <li>To show your accuracy, weak topics and test history to you.</li>
      </ul>
      <p>We do not sell your data or share it with advertisers.</p>

      <h2>Where it is stored</h2>
      <p>
        Account and progress data is stored with Supabase, our database and login provider. Google sign-in is handled by Google. The website
        is hosted on Vercel. Each student can only access their own records; this is enforced by the database itself.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can use NEXT GEN without an account.</li>
        <li>You can reset your progress at any time from <Link href="/progress">My Progress</Link>.</li>
        <li>You can permanently delete your account and all its data from <Link href="/profile">My profile</Link>.</li>
      </ul>

      <h2>Contact</h2>
      <p>Questions about your data? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </article>
  );
}
