
// Generated draft from src/generated_js_first/policy.rs; sha256=c5d5cec07bf54be29de7beed707263256afa6ba1ee87c89695b237d5626f5673
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { rust_f64_is_nan as ml_host_rust_f64_is_nan, rust_f64_is_sign_negative as ml_host_rust_f64_is_sign_negative, rust_f64_is_sign_positive as ml_host_rust_f64_is_sign_positive, rust_f64_is_finite as ml_host_rust_f64_is_finite, rust_f64_floor as ml_host_rust_f64_floor } from "../../runtime/float-runtime.mjs";

const ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = {"schemaVersion":1,"types":{}};

const ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 = new Map([]);

import { encodeUtf16 as ml_encode_utf16, fixedToF64 as ml_fixed_to_f64 } from "../../runtime/utf16-fixed-f64-runtime.mjs";

function ml_router_count<T>(values: Iterable<T>) { let count = 0n; for (const value of values) { void value; count += 1n; } return count; }

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d696e(a: number, b: number): number {
  ml_validate_rust_value(a, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(b, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  if ((ml_host_rust_f64_is_nan(a) || ml_host_rust_f64_is_nan(b))) {
    return NaN;
  } else {
  }
  if (((a === 0) && (b === 0))) {
    return ((ml_host_rust_f64_is_sign_negative(a) || ml_host_rust_f64_is_sign_negative(b)) ? (-0) : 0);
  } else {
  }
  if ((a < b)) {
    return a;
  } else {
    return b;
  }
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d6178(a: number, b: number): number {
  ml_validate_rust_value(a, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(b, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  if ((ml_host_rust_f64_is_nan(a) || ml_host_rust_f64_is_nan(b))) {
    return NaN;
  } else {
  }
  if (((a === 0) && (b === 0))) {
    return ((ml_host_rust_f64_is_sign_positive(a) || ml_host_rust_f64_is_sign_positive(b)) ? 0 : (-0));
  } else {
  }
  if ((a > b)) {
    return a;
  } else {
    return b;
  }
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e746f6b656e5f6275646765745f7065726d697473(used: number, reserved: number, reserve: number, max: number): boolean {
  ml_validate_rust_value(used, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(reserved, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(reserve, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(max, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return ((max < 0) || (((used + reserved) < max) && (((used + reserved) + reserve) <= max)));
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e636f6f6c646f776e5f616374697665(until: number, now: number): boolean {
  ml_validate_rust_value(until, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(now, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return (until > now);
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e636c616d70(value: number, minimum: number, maximum: number): number {
  ml_validate_rust_value(value, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(minimum, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(maximum, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d696e(rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d6178(value, minimum), maximum);
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6c6f6e676573745f636f6f6c646f776e(previous: number, next: number): number {
  ml_validate_rust_value(previous, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(next, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d6178(previous, next);
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e72657472795f61667465725f646561646c696e65(seconds: number, now: number, maximum: number): number {
  ml_validate_rust_value(seconds, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(now, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(maximum, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  if ((!ml_host_rust_f64_is_finite(seconds) || (seconds < 0))) {
    return now;
  } else {
  }
  return (now + rp_67656e6572617465645f6a735f66697273742e706f6c6963792e636c616d70(seconds, 0, maximum));
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e746f6b656e5f636f7374(input: number, output: number, input_per_million: number, output_per_million: number): number {
  ml_validate_rust_value(input, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(output, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(input_per_million, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(output_per_million, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return (((input * input_per_million) + (output * output_per_million)) / 1000000);
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e76616c69645f746f6b656e5f636f756e74(value: number): boolean {
  ml_validate_rust_value(value, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return ((ml_host_rust_f64_is_finite(value) && (value >= 0)) && (ml_host_rust_f64_floor(value) === value));
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e736574746c65645f746f6b656e5f7573616765(total: number, reserved: number, actual: number): number {
  ml_validate_rust_value(total, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(reserved, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(actual, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return (rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d6178(0, (total - reserved)) + actual);
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e72656d61696e696e675f746f6b656e5f627564676574(used: number, reserved: number, max: number): number {
  ml_validate_rust_value(used, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(reserved, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(max, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  if ((max < 0)) {
    return (-1);
  } else {
  }
  return rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d6178(0, ((max - used) - reserved));
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e636f6d706c6574696f6e5f746f6b656e5f6c696d6974(requested: number, available: number, limit: number): number {
  ml_validate_rust_value(requested, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(available, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(limit, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d6178(0, ml_host_rust_f64_floor(rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d696e(requested, rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d696e(available, limit))));
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e72657472795f6261636b6f6666(failures: number, base: number, maximum: number): number {
  ml_validate_rust_value(failures, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(base, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(maximum, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  let delay = base;
  let remaining = rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d6178(0, ml_host_rust_f64_floor(failures));
  while (((remaining > 0) && (delay < maximum))) {
    delay = rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d696e((delay * 2), maximum);
    remaining = (remaining - 1);
  }
  return rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d696e(delay, maximum);
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e726574727961626c655f737461747573(status: number): boolean {
  ml_validate_rust_value(status, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return (((status === 408) || (status === 429)) || ((status >= 500) && (status <= 599)));
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e737563636573735f737461747573(status: number): boolean {
  ml_validate_rust_value(status, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return ((status >= 200) && (status <= 299));
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e77656967687465645f6361706163697479(weight: number, load: number): number {
  ml_validate_rust_value(weight, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(load, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  if ((((weight <= 0) || !ml_host_rust_f64_is_finite(weight)) || (load < 0))) {
    return 0;
  } else {
  }
  return (weight / (load + 1));
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e746f6b656e5f65787069726564(now: number, expires: number, skew: number): boolean {
  ml_validate_rust_value(now, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(expires, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  ml_validate_rust_value(skew, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return (now >= (expires + skew));
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e75746631365f6c656e677468(value: string): number {
  if (!(typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))) throw new TypeError('argument outside supported Rust value domain');
  return ml_fixed_to_f64(ml_router_count(ml_encode_utf16(value)), "usize");
}

function rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6d6f64656c5f6e616d655f6c656e6774685f7065726d697473(value: string, maximum: number): boolean {
  if (!(typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(maximum, {"kind":"float"}, ml_host_value_schema_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085, { refinements: ml_host_value_refinements_7d60ab883a2cc9a1a1432946fb02b6310bf1de9bef16b6697d4977d5ffb24085 });
  return ((rp_67656e6572617465645f6a735f66697273742e706f6c6963792e75746631365f6c656e677468(value) > 0) && (rp_67656e6572617465645f6a735f66697273742e706f6c6963792e75746631365f6c656e677468(value) <= maximum));
}

export const translated: { "js_min": (a: number, b: number) => number; "js_max": (a: number, b: number) => number; "token_budget_permits": (used: number, reserved: number, reserve: number, max: number) => boolean; "cooldown_active": (until: number, now: number) => boolean; "clamp": (value: number, minimum: number, maximum: number) => number; "longest_cooldown": (previous: number, next: number) => number; "retry_after_deadline": (seconds: number, now: number, maximum: number) => number; "token_cost": (input: number, output: number, input_per_million: number, output_per_million: number) => number; "valid_token_count": (value: number) => boolean; "settled_token_usage": (total: number, reserved: number, actual: number) => number; "remaining_token_budget": (used: number, reserved: number, max: number) => number; "completion_token_limit": (requested: number, available: number, limit: number) => number; "retry_backoff": (failures: number, base: number, maximum: number) => number; "retryable_status": (status: number) => boolean; "success_status": (status: number) => boolean; "weighted_capacity": (weight: number, load: number) => number; "token_expired": (now: number, expires: number, skew: number) => boolean; "utf16_length": (value: string) => number; "model_name_length_permits": (value: string, maximum: number) => boolean } = { ["js_min"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d696e, ["js_max"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6a735f6d6178, ["token_budget_permits"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e746f6b656e5f6275646765745f7065726d697473, ["cooldown_active"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e636f6f6c646f776e5f616374697665, ["clamp"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e636c616d70, ["longest_cooldown"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6c6f6e676573745f636f6f6c646f776e, ["retry_after_deadline"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e72657472795f61667465725f646561646c696e65, ["token_cost"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e746f6b656e5f636f7374, ["valid_token_count"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e76616c69645f746f6b656e5f636f756e74, ["settled_token_usage"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e736574746c65645f746f6b656e5f7573616765, ["remaining_token_budget"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e72656d61696e696e675f746f6b656e5f627564676574, ["completion_token_limit"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e636f6d706c6574696f6e5f746f6b656e5f6c696d6974, ["retry_backoff"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e72657472795f6261636b6f6666, ["retryable_status"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e726574727961626c655f737461747573, ["success_status"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e737563636573735f737461747573, ["weighted_capacity"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e77656967687465645f6361706163697479, ["token_expired"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e746f6b656e5f65787069726564, ["utf16_length"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e75746631365f6c656e677468, ["model_name_length_permits"]: rp_67656e6572617465645f6a735f66697273742e706f6c6963792e6d6f64656c5f6e616d655f6c656e6774685f7065726d697473 };
export const provenance = {"sourcePath":"src/generated_js_first/policy.rs","sourceSha256":"c5d5cec07bf54be29de7beed707263256afa6ba1ee87c89695b237d5626f5673","executable":19,"executableFunctions":19,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":5,"preserved":25,"runtimeParity":false};
