// Generated draft from src/git_proxy.rs; sha256=ed47b0f287dcf7cc1d03672ed1abd924bebb5862929af06f714ccdff42409f22
// Carried constructs are data, never runtime parity evidence.
function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function ml_router_iter(values) { return Array.prototype.values.call(values); }

function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }

function ml_router_strip(value, search, suffix) {
  const matches = suffix ? value.endsWith(search) : value.startsWith(search);
  if (!matches) return Object.freeze({ $: 'None' });
  const text = suffix ? value.slice(0, value.length - search.length) : value.slice(search.length);
  return Object.freeze({ $: 'Some', field0: text });
}

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

function ZERO_OID() {
  return "0000000000000000000000000000000000000000";
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

function ml_make_RefUpdate_RefUpdate(old, new_, name) {
  if (!(typeof old === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(old))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof new_ === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(new_))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "RefUpdate", ["old"]: old, ["new"]: new_, ["name"]: name });
}

function ml_make_RefRefusal_Delete(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Delete', field0: field0 });
}

function ml_make_RefRefusal_NonFastForward(field0) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'NonFastForward', field0: field0 });
}

function ml_make_RefRefusal_Unverifiable(field0, field1) {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof field1 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field1))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Unverifiable', field0: field0, field1: field1 });
}

function ml_make_AncestryQuery_AncestryQuery(name, old, new_) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof old === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(old))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof new_ === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(new_))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "AncestryQuery", ["name"]: name, ["old"]: old, ["new"]: new_ });
}

function ml_make_Ancestry_FastForward() {
  return Object.freeze({ $: 'FastForward' });
}

function ml_make_Ancestry_Diverged() {
  return Object.freeze({ $: 'Diverged' });
}

function ml_make_Ancestry_Unknown() {
  return Object.freeze({ $: 'Unknown' });
}

function scope_admits(allowed_repositories, repository) {
  if (!ml_router_array(allowed_repositories, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof repository === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(repository))) throw new TypeError('argument outside supported Rust value domain');
  return ((allowed_repositories.length === 0) || ml_router_any(ml_router_iter(allowed_repositories), (allowed) => { return ((allowed).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32)) === (repository).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32))); }));
}

function canonical_git_path(path) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  return ml_router_unwrap(ml_router_strip(path, "/api/services/github", false), path, true);
}

export const translated = { ["ZERO_OID"]: ZERO_OID(), ["RefUpdate"]: ml_make_RefUpdate_RefUpdate, ["RefRefusal"]: Object.freeze({ ["Delete"]: ml_make_RefRefusal_Delete, ["NonFastForward"]: ml_make_RefRefusal_NonFastForward, ["Unverifiable"]: ml_make_RefRefusal_Unverifiable }), ["AncestryQuery"]: ml_make_AncestryQuery_AncestryQuery, ["Ancestry"]: Object.freeze({ ["FastForward"]: ml_make_Ancestry_FastForward, ["Diverged"]: ml_make_Ancestry_Diverged, ["Unknown"]: ml_make_Ancestry_Unknown }), ["scope_admits"]: scope_admits, ["canonical_git_path"]: canonical_git_path };
export const provenance = {"sourcePath":"src/git_proxy.rs","sourceSha256":"ed47b0f287dcf7cc1d03672ed1abd924bebb5862929af06f714ccdff42409f22","executable":7,"executableFunctions":2,"executableConstants":1,"executableTypes":4,"executableConstructors":8,"carried":22,"preserved":30,"runtimeParity":false};
