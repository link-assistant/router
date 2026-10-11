
// Generated draft from src/login_url.rs; sha256=dd3f0762d4dbb77604be1ebad3cb8b6be5dc876a6aa03fd71304f5f99fdab783
// Carried constructs are data, never runtime parity evidence.
function rp_6c6f67696e5f75726c2e415554485f484f535453(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["claude.ai", "claude.com", "anthropic.com"]));
}

function rp_6c6f67696e5f75726c2e544f4b454e5f5052454649584553(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["sk-ant-oat", "sk-ant-"]));
}

function rp_6c6f67696e5f75726c2e5245444143544544(): string {
  return "[redacted]";
}

function rp_61646d696e2e41444d494e5f544f4b454e5f505245464958(): string {
  return "la_admin_";
}

function rp_6c6f67696e5f75726c2e5345435245545f5052454649584553(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["sk-ant-", rp_746f6b656e2e544f4b454e5f505245464958(), rp_746f6b656e2e434f4445585f544f4b454e5f505245464958(), rp_61646d696e2e41444d494e5f544f4b454e5f505245464958()]));
}

function rp_746f6b656e2e544f4b454e5f505245464958(): string {
  return "la_sk_";
}

function rp_746f6b656e2e434f4445585f544f4b454e5f505245464958(): string {
  return "at-";
}

function rp_6c6f67696e5f75726c2e7265646163745f76616c7565(text: string, secret: string): string {
  if (!(typeof text === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(text))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof secret === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(secret))) throw new TypeError('argument outside supported Rust value domain');
  const secret_2 = (secret).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '');
  if ((BigInt(new TextEncoder().encode(secret_2).length) < 4n)) {
    return text;
  } else {
  }
  const ml_text_1 = text;
  const ml_text_2 = secret_2;
  const ml_text_3 = rp_6c6f67696e5f75726c2e5245444143544544();
  return (ml_text_2.length===0?(ml_text_1.length===0?ml_text_3:ml_text_3+Array.from(ml_text_1).join(ml_text_3)+ml_text_3):ml_text_1.split(ml_text_2).join(ml_text_3));
}

export const translated: { "AUTH_HOSTS": ReadonlyArray<string>; "TOKEN_PREFIXES": ReadonlyArray<string>; "REDACTED": string; "SECRET_PREFIXES": ReadonlyArray<string>; "redact_value": (text: string, secret: string) => string } = { ["AUTH_HOSTS"]: rp_6c6f67696e5f75726c2e415554485f484f535453(), ["TOKEN_PREFIXES"]: rp_6c6f67696e5f75726c2e544f4b454e5f5052454649584553(), ["REDACTED"]: rp_6c6f67696e5f75726c2e5245444143544544(), ["SECRET_PREFIXES"]: rp_6c6f67696e5f75726c2e5345435245545f5052454649584553(), ["redact_value"]: rp_6c6f67696e5f75726c2e7265646163745f76616c7565 };
export const provenance = {"sourcePath":"src/login_url.rs","sourceSha256":"dd3f0762d4dbb77604be1ebad3cb8b6be5dc876a6aa03fd71304f5f99fdab783","executable":5,"executableFunctions":1,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":9,"preserved":15,"runtimeParity":false};
