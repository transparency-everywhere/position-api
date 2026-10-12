/**
 * Imports an ESM-only package from this CommonJS codebase.
 *
 * A literal `import()` does not survive the trip to runtime intact. Depending
 * on the compiler settings TypeScript may rewrite it into a `require` when it
 * emits CommonJS, and Jest's CommonJS runtime replaces it with its own module
 * loader, which cannot read an ES module and fails with "Must use import to
 * load ES Module". Building the call through `new Function` puts it beyond the
 * reach of both, so the host's own dynamic import performs the load.
 *
 * This is what lets the browser-backed sources run under the test runner as
 * well as in production; puppeteer has been ESM-only since v23.
 */
// The function body is a fixed literal and interpolates nothing, so this is
// not an eval of untrusted input; the constructor is used purely so that the
// import survives compilation and the test runner's transform untouched.
/* eslint-disable no-new-func, @typescript-eslint/no-implied-eval */
export const importEsm: (specifier: string) => Promise<any> = new Function(
  "specifier",
  "return import(specifier);",
) as (specifier: string) => Promise<any>;
/* eslint-enable no-new-func, @typescript-eslint/no-implied-eval */
