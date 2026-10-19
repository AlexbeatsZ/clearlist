import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FileStore } from '../electron/storage';
import { emptyState, newTask } from '../src/model';

test('manual restore after unrecoverable corruption archives both originals before replacing the main file', async () => {
  const base = path.join(os.tmpdir(), '.agents');
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(path.join(base, 'clearlist-restore-'));
  try {
    const store = new FileStore(directory);
    await writeFile(store.file, 'broken main');
    await writeFile(store.backup, 'broken backup');
    await assert.rejects(store.load());
    const restored = await store.restore({ ...emptyState(), tasks: [newTask('Recovered task')] });
    assert.equal(restored.state.tasks.length, 1);
    const archived = (await readdir(directory)).filter((name) => name.includes('.before-restore-'));
    assert.equal(archived.length, 2);
    assert.deepEqual(
      new Set(
        await Promise.all(archived.map((name) => readFile(path.join(directory, name), 'utf8'))),
      ),
      new Set(['broken main', 'broken backup']),
    );
    assert.equal((await new FileStore(directory).load()).state.tasks[0].title, 'Recovered task');
    await assert.rejects(store.restore(emptyState()), /合并导入/);
  } finally {
    assert.ok(path.resolve(directory).startsWith(path.resolve(base) + path.sep));
    await rm(directory, { recursive: true, force: true });
  }
});
