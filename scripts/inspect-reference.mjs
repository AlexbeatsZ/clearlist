// Read-only inspection. Outputs feature facts, never extracted source or user data.
import fs from 'node:fs';
const archive = process.argv[2];
if (!archive) {
  console.error('Usage: node scripts/inspect-reference.mjs <path-to-app.asar>');
  process.exit(2);
}
const handle = fs.openSync(archive, 'r');
try {
  const prefix = Buffer.alloc(16);
  fs.readSync(handle, prefix, 0, 16, 0);
  const length = prefix.readUInt32LE(12),
    start = 8 + prefix.readUInt32LE(4);
  if (length > 50 * 1024 * 1024 || length < 2) throw new Error('Unsupported ASAR header');
  const header = Buffer.alloc(length);
  fs.readSync(handle, header, 0, length, 16);
  const root = JSON.parse(header);
  const entries = [];
  function walk(node, base = '') {
    for (const [name, entry] of Object.entries(node.files ?? {})) {
      const path = base + name;
      if (entry.files) walk(entry, path + '/');
      else entries.push({ path, ...entry });
    }
  }
  walk(root);
  function read(entry) {
    if (entry.unpacked || !Number.isSafeInteger(entry.size) || entry.size > 20 * 1024 * 1024)
      throw new Error('Unsupported ASAR entry');
    const offset = Number(entry.offset);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Unsupported offset');
    const bytes = Buffer.alloc(entry.size);
    if (fs.readSync(handle, bytes, 0, bytes.length, start + offset) !== bytes.length)
      throw new Error('Truncated entry');
    return bytes.toString('utf8');
  }
  const pkg = JSON.parse(read(entries.find((e) => e.path === 'package.json')));
  const scripts = entries.filter(
    (e) =>
      /^(js\/|background\.js$)/.test(e.path) &&
      e.path.endsWith('.js') &&
      !e.path.includes('vendors'),
  );
  const markers = {
    today: 'todo-list-today',
    upcoming: 'todo-list-recent',
    inbox: 'todo-list-todo-box',
    calendar: 'todo-list-calendar',
    completed: 'todo-list-completed',
    trash: 'todo-list-recycle-bin',
    tags: 'todo-list-tag',
    lists: 'todo-list-category',
    focus: 'startPomodoro',
    subtasks: 'toggleAllSubtasks',
    repeat: 'modal-todo-repeat-settings',
  };
  const source = scripts.map(read).join('\n');
  console.log(
    JSON.stringify(
      {
        version: pkg.version,
        entryPoint: pkg.main,
        scripts: scripts.map(({ path, size }) => ({ path, bytes: size })),
        features: Object.fromEntries(
          Object.entries(markers).map(([name, marker]) => [name, source.includes(marker)]),
        ),
        hasLocalTaskTable: /CREATE TABLE IF NOT EXISTS todos/.test(source),
        sqliteDependency: Object.keys(pkg.dependencies ?? {}).some((x) => /sqlite/.test(x)),
      },
      null,
      2,
    ),
  );
} finally {
  fs.closeSync(handle);
}
