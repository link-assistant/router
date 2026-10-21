// Generated draft from rust/src/api_error.rs; sha256=1afefa01a39e711dff5893b9490b4963fbcb53a5c626693b8b5657276232de6a
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_make_ApiDialect_Anthropic() {
  return Object.freeze({ $: 'Anthropic' });
}

function ml_make_ApiDialect_OpenAi() {
  return Object.freeze({ $: 'OpenAi' });
}

function ml_make_ApiDialect_Gemini() {
  return Object.freeze({ $: 'Gemini' });
}

function ml_make_ApiDialect_GitHub() {
  return Object.freeze({ $: 'GitHub' });
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
  num: {

  },
};

const router_core_base64 = {

};

const serde_json = {
  error: {

  },
};

function rp_6170695f6572726f722e6f70656e61695f6572726f725f74797065(status) {
  if (typeof status !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if ((status === 400n)) {
    return "invalid_request_error";
  } else {
    if ((status === 404n)) {
      return "invalid_request_error";
    } else {
      if ((status === 422n)) {
        return "invalid_request_error";
      } else {
        if ((status === 401n)) {
          return "authentication_error";
        } else {
          if ((status === 403n)) {
            return "permission_error";
          } else {
            if ((status === 429n)) {
              return "rate_limit_error";
            } else {
              return "api_error";
            }
          }
        }
      }
    }
  }
}

function rp_6170695f6572726f722e6f70656e61695f6572726f725f636f6465(status) {
  if (typeof status !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if ((status === 401n)) {
    return Object.freeze({ $: 'Some', field0: "invalid_api_key" });
  } else {
    if ((status === 403n)) {
      return Object.freeze({ $: 'Some', field0: "permission_denied" });
    } else {
      if ((status === 404n)) {
        return Object.freeze({ $: 'Some', field0: "model_not_found" });
      } else {
        if ((status === 429n)) {
          return Object.freeze({ $: 'Some', field0: "rate_limit_exceeded" });
        } else {
          return Object.freeze({ $: 'None' });
        }
      }
    }
  }
}

export const translated = { ["ApiDialect"]: Object.freeze({ ["Anthropic"]: ml_make_ApiDialect_Anthropic, ["OpenAi"]: ml_make_ApiDialect_OpenAi, ["Gemini"]: ml_make_ApiDialect_Gemini, ["GitHub"]: ml_make_ApiDialect_GitHub }), ["openai_error_type"]: rp_6170695f6572726f722e6f70656e61695f6572726f725f74797065, ["openai_error_code"]: rp_6170695f6572726f722e6f70656e61695f6572726f725f636f6465 };
export const provenance = {"sourcePath":"rust/src/api_error.rs","sourceSha256":"1afefa01a39e711dff5893b9490b4963fbcb53a5c626693b8b5657276232de6a","executable":3,"executableFunctions":2,"executableConstants":0,"executableTypes":1,"executableConstructors":4,"carried":13,"preserved":16,"runtimeParity":false};
