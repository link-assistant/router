// Generated draft from src/pool_failover.rs; sha256=58c0977f22c4b44d1ec68723ea808d866de108cb6ed94a9e870cf8442c1865db
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_706f6f6c5f6661696c6f7665722e44454641554c545f4d41585f415454454d505453() {
  return 3n;
}

function rp_706f6f6c5f6661696c6f7665722e44454641554c545f4255444745545f53454353() {
  return 30n;
}

function rp_706f6f6c5f6661696c6f7665722e4d41585f4255444745545f53454353() {
  return ml_fixed((ml_fixed((24n * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 60n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function ml_make_RetryReason_RateLimited() {
  return Object.freeze({ $: 'RateLimited' });
}

function ml_make_RetryReason_Overloaded() {
  return Object.freeze({ $: 'Overloaded' });
}

function ml_make_RetryReason_ServerError() {
  return Object.freeze({ $: 'ServerError' });
}

function ml_make_RetryReason_Unauthorized() {
  return Object.freeze({ $: 'Unauthorized' });
}

function ml_make_RetryReason_Transport() {
  return Object.freeze({ $: 'Transport' });
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

const serde_json = {
  error: {

  },
};

function rp_706f6f6c5f6661696c6f7665722e636c6173736966795f737461747573(status) {
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if ((status === 429n)) {
    return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'RateLimited' }) });
  } else {
    if ((status === 529n)) {
      return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Overloaded' }) });
    } else {
      if ((status === 500n)) {
        return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ServerError' }) });
      } else {
        if ((status === 502n)) {
          return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ServerError' }) });
        } else {
          if ((status === 503n)) {
            return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ServerError' }) });
          } else {
            if ((status === 504n)) {
              return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ServerError' }) });
            } else {
              if ((status === 401n)) {
                return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Unauthorized' }) });
              } else {
                return Object.freeze({ $: 'None' });
              }
            }
          }
        }
      }
    }
  }
}

export const translated = { ["DEFAULT_MAX_ATTEMPTS"]: rp_706f6f6c5f6661696c6f7665722e44454641554c545f4d41585f415454454d505453(), ["DEFAULT_BUDGET_SECS"]: rp_706f6f6c5f6661696c6f7665722e44454641554c545f4255444745545f53454353(), ["MAX_BUDGET_SECS"]: rp_706f6f6c5f6661696c6f7665722e4d41585f4255444745545f53454353(), ["RetryReason"]: Object.freeze({ ["RateLimited"]: ml_make_RetryReason_RateLimited, ["Overloaded"]: ml_make_RetryReason_Overloaded, ["ServerError"]: ml_make_RetryReason_ServerError, ["Unauthorized"]: ml_make_RetryReason_Unauthorized, ["Transport"]: ml_make_RetryReason_Transport }), ["classify_status"]: rp_706f6f6c5f6661696c6f7665722e636c6173736966795f737461747573 };
export const provenance = {"sourcePath":"src/pool_failover.rs","sourceSha256":"58c0977f22c4b44d1ec68723ea808d866de108cb6ed94a9e870cf8442c1865db","executable":5,"executableFunctions":1,"executableConstants":3,"executableTypes":1,"executableConstructors":5,"carried":18,"preserved":24,"runtimeParity":false};
