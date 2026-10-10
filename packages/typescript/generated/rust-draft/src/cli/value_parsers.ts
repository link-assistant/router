// Generated draft from src/cli/value_parsers.rs; sha256=a9421ff423ea7ea4f490003113b3ba76a2043b5ad43965774f2c787b9a5da21f
// Carried constructs are data, never runtime parity evidence.
function parse_truthy(value: string) {
  if (!(typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))) throw new TypeError('argument outside supported Rust value domain');
  const ml_s1 = ((value).replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '')).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
  if ((ml_s1 === "1")) {
    return Object.freeze({ $: 'Ok', field0: true });
  } else {
    if ((ml_s1 === "true")) {
      return Object.freeze({ $: 'Ok', field0: true });
    } else {
      if ((ml_s1 === "yes")) {
        return Object.freeze({ $: 'Ok', field0: true });
      } else {
        if ((ml_s1 === "on")) {
          return Object.freeze({ $: 'Ok', field0: true });
        } else {
          if ((ml_s1 === "0")) {
            return Object.freeze({ $: 'Ok', field0: false });
          } else {
            if ((ml_s1 === "false")) {
              return Object.freeze({ $: 'Ok', field0: false });
            } else {
              if ((ml_s1 === "no")) {
                return Object.freeze({ $: 'Ok', field0: false });
              } else {
                if ((ml_s1 === "off")) {
                  return Object.freeze({ $: 'Ok', field0: false });
                } else {
                  if ((ml_s1 === "")) {
                    return Object.freeze({ $: 'Ok', field0: false });
                  } else {
                    const other = ml_s1;
                    return Object.freeze({ $: 'Err', field0: (("expected a boolean (1/0, true/false), got '" + other) + "'") });
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

export const translated: { "parse_truthy": (value: string) => Readonly<{ $: "Ok"; field0: boolean }> | Readonly<{ $: "Err"; field0: string }> } = { parse_truthy };
export const provenance = {"sourcePath":"src/cli/value_parsers.rs","sourceSha256":"a9421ff423ea7ea4f490003113b3ba76a2043b5ad43965774f2c787b9a5da21f","executable":1,"executableFunctions":1,"executableConstants":0,"carried":1,"preserved":3,"runtimeParity":false};
