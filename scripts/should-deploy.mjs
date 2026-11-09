// Decides whether the host builds this commit. Used as Vercel's "Ignored Build Step"
// (vercel.json ignoreCommand) and Netlify's build `ignore` (netlify.toml).
// Both hosts read the exit code the same way: 0 = skip the build, 1 = build.
//
// Every build re-renders ~1,500 pages, and every deploy writes them into a fresh cache, so
// building each commit is what used up the hosting plan's limits. Only commits on main whose
// message contains [deploy] are built: batch work into commits, then push one with [deploy]
// (an empty one works: git commit --allow-empty -m "release [deploy]").
// Set FORCE_DEPLOY=1 in the host's environment to build every main commit again.
import { execSync } from 'node:child_process';

const branch = process.env.VERCEL_GIT_COMMIT_REF ?? process.env.BRANCH ?? '';
const message =
  process.env.VERCEL_GIT_COMMIT_MESSAGE ??
  (() => {
    try {
      return execSync('git log -1 --pretty=%B', { encoding: 'utf8' });
    } catch {
      return '';
    }
  })();

const build = branch === 'main' && (process.env.FORCE_DEPLOY === '1' || message.includes('[deploy]'));
console.log(build ? `Building ${branch}: the commit asks for a deploy.` : `Skipping the build: only main commits with [deploy] in the message are built (branch "${branch}").`);
process.exit(build ? 1 : 0);
