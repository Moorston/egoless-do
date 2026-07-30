// Ambient declarations for react-test-renderer (ships no @types).
// Covers only the members used across tests. Both a default export (TestRenderer
// factory) and a named `create` export are provided so existing test files that
// import either shape continue to type-check.
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export interface ReactTestRenderer {
    unmount(): void;
    update(element: ReactElement): void;
    toJSON(): unknown;
    root: unknown;
  }
  const TestRenderer: {
    create(element: ReactElement): ReactTestRenderer;
  };
  export default TestRenderer;
  export function create(element: ReactElement): ReactTestRenderer;
}
