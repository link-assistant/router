// Physical language roots are operational data, never semantic authority.
import {existsSync, lstatSync} from 'node:fs';
import {join, resolve} from 'node:path';

export const LANGUAGE_ROOTS = Object.freeze({javascript: 'js', typescript: 'ts', rust: 'rust'});

// Existing crate-relative APIs retain their logical source names. Resolve only
// their physical reads; inventories continue to use full repository paths.
export function rustPackageSourcePath(root, path) {
  if (path !== 'Cargo.toml' && path !== 'Cargo.lock' && path !== 'build.rs' && !/^(?:src|tests|benches|examples|fixtures|fuzz|proptest-regressions)(?:\/|$)/u.test(path)) return path;
  const layout = repositoryRustLayout(root);
  if (path === 'Cargo.toml') return layout.manifest;
  if (path === 'Cargo.lock') return layout.lock;
  return layout.root === '.' ? path : `${layout.root}/${path}`;
}

export function repositoryRustLayout(root) {
  root = resolve(root);
  const nested = join(root, 'rust/Cargo.toml');
  let nestedStatus;
  try { nestedStatus = lstatSync(nested); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (nestedStatus && (!nestedStatus.isFile() || nestedStatus.isSymbolicLink() || lstatSync(join(root,'rust')).isSymbolicLink())) {
    throw new TypeError('Rust package manifest must be an ordinary physical file');
  }
  const prefix = nestedStatus ? 'rust/' : '';
  const manifest = `${prefix}Cargo.toml`;
  // Router uses a root workspace lock; standalone receiving crates may own it.
  const lock = existsSync(join(root, 'Cargo.lock')) ? 'Cargo.lock' : `${prefix}Cargo.lock`;
  return Object.freeze({
    root: prefix ? 'rust' : '.', manifest, lock,
    cargoInputs: Object.freeze([...new Set([...(prefix ? ['Cargo.toml'] : []), manifest, lock])]),
    entries: Object.freeze([`${prefix}src/lib.rs`, `${prefix}src/main.rs`]),
    productionPrefix: `${prefix}src/`,
  });
}

// A repository path substitution only. Callers must rejoin the selected
// complete captured row; a matching spelling grants no source authority.
export function relocatedRustSourcePath(path) {
  return path === 'Cargo.toml' || path === 'build.rs' || /^(?:src|tests|benches|examples|fuzz|fixtures|proptest-regressions)\//u.test(path) ? `rust/${path}` : path;
}

// Pure repository labels. The actual source graph, complete bytes, namespace,
// ownership and semantic checks remain the caller's independent obligations.
// Only the two declared physical Router crate entries select the rust/ prefix.
export function crateEntrySourcePath(entry,path) {
  return entry==='rust/src/lib.rs'||entry==='rust/src/main.rs' ? 'rust/'+path : path;
}
export function crateModuleSourcePath(modules,path) {
  let entry=null,count=0;
  for(const module of modules)if(module.path.length===0){entry=module.file;count++;}
  return crateEntrySourcePath(count===1?entry:null,path);
}
