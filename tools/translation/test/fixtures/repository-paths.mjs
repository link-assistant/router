// Crate-relative test inputs retain logical names after the physical move.
import {fileURLToPath} from 'node:url';
import {rustPackageSourcePath,repositoryRustLayout} from '../../repository-layout.mjs';
export function repositorySourceURL(path, root) {
  return new URL(rustPackageSourcePath(fileURLToPath(root),path),root);
}
export function repositorySourcePath(path,root){
  return rustPackageSourcePath(typeof root==='string'?root:fileURLToPath(root),path);
}

// Explicit logical carrier labels for original test oracles. Operational
// inventories keep their physical paths and do not use this test-only mapping.
export function repositoryCratePaths(paths, root) {
  const layout=repositoryRustLayout(typeof root==='string'?root:fileURLToPath(root));
  return paths.map(path=>layout.root!=='.'&&path.startsWith(layout.root+'/')?path.slice(layout.root.length+1):path);
}
