/// <reference types="vite/client" />

declare module 'virtual:benchmarks' {
  const snapshot: import('./data/schema').Snapshot;
  export default snapshot;
}
