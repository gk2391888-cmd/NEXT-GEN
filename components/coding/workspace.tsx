'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CodingProblem } from '@/lib/coding';
import { runPython, warmUpPython, type RunResult } from '@/lib/python-runner';
import { progress, useProgress } from '@/lib/progress/store';
import { InlineText } from '@/components/ui';

type Props = { problem: CodingProblem; prev?: string; next?: string; position: number; total: number };

const draftKey = (id: string) => `nextgen-code:${id}`;

function readDraft(problem: CodingProblem) {
  try {
    return window.localStorage.getItem(draftKey(problem.id)) ?? problem.starter;
  } catch {
    return problem.starter;
  }
}

export function CodingWorkspace({ problem, prev, next, position, total }: Props) {
  const solved = Boolean(useProgress().coding?.[problem.id]);
  const [code, setCode] = useState(problem.starter);
  const [pythonState, setPythonState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null);
  const [output, setOutput] = useState<RunResult | null>(null);
  const [submitted, setSubmitted] = useState<RunResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const visible = problem.tests.filter((t) => !t.hidden);

  useEffect(() => {
    setCode(readDraft(problem));
    setOutput(null);
    setSubmitted(null);
    setShowHint(false);
    setShowSolution(false);
    warmUpPython().then(() => setPythonState('ready')).catch(() => setPythonState('failed'));
  }, [problem]);

  function update(value: string) {
    setCode(value);
    try {
      window.localStorage.setItem(draftKey(problem.id), value);
    } catch {
      // Draft just won't survive a reload.
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = el;
      update(code.slice(0, s) + '    ' + code.slice(end));
      requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      run();
    }
  }

  async function run() {
    setBusy('run');
    setOutput(await runPython(code, visible));
    setBusy(null);
  }

  async function submit() {
    setBusy('submit');
    const result = await runPython(code, problem.tests);
    setSubmitted(result);
    setOutput(null);
    if (!result.error && result.results.length === problem.tests.length && result.results.every((r) => r.pass)) {
      progress.markSolved(problem.id);
    }
    setBusy(null);
  }

  function reset() {
    if (window.confirm('Replace your code with the starting code?')) update(problem.starter);
  }

  const passed = submitted?.results.filter((r) => r.pass).length ?? 0;
  const allPassed = submitted && !submitted.error && passed === problem.tests.length;

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: 1, minWidth: 0 }}>
        <div className="quiz-top">
          <span className={`chip ${problem.difficulty === 'hard' ? 'chip-red' : problem.difficulty === 'medium' ? 'chip-yellow' : 'chip-teal'}`}>{problem.difficulty.toUpperCase()}</span>
          <span className="muted">Problem {position} of {total}{solved && ' · ✓ Solved'}</span>
        </div>
        <h2 style={{ marginBottom: 6 }}>{problem.title}</h2>
        <p style={{ color: 'var(--body)' }}><InlineText text={problem.statement} /></p>

        <div className="editor-wrap">
          <textarea
            className="code-editor"
            value={code}
            onChange={(e) => update(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Your Python code"
            rows={Math.max(10, code.split('\n').length + 2)}
          />
        </div>

        <div className="quiz-actions">
          <div className="btn-group">
            <button className="btn btn-secondary" onClick={run} disabled={busy !== null || pythonState !== 'ready'}>
              {busy === 'run' ? 'Running…' : '▶ Run'}
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={busy !== null || pythonState !== 'ready'}>
              {busy === 'submit' ? 'Checking…' : 'Submit'}
            </button>
          </div>
          <div className="btn-group">
            <button className="text-btn" onClick={() => setShowHint((h) => !h)}>{showHint ? 'Hide hint' : 'Hint'}</button>
            <button className="text-btn" onClick={reset}>Reset code</button>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          {pythonState === 'loading' && 'Loading Python… (first time takes a few seconds)'}
          {pythonState === 'failed' && 'Python couldn’t load. Check your connection and refresh the page.'}
          {pythonState === 'ready' && 'Tip: Ctrl + Enter runs your code. Your code is saved on this device.'}
        </p>
        {showHint && <div className="mistake" style={{ marginTop: 10 }}><strong>Hint:</strong> <InlineText text={problem.hint} /></div>}

        {output && (
          <div style={{ marginTop: 14 }}>
            <span className="field-label">Output</span>
            {output.stdout && <pre className="code-block">{output.stdout}</pre>}
            {output.error ? (
              <pre className="code-block error-block">{output.error}</pre>
            ) : (
              !output.stdout && output.results.length === 0 && <p className="muted">Your code ran without printing anything.</p>
            )}
          </div>
        )}

        {(solved || showSolution) && (
          <details className="solution" open={showSolution}>
            <summary onClick={(e) => { e.preventDefault(); setShowSolution((s) => !s); }}>{showSolution ? 'Hide' : 'Show'} model solution</summary>
            {showSolution && <pre className="code-block">{problem.solution}</pre>}
          </details>
        )}

        <div className="notes-foot">
          {prev ? <Link className="link" href={`/lab/${prev}`}>← Previous</Link> : <span />}
          {next ? <Link className="link" href={`/lab/${next}`}>Next problem →</Link> : <Link className="link" href="/lab">All problems →</Link>}
        </div>
      </div>

      <aside className="card test-side">
        <h3>Test cases</h3>
        {problem.tests.map((t, i) => {
          const r = submitted?.results[i] ?? (output && !t.hidden ? output.results[visible.indexOf(t)] : undefined);
          return (
            <div key={i} className="test-row">
              <code className="test-call">{t.hidden ? `Hidden test ${problem.tests.slice(0, i + 1).filter((x) => x.hidden).length}` : t.call}</code>
              {r ? (
                <span className={`chip ${r.pass ? 'chip-teal' : 'chip-red'}`}>{r.pass ? 'PASS' : 'FAIL'}</span>
              ) : (
                !t.hidden && <span className="muted">→ {t.expected}</span>
              )}
              {r && !r.pass && !t.hidden && <div className="test-detail">Expected {t.expected}, got {r.got ?? r.error}</div>}
            </div>
          );
        })}
        {submitted && (
          <div className={`explain${allPassed ? '' : ' bad'}`} style={{ marginTop: 12 }}>
            {submitted.error ? (
              <strong>Your code has an error. Fix it and submit again.</strong>
            ) : allPassed ? (
              <strong>✓ All {problem.tests.length} tests passed. Well done!</strong>
            ) : (
              <>
                <strong>{passed} of {problem.tests.length} tests passed.</strong>{' '}
                {!showSolution && <button className="text-btn" onClick={() => setShowSolution(true)}>Stuck? See the solution</button>}
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
