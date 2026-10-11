// Generated draft from scripts/detect-code-changes.rs; sha256=5de76c5232d13baa340f7813a84591ed0c8fb872983e5cf024e4303250edc8a9
// Carried constructs are data, never runtime parity evidence.
function ml_router_iter(values) { return Array.prototype.values.call(values); }

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function* ml_router_filter(values, predicate) { for (const value of values) if (predicate(value)) yield value; }

function ml_router_collect(values) { return Object.freeze(Array.from(values)); }

function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }

function is_excluded_from_code_changes(file_path) {
  if (!(typeof file_path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(file_path))) throw new TypeError('argument outside supported Rust value domain');
  if (file_path.endsWith(".md")) {
    return true;
  } else {
  }
  const excluded_folders = Object.freeze(["changelog.d/", "dev/log/", "docs/", "experiments/", "examples/"]);
  for (const folder of ml_router_iter(excluded_folders)) {
    if (file_path.startsWith(folder)) {
      return true;
    } else {
    }
  }
  return false;
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

function is_manifest_or_lockfile_change(file_path) {
  if (!(typeof file_path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(file_path))) throw new TypeError('argument outside supported Rust value domain');
  return (file_path.endsWith(".toml") || file_path.endsWith("Cargo.lock"));
}

function ml_make_ChangeKinds_ChangeKinds(rs, toml, mjs, docs, workflow, any_code) {
  if (!(typeof rs === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof toml === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof mjs === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof docs === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof workflow === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof any_code === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ChangeKinds", ["rs"]: rs, ["toml"]: toml, ["mjs"]: mjs, ["docs"]: docs, ["workflow"]: workflow, ["any_code"]: any_code });
}

function classify_changes(changed_files) {
  if (!ml_router_array(changed_files, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  const included = ml_router_collect(ml_router_filter(ml_router_iter(changed_files), (file) => { return !is_excluded_from_code_changes(file); }));
  const ml_record1 = ml_router_any(ml_router_iter(included), (file_2) => { return file_2.endsWith(".rs"); });
  const ml_record2 = ml_router_any(ml_router_iter(included), (file_3) => { return is_manifest_or_lockfile_change(file_3); });
  const ml_record3 = ml_router_any(ml_router_iter(included), (file_4) => { return file_4.endsWith(".mjs"); });
  const ml_record4 = ml_router_any(ml_router_iter(changed_files), (file_5) => { return file_5.endsWith(".md"); });
  const ml_record5 = ml_router_any(ml_router_iter(included), (file_6) => { return file_6.startsWith(".github/workflows/"); });
  const ml_record6 = !(included.length === 0);
  return Object.freeze({ $: "ChangeKinds", ["rs"]: ml_record1, ["toml"]: ml_record2, ["mjs"]: ml_record3, ["docs"]: ml_record4, ["workflow"]: ml_record5, ["any_code"]: ml_record6 });
}

export const translated = { ["is_excluded_from_code_changes"]: is_excluded_from_code_changes, ["is_manifest_or_lockfile_change"]: is_manifest_or_lockfile_change, ["ChangeKinds"]: ml_make_ChangeKinds_ChangeKinds, ["classify_changes"]: classify_changes };
export const provenance = {"sourcePath":"scripts/detect-code-changes.rs","sourceSha256":"5de76c5232d13baa340f7813a84591ed0c8fb872983e5cf024e4303250edc8a9","executable":4,"executableFunctions":3,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":10,"preserved":14,"runtimeParity":false};
