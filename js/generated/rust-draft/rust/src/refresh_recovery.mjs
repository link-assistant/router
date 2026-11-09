// Generated draft from rust/src/refresh_recovery.rs; sha256=1ae8a2aea3b1d686223f527eeaee492aba17dd5e39b37c4ec235b64397589918
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { createFixedIntegerRuntime as ml_create_fixed_integer_runtime } from "../../runtime/fixed-integer-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_7f3c07751fe3015bee333364ac17a84270644c048c5ea155a474ef59febb42b9 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_526f757465724f7074696f6e5f335f693634":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f693634","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]},"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e546f6b656e":{"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e546f6b656e","ctors":[{"name":"SubscriptionToken","fields":[{"name":"access_token","type":{"kind":"string"}},{"name":"refresh_token","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"expires_at_ms","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f335f693634"}},{"name":"account_id","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"resource_url","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}}]}]}}};

const ml_host_value_refinements_7f3c07751fe3015bee333364ac17a84270644c048c5ea155a474ef59febb42b9 = new Map([]);

const ml_host_value_schema_0813c146d3e1de30d2dfd045f0e16841567a25ea2ad5316beb05a7120b527667 = {"schemaVersion":1,"types":{"rp_726566726573682e726566726573685f7265636f766572792e5265636f766572794d6f6465":{"kind":"data","name":"rp_726566726573682e726566726573685f7265636f766572792e5265636f766572794d6f6465","ctors":[{"name":"Proactive","fields":[]},{"name":"AfterRejection","fields":[]},{"name":"ImportValidation","fields":[]}]}}};

const ml_host_value_refinements_0813c146d3e1de30d2dfd045f0e16841567a25ea2ad5316beb05a7120b527667 = new Map([]);

const ml_host_rust_fixed_saturating_add_i64 = ml_create_fixed_integer_runtime({"kind":"fixed","bits":64,"signed":true}).rust_fixed_saturating_add;

function ml_make_RecoveryRung_AdoptedStoredToken() {
  return Object.freeze({ $: 'AdoptedStoredToken' });
}

function ml_make_RecoveryRung_DirectExchange() {
  return Object.freeze({ $: 'DirectExchange' });
}

function ml_make_RecoveryRung_AdoptedRotatedLink() {
  return Object.freeze({ $: 'AdoptedRotatedLink' });
}

function ml_make_RecoveryRung_VendorCliRotation() {
  return Object.freeze({ $: 'VendorCliRotation' });
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

function ml_make_RecoveryMode_Proactive() {
  return Object.freeze({ $: 'Proactive' });
}

function ml_make_RecoveryMode_AfterRejection() {
  return Object.freeze({ $: 'AfterRejection' });
}

function ml_make_RecoveryMode_ImportValidation() {
  return Object.freeze({ $: 'ImportValidation' });
}

function rp_726566726573682e524546524553485f534b45575f4d53() {
  return ml_fixed((5n * 60000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function rp_726566726573682e726566726573685f7265636f766572792e69735f757361626c65(candidate, base, mode, now_ms) {
  ml_validate_rust_value(candidate, {"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e546f6b656e"}, ml_host_value_schema_7f3c07751fe3015bee333364ac17a84270644c048c5ea155a474ef59febb42b9, { refinements: ml_host_value_refinements_7f3c07751fe3015bee333364ac17a84270644c048c5ea155a474ef59febb42b9 });
  ml_validate_rust_value(base, {"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e546f6b656e"}, ml_host_value_schema_7f3c07751fe3015bee333364ac17a84270644c048c5ea155a474ef59febb42b9, { refinements: ml_host_value_refinements_7f3c07751fe3015bee333364ac17a84270644c048c5ea155a474ef59febb42b9 });
  ml_validate_rust_value(mode, {"kind":"data","name":"rp_726566726573682e726566726573685f7265636f766572792e5265636f766572794d6f6465"}, ml_host_value_schema_0813c146d3e1de30d2dfd045f0e16841567a25ea2ad5316beb05a7120b527667, { refinements: ml_host_value_refinements_0813c146d3e1de30d2dfd045f0e16841567a25ea2ad5316beb05a7120b527667 });
  if (typeof now_ms !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(now_ms, -9223372036854775808n, 9223372036854775807n, "i64 argument now_ms out of range");
  if (!(typeof now_ms === 'bigint' && now_ms >= -9223372036854775808n && now_ms <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  switch (mode.$) {
    case "Proactive": {
      return !rp_737562736372697074696f6e2e74797065732e6d6c5f696d706c5f3633373236313734363532653733373536323733363337323639373037343639366636653265373437393730363537333265353337353632373336333732363937303734363936663665353436663662363536655f3639373335663635373837303639373236353634(candidate, ml_host_rust_fixed_saturating_add_i64(now_ms, rp_726566726573682e524546524553485f534b45575f4d53()));
    }
    case "AfterRejection": {
      return (((candidate).access_token !== (base).access_token) && !rp_737562736372697074696f6e2e74797065732e6d6c5f696d706c5f3633373236313734363532653733373536323733363337323639373037343639366636653265373437393730363537333265353337353632373336333732363937303734363936663665353436663662363536655f3639373335663635373837303639373236353634(candidate, now_ms));
    }
    case "ImportValidation": {
      return false;
    }
    default: {
      return ml_router_unexpected(mode);
    }
  }
}

function rp_737562736372697074696f6e2e74797065732e6d6c5f696d706c5f3633373236313734363532653733373536323733363337323639373037343639366636653265373437393730363537333265353337353632373336333732363937303734363936663665353436663662363536655f3639373335663635373837303639373236353634(router_self, now_ms) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_737562736372697074696f6e2e74797065732e537562736372697074696f6e546f6b656e"}, ml_host_value_schema_7f3c07751fe3015bee333364ac17a84270644c048c5ea155a474ef59febb42b9, { refinements: ml_host_value_refinements_7f3c07751fe3015bee333364ac17a84270644c048c5ea155a474ef59febb42b9 });
  if (typeof now_ms !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(now_ms, -9223372036854775808n, 9223372036854775807n, "i64 argument now_ms out of range");
  if (!(typeof now_ms === 'bigint' && now_ms >= -9223372036854775808n && now_ms <= 9223372036854775807n)) throw new TypeError('argument outside supported Rust value domain');
  return (() => {
    const ml_standard_callback_self_1 = (router_self).expires_at_ms;
    switch (ml_standard_callback_self_1.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_2 = ml_standard_callback_self_1.field0;
        const ml_standard_callback_arg_3 = ml_standard_pattern_2;
        const exp = ml_standard_callback_arg_3;
        return (exp <= now_ms);
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_1);
      }
    }
  })();
}

export const translated = { ["RecoveryRung"]: Object.freeze({ ["AdoptedStoredToken"]: ml_make_RecoveryRung_AdoptedStoredToken, ["DirectExchange"]: ml_make_RecoveryRung_DirectExchange, ["AdoptedRotatedLink"]: ml_make_RecoveryRung_AdoptedRotatedLink, ["VendorCliRotation"]: ml_make_RecoveryRung_VendorCliRotation }), ["RecoveryMode"]: Object.freeze({ ["Proactive"]: ml_make_RecoveryMode_Proactive, ["AfterRejection"]: ml_make_RecoveryMode_AfterRejection, ["ImportValidation"]: ml_make_RecoveryMode_ImportValidation }), ["is_usable"]: rp_726566726573682e726566726573685f7265636f766572792e69735f757361626c65 };
export const provenance = {"sourcePath":"rust/src/refresh_recovery.rs","sourceSha256":"1ae8a2aea3b1d686223f527eeaee492aba17dd5e39b37c4ec235b64397589918","executable":3,"executableFunctions":1,"executableConstants":0,"executableTypes":2,"executableConstructors":7,"carried":21,"preserved":25,"runtimeParity":false};
