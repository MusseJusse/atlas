import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import original from '../src/data/benchmarks.json';
import { runCommand, syncData } from './sync-data';
import { historySchema, snapshotSchema } from './model-updates';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'test-data-sync-'));
  directories.push(directory);
  const cwd = join(directory, 'repo');
  const remote = join(directory, 'remote.git');
  await mkdir(join(cwd, 'src/data'), { recursive: true });
  const git = (...args: string[]) => runCommand('git', args, cwd);
  git('init', '--bare', remote);
  git('init', '-b', 'main');
  git('config', 'user.name', 'Sync test');
  git('config', 'user.email', 'sync@example.com');
  git('config', 'commit.gpgsign', 'false');
  git('remote', 'add', 'origin', remote);
  const baseline = {
    fetchedAt: '2026-10-13T20:47:14.735Z',
    models: [{ ...original.models[0]!, name: 'Baseline' }],
  };
  await writeFile(join(cwd, 'src/data/benchmarks.json'), JSON.stringify(baseline));
  await writeFile(
    join(cwd, 'src/data/changelog.json'),
    JSON.stringify({
      source: 'https://slopalytics.com/',
      baselineFetchedAt: baseline.fetchedAt,
      updates: [],
    }),
  );
  await writeFile(join(cwd, 'README.md'), 'Original readme');
  git('add', '.');
  git('commit', '-m', 'Initial data');
  git('push', '-u', 'origin', 'main');
  git('switch', '-c', 'my-work');
  await writeFile(join(cwd, 'README.md'), 'My uncommitted work');
  await writeFile(join(cwd, 'notes.txt'), 'My untracked notes');
  const originalHead = git('rev-parse', 'HEAD');
  const originalStatus = git('status', '--porcelain');
  const originalWorktrees = git('worktree', 'list', '--porcelain');
  const next = structuredClone(baseline);
  let request: { url: string; headRefName: string; headRefOid: string } | undefined;
  let failValidation = false;
  let racePush = false;
  const url = 'https://github.com/example/benchmarks/pull/1';
  const run = vi.fn<typeof runCommand>().mockImplementation((command, args, commandCwd) => {
    if (command === 'pnpm') {
      if (args[0] === 'test' && failValidation) throw new Error('Validation failed');
      if (args[0] === 'test' && racePush && request)
        git('--git-dir', remote, 'update-ref', `refs/heads/${request.headRefName}`, originalHead);
      return '';
    }
    if (command !== 'gh') return runCommand(command, args, commandCwd);
    if (args[0] === 'auth') return '';
    if (args[0] === 'repo') return JSON.stringify({ nameWithOwner: 'example/benchmarks' });
    if (args[1] === 'list') {
      if (request)
        request.headRefOid = git('--git-dir', remote, 'rev-parse', `refs/heads/${request.headRefName}`);
      return JSON.stringify(request ? [request] : []);
    }
    if (args[1] === 'create') {
      const branch = args[args.indexOf('--head') + 1]!;
      request = {
        url,
        headRefName: branch,
        headRefOid: git('--git-dir', remote, 'rev-parse', `refs/heads/${branch}`),
      };
      return url;
    }
    if (args[1] === 'edit') return url;
    throw new Error(`Unexpected gh command: ${args.join(' ')}`);
  });
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async (address) =>
        new Response(
          String(address).endsWith('.js')
            ? `const data=${JSON.stringify(next)}`
            : '<script type="module" src="/index.js"></script>',
        ),
    );
  async function expectCallerUntouched() {
    expect(git('branch', '--show-current')).toBe('my-work');
    expect(git('rev-parse', 'HEAD')).toBe(originalHead);
    expect(git('rev-parse', 'origin/main')).toBe(originalHead);
    expect(git('status', '--porcelain')).toBe(originalStatus);
    expect(git('worktree', 'list', '--porcelain')).toBe(originalWorktrees);
    expect(await readFile(join(cwd, 'README.md'), 'utf8')).toBe('My uncommitted work');
    expect(await readFile(join(cwd, 'notes.txt'), 'utf8')).toBe('My untracked notes');
  }
  return {
    cwd,
    directory,
    remote,
    git,
    next,
    run,
    fetcher,
    url,
    originalHead,
    expectCallerUntouched,
    request: () => request!,
    failValidation: () => {
      failValidation = true;
    },
    racePush: () => {
      racePush = true;
    },
  };
}

it('skips PRs and validation commands when the source matches main', async () => {
  const test = await fixture();
  expect(await syncData(test)).toBeNull();
  expect(test.run.mock.calls.some(([command]) => command === 'gh' || command === 'pnpm')).toBe(false);
  await test.expectCallerUntouched();
});

it('creates and updates one data PR, while repeated identical syncs do not push again', async () => {
  const test = await fixture();
  test.next.fetchedAt = '2026-10-17T12:00:00.000Z';
  test.next.models[0]!.name = 'First update';
  expect(await syncData(test)).toBe(test.url);
  const branch = test.request().headRefName;
  const first = test.git('--git-dir', test.remote, 'rev-parse', `refs/heads/${branch}`);
  expect(await syncData(test)).toBe(test.url);
  expect(test.git('--git-dir', test.remote, 'rev-parse', `refs/heads/${branch}`)).toBe(first);
  expect(
    test.run.mock.calls.filter(([command, args]) => command === 'gh' && args[1] === 'create'),
  ).toHaveLength(1);
  expect(test.run.mock.calls.filter(([command]) => command === 'pnpm')).toHaveLength(4);

  test.next.fetchedAt = '2026-10-18T12:00:00.000Z';
  test.next.models[0]!.name = 'Second update';
  expect(await syncData(test)).toBe(test.url);
  const show = (path: string) => test.git('--git-dir', test.remote, 'show', `refs/heads/${branch}:${path}`);
  expect(snapshotSchema.parse(JSON.parse(show('src/data/benchmarks.json'))).models[0]!.name).toBe(
    'Second update',
  );
  const updates = historySchema.parse(JSON.parse(show('src/data/changelog.json'))).updates;
  expect(updates).toHaveLength(1);
  expect(updates[0]!.changes[0]!.fields).toEqual([
    { field: 'name', before: 'Baseline', after: 'Second update' },
  ]);
  expect(
    test.run.mock.calls.filter(([command, args]) => command === 'gh' && args[1] === 'edit'),
  ).toHaveLength(1);
  await test.expectCallerUntouched();
});

it('does not push or open a PR if validation fails, and cleans up its worktree', async () => {
  const test = await fixture();
  test.next.models[0]!.name = 'Updated';
  test.failValidation();
  await expect(syncData(test)).rejects.toThrow('Validation failed');
  expect(test.git('--git-dir', test.remote, 'for-each-ref', '--format=%(refname)', 'refs/heads')).toBe(
    'refs/heads/main',
  );
  expect(test.run.mock.calls.some(([command, args]) => command === 'gh' && args[1] === 'create')).toBe(false);
  await test.expectCallerUntouched();
});

it('refuses to overwrite a sync branch if another push arrives during validation', async () => {
  const test = await fixture();
  test.next.models[0]!.name = 'First update';
  await syncData(test);
  test.next.models[0]!.name = 'Second update';
  test.racePush();
  await expect(syncData(test)).rejects.toThrow();
  expect(test.git('--git-dir', test.remote, 'rev-parse', `refs/heads/${test.request().headRefName}`)).toBe(
    test.originalHead,
  );
  expect(test.run.mock.calls.some(([command, args]) => command === 'gh' && args[1] === 'edit')).toBe(false);
  await test.expectCallerUntouched();
});

it('preserves non-data edits that someone adds to the managed PR branch', async () => {
  const test = await fixture();
  test.next.models[0]!.name = 'First update';
  await syncData(test);
  const branch = test.request().headRefName;
  const external = join(test.directory, 'external');
  test.git('worktree', 'add', '--detach', external, `origin/${branch}`);
  try {
    await writeFile(join(external, 'README.md'), 'A manual edit on the PR');
    runCommand('git', ['add', 'README.md'], external);
    runCommand('git', ['commit', '-m', 'Manual edit'], external);
    runCommand('git', ['push', 'origin', `HEAD:refs/heads/${branch}`], external);
  } finally {
    test.git('worktree', 'remove', '--force', external);
  }
  const head = test.git('--git-dir', test.remote, 'rev-parse', `refs/heads/${branch}`);
  test.next.models[0]!.name = 'Second update';
  await expect(syncData(test)).rejects.toThrow('non-data changes');
  expect(test.git('--git-dir', test.remote, 'rev-parse', `refs/heads/${branch}`)).toBe(head);
  expect(test.run.mock.calls.filter(([command]) => command === 'pnpm')).toHaveLength(4);
  await test.expectCallerUntouched();
});
