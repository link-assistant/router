// Generated draft from scripts/check-changelog-fragment.rs; sha256=e5517aaf59acb6ac8b3e2f797497ec5bde9e4050f78330f2f511d39836384710
// Carried constructs are data, never runtime parity evidence.
function ml_router_iter(values) { return Array.prototype.values.call(values); }

function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }

function is_source_file(file_path) {
  if (!(typeof file_path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(file_path))) throw new TypeError('argument outside supported Rust value domain');
  return (!file_path.endsWith(".md") && !ml_router_any(ml_router_iter(Object.freeze(["changelog.d/", "dev/log/", "docs/", "examples/", "experiments/"])), (prefix) => { return file_path.startsWith(prefix); }));
}

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
};

const serde_json = {
  error: {

  },
};

function is_changelog_fragment(file_path) {
  if (!(typeof file_path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(file_path))) throw new TypeError('argument outside supported Rust value domain');
  return ((file_path.startsWith("changelog.d/") && file_path.endsWith(".md")) && !file_path.endsWith("README.md"));
}

function MAX_PENDING_FRAGMENTS() {
  return 40n;
}

export const translated = { ["is_source_file"]: is_source_file, ["is_changelog_fragment"]: is_changelog_fragment, ["MAX_PENDING_FRAGMENTS"]: MAX_PENDING_FRAGMENTS() };
export const provenance = {"sourcePath":"scripts/check-changelog-fragment.rs","sourceSha256":"e5517aaf59acb6ac8b3e2f797497ec5bde9e4050f78330f2f511d39836384710","executable":3,"executableFunctions":2,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":7,"preserved":10,"runtimeParity":false};
