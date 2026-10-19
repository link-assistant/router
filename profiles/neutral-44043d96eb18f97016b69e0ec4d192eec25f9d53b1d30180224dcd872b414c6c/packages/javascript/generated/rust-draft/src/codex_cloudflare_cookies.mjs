// Generated draft from src/codex_cloudflare_cookies.rs; sha256=c5acf2c32401baf01633f5d3b702d71f203698a7fd84b96b51562416d02d8e42
// Carried constructs are data, never runtime parity evidence.
import { borrowedStringSliceContains as ml_slice_str_contains, assertBorrowedStringSlice as ml_assert_str_slice } from "../runtime/slice-membership-runtime.mjs";

import { assertImmutableIterator as ml_assert_immutable_iterator } from "../runtime/iterator-runtime.mjs";

function ml_router_iter(values, immutable) { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }

function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e4d41585f434f4f4b49455f4259544553() {
  return 4096n;
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e4d41585f434f4f4b49455f434f554e54() {
  return 64n;
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e4d41585f434f4f4b49455f4845414445525f4259544553() {
  return 16384n;
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e45584143545f484f535453() {
  return Object.freeze(Object.freeze(["chatgpt.com", "chat.openai.com", "chatgpt-staging.com"]));
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e535542444f4d41494e5f5355464649584553() {
  return Object.freeze(Object.freeze([".chatgpt.com", ".chatgpt-staging.com"]));
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e45584143545f434f4f4b49455f4e414d4553() {
  return Object.freeze(Object.freeze(["__cf_bm", "__cflb", "__cfruid", "__cfseq", "__cfwaitingroom", "_cfuvid", "cf_clearance", "cf_ob_info", "cf_use_ob"]));
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e69735f616c6c6f7765645f636861746770745f686f7374(host) {
  if (!(typeof host === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(host))) throw new TypeError('argument outside supported Rust value domain');
  return (ml_slice_str_contains(rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e45584143545f484f535453(), host, null) || ml_router_any(ml_router_iter(rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e535542444f4d41494e5f5355464649584553(), false), (suffix) => { const ml_text_1 = host;
  const ml_text_2 = suffix;
  return ml_text_1.endsWith(ml_text_2); }));
}

function rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e69735f616c6c6f7765645f636f6f6b69655f6e616d65(name) {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  return (ml_slice_str_contains(rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e45584143545f434f4f4b49455f4e414d4553(), name, null) || (() => {
    const ml_text_1 = name;
    const ml_text_2 = "cf_chl_";
    return ml_text_1.startsWith(ml_text_2);
  })());
}

export const translated = { ["MAX_COOKIE_BYTES"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e4d41585f434f4f4b49455f4259544553(), ["MAX_COOKIE_COUNT"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e4d41585f434f4f4b49455f434f554e54(), ["MAX_COOKIE_HEADER_BYTES"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e4d41585f434f4f4b49455f4845414445525f4259544553(), ["EXACT_HOSTS"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e45584143545f484f535453(), ["SUBDOMAIN_SUFFIXES"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e535542444f4d41494e5f5355464649584553(), ["EXACT_COOKIE_NAMES"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e45584143545f434f4f4b49455f4e414d4553(), ["is_allowed_chatgpt_host"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e69735f616c6c6f7765645f636861746770745f686f7374, ["is_allowed_cookie_name"]: rp_636f6465785f636c6f7564666c6172655f636f6f6b6965732e69735f616c6c6f7765645f636f6f6b69655f6e616d65 };
export const provenance = {"sourcePath":"src/codex_cloudflare_cookies.rs","sourceSha256":"c5acf2c32401baf01633f5d3b702d71f203698a7fd84b96b51562416d02d8e42","executable":8,"executableFunctions":2,"executableConstants":6,"executableTypes":0,"executableConstructors":0,"carried":15,"preserved":24,"runtimeParity":false};
