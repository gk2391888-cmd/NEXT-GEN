/**
 * Throwaway-inbox services. The login form refuses them, and POST /api/trial/start
 * gives no free trial to an account that got through with one anyway.
 * Shared by the browser and the server; add a domain here to block it everywhere.
 */
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '10minutemail.net', '10minemail.com', '20minutemail.com', '33mail.com',
  'anonbox.net', 'anonaddy.me', 'byom.de', 'burnermail.io', 'chacuo.net',
  'cock.li', 'crazymailing.com', 'cuvox.de', 'dayrep.com', 'discard.email',
  'discardmail.com', 'dispostable.com', 'dropmail.me', 'easytrashmail.com', 'einrot.com',
  'emailfake.com', 'emailondeck.com', 'emailtemporanea.com', 'emltmp.com', 'fakeinbox.com',
  'fakemail.net', 'fakemailgenerator.com', 'fexbox.org', 'fleckens.hu', 'getairmail.com',
  'getnada.com', 'gmailnator.com', 'grr.la', 'guerrillamail.biz', 'guerrillamail.com',
  'guerrillamail.de', 'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
  'gustr.com', 'harakirimail.com', 'hidemail.de', 'incognitomail.org', 'inboxbear.com',
  'inboxkitten.com', 'jetable.org', 'jourrapide.com', 'kurzepost.de', 'linshiyouxiang.net',
  'mail-temp.com', 'mail.tm', 'mail7.io', 'mailcatch.com', 'maildrop.cc',
  'mailinator.com', 'mailinator.net', 'mailinator2.com', 'mailnesia.com', 'mailpoof.com',
  'mailsac.com', 'mailtemp.net', 'mintemail.com', 'mohmal.com', 'moakt.com',
  'mvrht.net', 'mytemp.email', 'nada.email', 'nwytg.net', 'objectmail.com',
  'one-time.email', 'owlymail.com', 'pokemail.net', 'rhyta.com', 'rootfest.net',
  'sharklasers.com', 'shitmail.me', 'spam4.me', 'spambox.us', 'spamgourmet.com',
  'superrito.com', 'teleworm.us', 'temp-mail.io', 'temp-mail.org', 'tempail.com',
  'tempinbox.com', 'tempm.com', 'tempmail.com', 'tempmail.dev', 'tempmail.net',
  'tempmail.plus', 'tempmailo.com', 'tempmailaddress.com', 'tempr.email', 'throwawaymail.com',
  'tmail.ws', 'tmailor.com', 'tmpbox.net', 'tmpmail.net', 'tmpmail.org',
  'trash-mail.com', 'trashmail.com', 'trashmail.de', 'trashmail.io', 'trashmail.net',
  'trbvm.com', 'vomoto.com', 'wegwerfmail.de', 'yopmail.com', 'yopmail.fr',
  'yopmail.net', 'zetmail.com', 'zippymail.info',
]);

const domainOf = (email: string) => email.trim().toLowerCase().split('@').pop() ?? '';

/** True for an address at a throwaway-inbox service (or a subdomain of one). */
export function isDisposableEmail(email: string): boolean {
  const parts = domainOf(email).split('.');
  // mail.yopmail.com → also checks yopmail.com
  for (let i = 0; i < parts.length - 1; i++) if (DISPOSABLE_DOMAINS.has(parts.slice(i).join('.'))) return true;
  return false;
}
