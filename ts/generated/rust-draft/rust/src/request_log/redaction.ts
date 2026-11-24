type MLData_72705f35323666373537343635373234663730373436393666366535663332356637353338 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
// Generated draft from rust/src/request_log/redaction.rs; sha256=3f0c4947ea1629b07a159662557746ed7d511a6c91db775fe025fe1ac127f482
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_726571756573745f6c6f672e726564616374696f6e2e42494e4152595f424f44595f4b4559(): string {
  return "base64";
}

function rp_726571756573745f6c6f672e726564616374696f6e2e6865785f6469676974(byte: bigint): Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> {
  if (typeof byte !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(byte, 0n, 255n, "u8 argument byte out of range");
  if (!(typeof byte === 'bigint' && byte >= 0n && byte <= 255n)) throw new TypeError('argument outside supported Rust value domain');
  const ml_ordered_match_1 = byte;
  if (((ml_ordered_match_1 >= 48n) && (ml_ordered_match_1 <= 57n))) {
    return Object.freeze({ $: 'Some', field0: ml_fixed((byte - 48n), 0n, 255n, "attempt to subtract with overflow") });
  } else {
    if (((ml_ordered_match_1 >= 97n) && (ml_ordered_match_1 <= 102n))) {
      return Object.freeze({ $: 'Some', field0: ml_fixed((ml_fixed((byte - 97n), 0n, 255n, "attempt to subtract with overflow") + 10n), 0n, 255n, "attempt to add with overflow") });
    } else {
      if (((ml_ordered_match_1 >= 65n) && (ml_ordered_match_1 <= 70n))) {
        return Object.freeze({ $: 'Some', field0: ml_fixed((ml_fixed((byte - 65n), 0n, 255n, "attempt to subtract with overflow") + 10n), 0n, 255n, "attempt to add with overflow") });
      } else {
        return Object.freeze({ $: 'None' });
      }
    }
  }
}

export const translated: { "BINARY_BODY_KEY": string; "hex_digit": (byte: bigint) => Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> } = { ["BINARY_BODY_KEY"]: rp_726571756573745f6c6f672e726564616374696f6e2e42494e4152595f424f44595f4b4559(), ["hex_digit"]: rp_726571756573745f6c6f672e726564616374696f6e2e6865785f6469676974 };
export const provenance = {"sourcePath":"rust/src/request_log/redaction.rs","sourceSha256":"3f0c4947ea1629b07a159662557746ed7d511a6c91db775fe025fe1ac127f482","executable":2,"executableFunctions":1,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":17,"preserved":20,"runtimeParity":false};
