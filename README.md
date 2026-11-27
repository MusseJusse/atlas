# Atlas

AI model benchmarks at [atlas.mussejusse.com](https://atlas.mussejusse.com). Built with React, TypeScript, Tailwind CSS, and Vite.

## Development

```sh
pnpm install
pnpm dev
```

Serves locally at `http://127.0.0.1:4387`.

```sh
pnpm check          # Type check
pnpm test           # Unit tests
pnpm build          # Production build
pnpm test:browser   # Playwright tests (requires `pnpm exec playwright install chromium`)
```

## Data

Model benchmarks (`src/data/benchmarks.json`) sync from [Artificial Analysis](https://artificialanalysis.ai/models):

```sh
pnpm data:check     # Check upstream for changes
pnpm data:refresh   # Update benchmarks.json and changelog.json locally
pnpm data:sync      # Refresh in a temp worktree, run checks, and open/update a PR
```

`coding-agents.json`, `cyber-index.json`, and `subscriptions.json` are separate manual snapshots.

## Local service (macOS)

Serves `dist/` via LaunchAgent on `http://127.0.0.1:4387` (shares the port with `pnpm dev`):

```sh
pnpm local:start
pnpm local:stop
pnpm local:status
```

## Attribution

- Benchmarks: [Artificial Analysis](https://artificialanalysis.ai/)
- Subscription estimates: [MyPriors](https://mypriors.com/) / [Real API Pricing](https://github.com/Fei2411/real-api-pricing)
- Original baseline and model logos: [Slopalytics](https://slopalytics.com/)
- Font: DM Sans ([SIL OFL](public/fonts/OFL.txt))

Not affiliated with Artificial Analysis or Slopalytics.
