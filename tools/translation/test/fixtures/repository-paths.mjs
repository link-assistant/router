// Crate-relative test inputs retain logical names after the physical move.
import {fileURLToPath} from 'node:url';
import {rustPackageSourcePath} from '../../repository-layout.mjs';
export function repositorySourceURL(path, root) {
  return new URL(rustPackageSourcePath(fileURLToPath(root),path),root);
}
