/// <reference types="vite/client" />

declare module 'virtual:benchmarks' {
  const snapshot: import('./data/schema').Snapshot;
  export default snapshot;
}

declare module 'virtual:changelog' {
  const history: import('./data/schema').ChangeHistory;
  export default history;
}

declare module 'virtual:subscriptions' {
  const snapshot: import('./data/subscription-schema').SubscriptionSnapshot;
  export default snapshot;
}
