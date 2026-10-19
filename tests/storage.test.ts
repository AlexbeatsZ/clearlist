import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FileStore } from '../electron/storage';
import { emptyState, newTask, stateSchema } from '../src/model';

const base = path.join(os.tmpdir(), '.agents');
async function fixture(fn: (store: FileStore, directory: string) => Promise<void>) {
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(path.join(base, 'clearlist-unit-'));
  try {
    await fn(new FileStore(dir), dir);
  } finally {
    assert.ok(path.resolve(dir).startsWith(path.resolve(base) + path.sep));
    await rm(dir, { recursive: true, force: true });
  }
}
test('file store serializes concurrent writes and retains the previous valid state', async () =>
  fixture(async (store) => {
    const initial = await store.load();
    assert.equal(initial.state.tasks.length, 0);
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        store.save({ ...emptyState(), tasks: [newTask(`Version ${i}`)] }),
      ),
    );
    assert.equal(
      stateSchema.parse(JSON.parse(await readFile(store.file, 'utf8'))).tasks[0].title,
      'Version 11',
    );
    assert.equal(
      stateSchema.parse(JSON.parse(await readFile(store.backup, 'utf8'))).tasks[0].title,
      'Version 10',
    );
    const reloaded = await new FileStore(store.directory).load();
    assert.equal(reloaded.state.tasks[0].title, 'Version 11');
  }));
test('a corrupt main store recovers from valid backup and preserves damaged bytes', async () =>
  fixture(async (store, dir) => {
    await store.load();
    const s = { ...emptyState(), tasks: [newTask('Safe')] };
    await store.save(s);
    await store.save({ ...s, tasks: [...s.tasks, newTask('Latest')] });
    await writeFile(store.file, '{damaged', 'utf8');
    const recovered = await new FileStore(dir).load();
    assert.equal(recovered.recovered, true);
    assert.equal(recovered.state.tasks[0].title, 'Safe');
    const damaged = (await readdir(dir)).find((file) => file.startsWith('data.corrupt-'))!;
    assert.ok(damaged);
    assert.equal(await readFile(path.join(dir, damaged), 'utf8'), '{damaged');
  }));
test('unrecoverable data blocks writes rather than silently replacing tasks', async () =>
  fixture(async (store, dir) => {
    await writeFile(store.file, 'broken', 'utf8');
    await assert.rejects(store.load(), /没有有效备份/);
    await assert.rejects(store.save(emptyState()), /拒绝覆盖/);
    assert.equal(await readFile(store.file, 'utf8'), 'broken');
    await writeFile(path.join(dir, 'data.backup.json'), 'also broken');
    await assert.rejects(new FileStore(dir).load(), /没有有效备份/);
  }));
test('invalid save does not disturb existing disk data', async () =>
  fixture(async (store) => {
    await store.load();
    await store.save({ ...emptyState(), tasks: [newTask('Keep me')] });
    assert.throws(() => store.save({ version: 99 }));
    assert.equal((await store.load()).state.tasks[0].title, 'Keep me');
  }));
