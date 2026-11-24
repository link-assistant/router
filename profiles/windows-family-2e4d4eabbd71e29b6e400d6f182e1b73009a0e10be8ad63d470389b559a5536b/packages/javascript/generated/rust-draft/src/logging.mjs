// Generated draft from src/logging.rs; sha256=9b53f3aa6b958bb2c499f880b3f9e8c2995b6857d151eb80c99b2891bea034d3
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_6c6f6767696e672e687474705f6661696c757265(status) {
  if (typeof status !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  const ml_ordered_match_1 = status;
  if ((ml_ordered_match_1 === 401n)) {
    return "authentication_or_authorization";
  } else {
    if ((ml_ordered_match_1 === 403n)) {
      return "authentication_or_authorization";
    } else {
      if ((ml_ordered_match_1 === 407n)) {
        return "authentication_or_authorization";
      } else {
        if ((ml_ordered_match_1 === 402n)) {
          return "billing";
        } else {
          if ((ml_ordered_match_1 === 408n)) {
            return "transport_timeout";
          } else {
            if ((ml_ordered_match_1 === 504n)) {
              return "transport_timeout";
            } else {
              if ((ml_ordered_match_1 === 429n)) {
                return "rate_limited";
              } else {
                if ((ml_ordered_match_1 === 400n)) {
                  return "invalid_request";
                } else {
                  if ((ml_ordered_match_1 === 422n)) {
                    return "invalid_request";
                  } else {
                    if ((ml_ordered_match_1 === 404n)) {
                      return "routing_not_found";
                    } else {
                      if (((ml_ordered_match_1 >= 500n) && (ml_ordered_match_1 <= 599n))) {
                        return "upstream_server_error";
                      } else {
                        return "http_error";
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

export const translated = { ["http_failure"]: rp_6c6f6767696e672e687474705f6661696c757265 };
export const provenance = {"sourcePath":"src/logging.rs","sourceSha256":"9b53f3aa6b958bb2c499f880b3f9e8c2995b6857d151eb80c99b2891bea034d3","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":13,"preserved":15,"runtimeParity":false};
