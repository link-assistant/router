// Generated draft from src/pool_failover.rs; sha256=58c0977f22c4b44d1ec68723ea808d866de108cb6ed94a9e870cf8442c1865db
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_d61951da6f571dcff0fd0e621c9063860b00dcf6511222db8a5ab7f2013ac47f = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f35355f6e616d65645f37303666366636633566363636313639366336663736363537325f35323635373437323739353236353631373336663665":{"kind":"data","name":"rp_526f757465724f7074696f6e5f35355f6e616d65645f37303666366636633566363636313639366336663736363537325f35323635373437323739353236353631373336663665","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"data","name":"rp_706f6f6c5f6661696c6f7665722e5265747279526561736f6e"}}]}]},"rp_706f6f6c5f6661696c6f7665722e5265747279526561736f6e":{"kind":"data","name":"rp_706f6f6c5f6661696c6f7665722e5265747279526561736f6e","ctors":[{"name":"RateLimited","fields":[]},{"name":"Overloaded","fields":[]},{"name":"ServerError","fields":[]},{"name":"Unauthorized","fields":[]},{"name":"Transport","fields":[]}]}}};

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
  if (typeof status !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(status, 0n, 65535n, "u16 argument status out of range");
  if (!(typeof status === 'bigint' && status >= 0n && status <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  if ((status === 429n)) {
    return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'RateLimited' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35355f6e616d65645f37303666366636633566363636313639366336663736363537325f35323635373437323739353236353631373336663665"}, ml_constructor_value_schema_d61951da6f571dcff0fd0e621c9063860b00dcf6511222db8a5ab7f2013ac47f);
  } else {
    if ((status === 529n)) {
      return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Overloaded' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35355f6e616d65645f37303666366636633566363636313639366336663736363537325f35323635373437323739353236353631373336663665"}, ml_constructor_value_schema_d61951da6f571dcff0fd0e621c9063860b00dcf6511222db8a5ab7f2013ac47f);
    } else {
      if ((status === 500n)) {
        return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ServerError' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35355f6e616d65645f37303666366636633566363636313639366336663736363537325f35323635373437323739353236353631373336663665"}, ml_constructor_value_schema_d61951da6f571dcff0fd0e621c9063860b00dcf6511222db8a5ab7f2013ac47f);
      } else {
        if ((status === 502n)) {
          return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ServerError' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35355f6e616d65645f37303666366636633566363636313639366336663736363537325f35323635373437323739353236353631373336663665"}, ml_constructor_value_schema_d61951da6f571dcff0fd0e621c9063860b00dcf6511222db8a5ab7f2013ac47f);
        } else {
          if ((status === 503n)) {
            return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ServerError' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35355f6e616d65645f37303666366636633566363636313639366336663736363537325f35323635373437323739353236353631373336663665"}, ml_constructor_value_schema_d61951da6f571dcff0fd0e621c9063860b00dcf6511222db8a5ab7f2013ac47f);
          } else {
            if ((status === 504n)) {
              return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'ServerError' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35355f6e616d65645f37303666366636633566363636313639366336663736363537325f35323635373437323739353236353631373336663665"}, ml_constructor_value_schema_d61951da6f571dcff0fd0e621c9063860b00dcf6511222db8a5ab7f2013ac47f);
            } else {
              if ((status === 401n)) {
                return ml_snapshot_constructor_value(Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Unauthorized' }) }), {"kind":"data","name":"rp_526f757465724f7074696f6e5f35355f6e616d65645f37303666366636633566363636313639366336663736363537325f35323635373437323739353236353631373336663665"}, ml_constructor_value_schema_d61951da6f571dcff0fd0e621c9063860b00dcf6511222db8a5ab7f2013ac47f);
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
