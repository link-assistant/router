// Generated draft from src/api_error.rs; sha256=1afefa01a39e711dff5893b9490b4963fbcb53a5c626693b8b5657276232de6a
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function openai_error_type(status: bigint) {
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

function openai_error_code(status: bigint) {
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

export const translated: { "openai_error_type": (status: bigint) => string; "openai_error_code": (status: bigint) => Readonly<{ $: "None" }> | Readonly<{ $: "Some"; field0: string }> } = { openai_error_type, openai_error_code };
export const provenance = {"sourcePath":"src/api_error.rs","sourceSha256":"1afefa01a39e711dff5893b9490b4963fbcb53a5c626693b8b5657276232de6a","executable":2,"executableFunctions":2,"executableConstants":0,"carried":14,"preserved":16,"runtimeParity":false};
