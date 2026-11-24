// Generated draft from rust/src/token.rs; sha256=7ca5ba2669621a395ddf9f9fbc3ce32c9c033be6fc8acea5b6ec264c233e53be
// Carried constructs are data, never runtime parity evidence.
function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_746f6b656e2e544f4b454e5f505245464958() {
  return "la_sk_";
}

function rp_746f6b656e2e434f4445585f544f4b454e5f505245464958() {
  return "at-";
}

function rp_746f6b656e2e746f6b656e5f6a7774(token) {
  if (!(typeof token === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token))) throw new TypeError('argument outside supported Rust value domain');
  return (() => {
    const ml_standard_body_5 = (() => {
      const ml_text_1 = token;
      const ml_text_2 = rp_746f6b656e2e544f4b454e5f505245464958();
      return (ml_text_1.startsWith(ml_text_2)?Object.freeze({ $: 'Some', field0: ml_text_1.slice(ml_text_2.length) }):Object.freeze({ $: 'None' }));
    })();
    switch (ml_standard_body_5.$) {
      case "None": {
        const ml_text_3 = token;
        const ml_text_4 = rp_746f6b656e2e434f4445585f544f4b454e5f505245464958();
        return (ml_text_3.startsWith(ml_text_4)?Object.freeze({ $: 'Some', field0: ml_text_3.slice(ml_text_4.length) }):Object.freeze({ $: 'None' }));
      }
      case "Some": {
        const ml_standard_alias_field = ml_standard_body_5.field0;
        const x = ml_standard_body_5;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_5);
      }
    }
  })();
}

function rp_746f6b656e2e41444d494e5f53434f5045() {
  return "admin";
}

function rp_746f6b656e2e4d41585f54544c5f484f555253() {
  return ml_fixed((ml_fixed((24n * 365n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow") * 10n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

export const translated = { ["TOKEN_PREFIX"]: rp_746f6b656e2e544f4b454e5f505245464958(), ["CODEX_TOKEN_PREFIX"]: rp_746f6b656e2e434f4445585f544f4b454e5f505245464958(), ["token_jwt"]: rp_746f6b656e2e746f6b656e5f6a7774, ["ADMIN_SCOPE"]: rp_746f6b656e2e41444d494e5f53434f5045(), ["MAX_TTL_HOURS"]: rp_746f6b656e2e4d41585f54544c5f484f555253() };
export const provenance = {"sourcePath":"rust/src/token.rs","sourceSha256":"7ca5ba2669621a395ddf9f9fbc3ce32c9c033be6fc8acea5b6ec264c233e53be","executable":5,"executableFunctions":1,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":24,"preserved":30,"runtimeParity":false};
