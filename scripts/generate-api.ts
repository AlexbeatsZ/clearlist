import { mkdir, writeFile } from 'node:fs/promises';
import { openapi } from '../src/api-contract';
await mkdir('docs/api', { recursive: true });
await writeFile('docs/api/openapi.json', `${JSON.stringify(openapi, null, 2)}\n`);
