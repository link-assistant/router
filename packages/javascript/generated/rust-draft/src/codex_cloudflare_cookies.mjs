// Generated draft from src/codex_cloudflare_cookies.rs; sha256=c5acf2c32401baf01633f5d3b702d71f203698a7fd84b96b51562416d02d8e42
// Carried constructs are data, never runtime parity evidence.
function MAX_COOKIE_BYTES() {
  return 4096n;
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

function MAX_COOKIE_COUNT() {
  return 64n;
}

function MAX_COOKIE_HEADER_BYTES() {
  return 16384n;
}

function EXACT_HOSTS() {
  return Object.freeze(["chatgpt.com", "chat.openai.com", "chatgpt-staging.com"]);
}

function SUBDOMAIN_SUFFIXES() {
  return Object.freeze([".chatgpt.com", ".chatgpt-staging.com"]);
}

function EXACT_COOKIE_NAMES() {
  return Object.freeze(["__cf_bm", "__cflb", "__cfruid", "__cfseq", "__cfwaitingroom", "_cfuvid", "cf_clearance", "cf_ob_info", "cf_use_ob"]);
}

export const translated = { ["MAX_COOKIE_BYTES"]: MAX_COOKIE_BYTES(), ["MAX_COOKIE_COUNT"]: MAX_COOKIE_COUNT(), ["MAX_COOKIE_HEADER_BYTES"]: MAX_COOKIE_HEADER_BYTES(), ["EXACT_HOSTS"]: EXACT_HOSTS(), ["SUBDOMAIN_SUFFIXES"]: SUBDOMAIN_SUFFIXES(), ["EXACT_COOKIE_NAMES"]: EXACT_COOKIE_NAMES() };
export const provenance = {"sourcePath":"src/codex_cloudflare_cookies.rs","sourceSha256":"c5acf2c32401baf01633f5d3b702d71f203698a7fd84b96b51562416d02d8e42","executable":6,"executableFunctions":0,"executableConstants":6,"executableTypes":0,"executableConstructors":0,"carried":17,"preserved":24,"runtimeParity":false};
