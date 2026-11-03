/* Runs student Python in a Web Worker with Pyodide, so a slow or endless
   program can't freeze the page (the page terminates this worker on timeout). */
importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');

const ready = loadPyodide();

const HARNESS = `
import sys, io, traceback, json

def __ng_run(code, tests):
    out = io.StringIO()
    ns = {"__name__": "__main__"}
    old = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = out
    error = None
    results = []
    try:
        exec(compile(code, "main.py", "exec"), ns)
    except BaseException:
        error = traceback.format_exc(limit=-3)
    finally:
        sys.stdout, sys.stderr = old
    if error is None:
        for t in tests:
            try:
                got = repr(eval(t["call"], ns))
                results.append({"pass": got == t["expected"], "got": got[:500]})
            except BaseException as e:
                results.append({"pass": False, "error": f"{type(e).__name__}: {e}"[:500]})
    return json.dumps({"stdout": out.getvalue()[:20000], "error": error, "results": results})
`;

let harnessLoaded = false;

self.onmessage = async (event) => {
  const { id, code, tests } = event.data;
  try {
    const pyodide = await ready;
    if (!harnessLoaded) {
      pyodide.runPython(HARNESS);
      harnessLoaded = true;
    }
    const run = pyodide.globals.get('__ng_run');
    const json = run(code, pyodide.toPy(tests ?? []));
    run.destroy();
    self.postMessage({ id, ...JSON.parse(json) });
  } catch (err) {
    self.postMessage({ id, stdout: '', error: String(err), results: [] });
  }
};

ready.then(() => self.postMessage({ ready: true })).catch((err) => self.postMessage({ ready: false, error: String(err) }));
