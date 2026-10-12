// Portable source-derived retention dependency closure, with original JS bodies.
// Only import specifiers relocate; no Rust/compiler body or owner proof is made.
import {readFileSync} from 'node:fs';
const root=new URL('./',import.meta.url);
function relocate(source,from,to) {
  if(!source.includes(from))throw new TypeError('Retention runtime dependency import changed: '+from);
  return source.replaceAll(from,to);
}
export function jsonRetentionRuntimeAssets() {
  const source=path=>readFileSync(new URL(path,root),'utf8'),files=new Map();
  files.set('json-roundtrip-retention-source.mjs',source('extensions/json-roundtrip-retention-source.mjs'));
  files.set('json-roundtrip-lexical.mjs',relocate(source('extensions/json-roundtrip-lexical.mjs'),"'../arithmetic-digit-retention.mjs'","'./arithmetic-digit-retention.mjs'"));
  files.set('arithmetic-digit-retention.mjs',source('arithmetic-digit-retention.mjs'));
  files.set('macro-token-trees.mjs',source('macro-token-trees.mjs'));
  files.set('rust-structure.mjs',relocate(source('rust-structure.mjs'),"'./vendor/formal-ai/lexer.mjs'","'./formal-ai-lexer.mjs'"));
  files.set('formal-ai-lexer.mjs',source('vendor/formal-ai/lexer.mjs'));
  files.set('formal-ai-lexer-LICENSE',source('vendor/formal-ai/LICENSE'));
  return files;
}
