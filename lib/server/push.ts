import 'server-only';
import webpush from 'web-push';
import { SITE_URL } from '@/lib/site';

/**
 * Web push keys (VAPID). Make a pair once with `npx web-push generate-vapid-keys` and set
 * VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel. Without them reminders stay switched off.
 */
export function pushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey };
}

let configured = false;

/** web-push, set up with the keys; null when they're missing. */
export function pushClient() {
  const config = pushConfig();
  if (!config) return null;
  if (!configured) {
    // Push services may contact this address about problems with our messages.
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? SITE_URL, config.publicKey, config.privateKey);
    configured = true;
  }
  return webpush;
}
