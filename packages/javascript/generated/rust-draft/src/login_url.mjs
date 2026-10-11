// Generated draft from src/login_url.rs; sha256=dd3f0762d4dbb77604be1ebad3cb8b6be5dc876a6aa03fd71304f5f99fdab783
// Carried constructs are data, never runtime parity evidence.
function AUTH_HOSTS() {
  return Object.freeze(["claude.ai", "claude.com", "anthropic.com"]);
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

function TOKEN_PREFIXES() {
  return Object.freeze(["sk-ant-oat", "sk-ant-"]);
}

function REDACTED() {
  return "[redacted]";
}

function rp_61646d696e2e41444d494e5f544f4b454e5f505245464958() {
  return "la_admin_";
}

function rp_6c6f67696e5f75726c2e5345435245545f5052454649584553() {
  return Object.freeze(["sk-ant-", rp_746f6b656e2e544f4b454e5f505245464958(), rp_746f6b656e2e434f4445585f544f4b454e5f505245464958(), rp_61646d696e2e41444d494e5f544f4b454e5f505245464958()]);
}

function rp_746f6b656e2e544f4b454e5f505245464958() {
  return "la_sk_";
}

function rp_746f6b656e2e434f4445585f544f4b454e5f505245464958() {
  return "at-";
}

export const translated = { ["AUTH_HOSTS"]: AUTH_HOSTS(), ["TOKEN_PREFIXES"]: TOKEN_PREFIXES(), ["REDACTED"]: REDACTED(), ["SECRET_PREFIXES"]: rp_6c6f67696e5f75726c2e5345435245545f5052454649584553() };
export const provenance = {"sourcePath":"src/login_url.rs","sourceSha256":"dd3f0762d4dbb77604be1ebad3cb8b6be5dc876a6aa03fd71304f5f99fdab783","executable":4,"executableFunctions":0,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":10,"preserved":15,"runtimeParity":false};
