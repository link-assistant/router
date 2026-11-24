/** Initialize only RML's immutable official-source submodule, never a consumer repository. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const META_LANGUAGE_REVISION = 'a79782093cae3b33606483ac9f3e1d05faf36de0';
export const META_LANGUAGE_PATH = 'js/vendor/meta-language';
export const META_LANGUAGE_URL = 'https://github.com/link-foundation/meta-language.git';

const runGit = (root, args) => execFileSync('git', ['-C', root, ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 4 * 1024 * 1024,
}).trim();

export function initializeMetaLanguage(root, { git = runGit } = {}) {
  const manifestPath = path.join(root, 'js/package.json');
  if (!fs.existsSync(manifestPath) || !JSON.parse(fs.readFileSync(manifestPath)).imports?.['#meta-language']) {
    return { initialized: false, reason: 'no source-pinned dependency' };
  }
  // Exported archives and installed npm packages must carry runtime files; they
  // never initialize submodules or change the surrounding consumer's Git state.
  if (!fs.existsSync(path.join(root, '.git'))) return { initialized: false, reason: 'source archive' };
  if (fs.realpathSync(git(root, ['rev-parse', '--show-toplevel'])) !== fs.realpathSync(root)) {
    return { initialized: false, reason: 'not repository root' };
  }
  const modules = path.join(root, '.gitmodules');
  if (!fs.existsSync(modules)) throw new Error('Missing pinned meta-language .gitmodules registration');
  if (git(root, ['config', '-f', modules, '--get', 'submodule.meta-language.path']) !== META_LANGUAGE_PATH ||
      git(root, ['config', '-f', modules, '--get', 'submodule.meta-language.url']) !== META_LANGUAGE_URL) {
    throw new Error('Unexpected meta-language submodule path or URL; no source was changed');
  }
  const indexed = git(root, ['ls-files', '--stage', '--', META_LANGUAGE_PATH]);
  if (indexed !== `160000 ${META_LANGUAGE_REVISION} 0\t${META_LANGUAGE_PATH}`) {
    throw new Error('The meta-language Git pointer differs from the approved source revision; no source was changed');
  }
  let localUrl;
  try { localUrl = git(root, ['config', '--get', 'submodule.meta-language.url']); } catch { /* uninitialized */ }
  if (localUrl && localUrl !== META_LANGUAGE_URL) throw new Error('The local meta-language URL differs from the official URL; no source was changed');
  let ancestor = root;
  for (const segment of META_LANGUAGE_PATH.split('/')) {
    ancestor = path.join(ancestor, segment);
    if (fs.lstatSync(ancestor, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error('Refusing a symlink in the meta-language submodule path');
  }
  const target = path.join(root, META_LANGUAGE_PATH);
  const populated = fs.existsSync(target) && fs.readdirSync(target).length > 0;
  if (!populated) git(root, ['submodule', 'update', '--init', '--depth', '1', '--', META_LANGUAGE_PATH]);
  if (!fs.existsSync(path.join(target, '.git')) || fs.realpathSync(git(target, ['rev-parse', '--show-toplevel'])) !== fs.realpathSync(target)) {
    throw new Error('The meta-language path is not an initialized submodule; no existing files were replaced');
  }
  if (git(target, ['rev-parse', 'HEAD']) !== META_LANGUAGE_REVISION) throw new Error('The populated meta-language revision differs; refusing to reset it');
  if (git(target, ['status', '--porcelain', '--untracked-files=normal'])) throw new Error('The meta-language submodule has local changes; refusing to reset it');
  if (!fs.existsSync(path.join(target, 'js/src/index.js'))) throw new Error('The pinned meta-language runtime is missing');
  return { initialized: !populated, revision: META_LANGUAGE_REVISION };
}
