import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const GET: RequestHandler = async ({ url }) => {
  let dir = url.searchParams.get('path');
  if (!dir) {
    dir = process.env.ZFRPC_DIR || process.cwd();
  }

  try {
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
      return json({ error: 'Not a directory', entries: [] });
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const result = entries.map(e => ({
      name: e.name,
      isDir: e.isDirectory(),
      path: path.join(dir, e.name)
    }));
    return json({ entries: result, currentDir: dir });
  } catch (err) {
    return json({ error: (err as Error).message, entries: [] });
  }
};
