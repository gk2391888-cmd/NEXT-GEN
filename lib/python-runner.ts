'use client';

export type TestInput = { call: string; expected: string };
export type TestResult = { pass: boolean; got?: string; error?: string };
export type RunResult = { stdout: string; error: string | null; results: TestResult[]; timedOut?: boolean };

const TIMEOUT_MS = 8000;

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let nextId = 1;

function start(): Promise<void> {
  if (readyPromise) return readyPromise;
  worker = new Worker('/pyodide-worker.js');
  readyPromise = new Promise((resolve, reject) => {
    const onReady = (e: MessageEvent) => {
      if (!('ready' in e.data)) return;
      worker?.removeEventListener('message', onReady);
      e.data.ready ? resolve() : reject(new Error(e.data.error ?? 'Python failed to load'));
    };
    worker!.addEventListener('message', onReady);
  });
  readyPromise.catch(() => reset());
  return readyPromise;
}

function reset() {
  worker?.terminate();
  worker = null;
  readyPromise = null;
}

/** Starts downloading Python in the background (about 10 MB, cached by the browser after the first time). */
export function warmUpPython(): Promise<void> {
  return start();
}

/** Runs `code`, then evaluates each test's call and compares repr() with `expected`. */
export async function runPython(code: string, tests: TestInput[] = []): Promise<RunResult> {
  await start();
  const id = nextId++;
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      // An endless loop can't be interrupted inside the worker, so replace the worker.
      reset();
      resolve({ stdout: '', error: `Your code took longer than ${TIMEOUT_MS / 1000} seconds. Check for an endless loop.`, results: [], timedOut: true });
    }, TIMEOUT_MS);
    const onMessage = (e: MessageEvent) => {
      if (e.data.id !== id) return;
      window.clearTimeout(timer);
      worker?.removeEventListener('message', onMessage);
      resolve(e.data as RunResult);
    };
    worker!.addEventListener('message', onMessage);
    worker!.postMessage({ id, code, tests });
  });
}
