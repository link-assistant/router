// Published packages carry authenticated, staged build artifacts for offline
// parsing. Source checkouts can read the same pinned artifacts from the ignored
// download cache without copying external grammars into tracked runtime data.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

export function readCompressedGrammarAsset(logicalPath, packagedFile, expectedSha256) {
  const configured = process.env.META_LANGUAGE_EXTERNAL_GRAMMAR_CACHE;
  if (configured !== undefined && !isAbsolute(configured)) throw new Error('META_LANGUAGE_EXTERNAL_GRAMMAR_CACHE must be absolute');
  const cache = configured ?? fileURLToPath(new URL('../../.external-grammars/', import.meta.url));
  const candidates = [packagedFile, resolve(cache, logicalPath)];
  for (const file of candidates) {
    let stored;
    try { stored = readFileSync(file); }
    catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const bytes = gunzipSync(stored);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== expectedSha256) throw new Error(`${logicalPath}: downloaded grammar artifact digest differs from its lock`);
    return bytes;
  }
  throw new Error(`${logicalPath}: pinned grammar artifact is absent; provision it with js/scripts/external-grammar-cache.mjs --asset ${logicalPath}`);
}
