type MLData_426f64795374796c65 = Readonly<{ readonly "$": "Json" }> | Readonly<{ readonly "$": "Form" }>;
type MLData_43726564656e7469616c45766964656e6365 = Readonly<{ readonly "$": "Working" }> | Readonly<{ readonly "$": "Rejected" }>;
type MLData_496d706f7274526566726573684661696c757265 = Readonly<{ readonly "$": "ImportRefreshFailure"; readonly "kind": MLData_496d706f7274526566726573684661696c7572654b696e64; readonly "message": string }>;
type MLData_496d706f7274526566726573684661696c7572654b696e64 = Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }>;
type MLData_52656672657368436f6e666967 = Readonly<{ readonly "$": "RefreshConfig"; readonly "token_url": string; readonly "client_id": string; readonly "style": MLData_426f64795374796c65 }>;
type MLData_526566726573684572726f72 = Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": MLData_52656672657368537461747573436c617373; readonly "field2": MLData_526f757465724f7074696f6e5f335f693634 }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }>;
type MLData_52656672657368537461747573436c617373 = Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>;
type MLData_526f757465724f7074696f6e5f33375f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_73657264655f6a736f6e2e56616c7565 }>;
type MLData_526f757465724f7074696f6e5f33385f6e616d65645f3733373436345f37343639366436355f34343735373236313734363936663665 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_7374642e74696d652e4475726174696f6e }>;
type MLData_526f757465724f7074696f6e5f33395f6e616d65645f37333635373236343635356636613733366636655f346537353664363236353732 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_73657264655f6a736f6e2e4e756d626572 }>;
type MLData_526f757465724f7074696f6e5f335f693332 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_526f757465724f7074696f6e5f335f693634 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_526f757465724f7074696f6e5f335f753634 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_526f757465724f7074696f6e5f34335f61727261795f6e616d65645f37333635373236343635356636613733366636655f35363631366337353635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": ReadonlyArray<MLData_73657264655f6a736f6e2e56616c7565> }>;
type MLData_526f757465724f7074696f6e5f345f626f6f6c = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": boolean }>;
type MLData_526f757465724f7074696f6e5f345f756e6974 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": null }>;
type MLData_526f757465724f7074696f6e5f35395f6e616d65645f37333635373236343635356636613733366636655f3464363137303566353337343732363936653637356635363631366337353635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565 }>;
type MLData_526f757465724f7074696f6e5f355f666c6f6174 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": number }>;
type MLData_526f757465724f7074696f6e5f365f737472696e67 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_526f75746572526573756c745f33375f6e616d65645f37333635373236343635356636613733366636655f353636313663373536355f33375f6e616d65645f37333635373236343635356636613733366636655f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": MLData_73657264655f6a736f6e2e56616c7565 }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_73657264655f6a736f6e2e4572726f72 }>;
type MLData_526f75746572526573756c745f33385f6e616d65645f3733373436345f37343639366436355f343437353732363137343639366636655f36345f6e616d65645f3733373436345f37343639366436355f353437323739343637323666366434363663366636313734353336353633373334353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": MLData_7374642e74696d652e4475726174696f6e }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_7374642e74696d652e54727946726f6d466c6f6174536563734572726f72 }>;
type MLData_526f75746572526573756c745f345f756e69745f32385f6e616d65645f3733373436345f363936665f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": null }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_7374642e696f2e4572726f72 }>;
type MLData_526f75746572526573756c745f365f737472696e675f32385f6e616d65645f3733373436345f363936665f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": string }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_7374642e696f2e4572726f72 }>;
type MLData_526f75746572526573756c745f365f737472696e675f33365f6e616d65645f3733373436345f3635366537365f35363631373234353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": string }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_7374642e656e762e5661724572726f72 }>;
type MLData_526f75746572526573756c745f365f737472696e675f33375f6e616d65645f37333635373236343635356636613733366636655f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": string }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_73657264655f6a736f6e2e4572726f72 }>;
type MLData_526f75746572526573756c745f385f61727261795f75385f33375f6e616d65645f37333635373236343635356636613733366636655f34353732373236663732 = Readonly<{ readonly "$": "Ok"; readonly "field0": ReadonlyArray<bigint> }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_73657264655f6a736f6e2e4572726f72 }>;
type MLData_73657264655f6a736f6e2e4572726f72 = Readonly<{ readonly "$": "JsonError"; readonly "category": MLData_73657264655f6a736f6e2e6572726f722e43617465676f7279; readonly "line": bigint; readonly "column": bigint; readonly "message": string }>;
type MLData_73657264655f6a736f6e2e4d6170456e747279 = Readonly<{ readonly "$": "MapEntry"; readonly "key": string; readonly "value": MLData_73657264655f6a736f6e2e56616c7565 }>;
type MLData_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565 = Readonly<{ readonly "$": "Map"; readonly "entries": ReadonlyArray<MLData_73657264655f6a736f6e2e4d6170456e747279> }>;
type MLData_73657264655f6a736f6e2e4e756d626572 = Readonly<{ readonly "$": "PosInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "NegInt"; readonly "field0": bigint }> | Readonly<{ readonly "$": "Float"; readonly "field0": number }>;
type MLData_73657264655f6a736f6e2e56616c7565 = Readonly<{ readonly "$": "Null" }> | Readonly<{ readonly "$": "Bool"; readonly "field0": boolean }> | Readonly<{ readonly "$": "Number"; readonly "field0": MLData_73657264655f6a736f6e2e4e756d626572 }> | Readonly<{ readonly "$": "String"; readonly "field0": string }> | Readonly<{ readonly "$": "Array"; readonly "field0": ReadonlyArray<MLData_73657264655f6a736f6e2e56616c7565> }> | Readonly<{ readonly "$": "Object"; readonly "field0": MLData_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565 }>;
type MLData_73657264655f6a736f6e2e6572726f722e43617465676f7279 = Readonly<{ readonly "$": "Io" }> | Readonly<{ readonly "$": "Syntax" }> | Readonly<{ readonly "$": "Data" }> | Readonly<{ readonly "$": "Eof" }>;
type MLData_7374642e656e762e5661724572726f72 = Readonly<{ readonly "$": "NotPresent" }> | Readonly<{ readonly "$": "NotUnicode"; readonly "field0": MLData_7374642e6666692e4f73537472696e67 }>;
type MLData_7374642e6666692e4f73537472696e67 = Readonly<{ readonly "$": "OsString"; readonly "bytes": ReadonlyArray<bigint> }>;
type MLData_7374642e696f2e4572726f72 = Readonly<{ readonly "$": "IoError"; readonly "kind": string; readonly "message": string; readonly "raw_os_error": MLData_526f757465724f7074696f6e5f335f693332 }>;
type MLData_7374642e74696d652e4475726174696f6e = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
type MLData_7374642e74696d652e54727946726f6d466c6f6174536563734572726f72 = Readonly<{ readonly "$": "TryFromFloatSecsError"; readonly "kind": MLData_7374642e74696d652e54727946726f6d466c6f6174536563734572726f724b696e64 }>;
type MLData_7374642e74696d652e54727946726f6d466c6f6174536563734572726f724b696e64 = Readonly<{ readonly "$": "Negative" }> | Readonly<{ readonly "$": "OverflowOrNan" }>;
// Generated draft from src/refresh.rs; sha256=dac860972f9c160d8730146477e82177dd1e6e1da97bc2e12e45ed398fa24108
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163 = {"schemaVersion":1,"types":{"BodyStyle":{"kind":"data","name":"BodyStyle","ctors":[{"name":"Json","fields":[]},{"name":"Form","fields":[]}]}}};

const ml_host_value_refinements_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163 = new Map([]);

function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_host_value_schema_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865 = {"schemaVersion":1,"types":{"RefreshStatusClass":{"kind":"data","name":"RefreshStatusClass","ctors":[{"name":"InvalidGrant","fields":[]},{"name":"InvalidClient","fields":[]},{"name":"UnauthorizedClient","fields":[]},{"name":"UnsupportedGrantType","fields":[]},{"name":"RateLimited","fields":[]},{"name":"ClientRejected","fields":[]},{"name":"Transient","fields":[]},{"name":"UnexpectedStatus","fields":[]}]}}};

const ml_host_value_refinements_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865 = new Map([]);

const ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = {"schemaVersion":1,"types":{"RouterOption_3_i64":{"kind":"data","name":"RouterOption_3_i64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]}]}}};

const ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 = new Map([]);

const ml_host_value_schema_bfb98a976e138df608e671b34f3f005c5d4cdd5f4c8e2833f0d61e248266d501 = {"schemaVersion":1,"types":{"ImportRefreshFailureKind":{"kind":"data","name":"ImportRefreshFailureKind","ctors":[{"name":"NotAttempted","fields":[]},{"name":"ExchangeRejected","fields":[]},{"name":"ExchangeUncertain","fields":[]},{"name":"PersistenceUncertain","fields":[]}]}}};

const ml_host_value_refinements_bfb98a976e138df608e671b34f3f005c5d4cdd5f4c8e2833f0d61e248266d501 = new Map([]);

function ml_make_BodyStyle_Json(): Readonly<{ readonly "$": "Json" }> | Readonly<{ readonly "$": "Form" }> {
  return Object.freeze({ $: 'Json' });
}

function ml_make_BodyStyle_Form(): Readonly<{ readonly "$": "Json" }> | Readonly<{ readonly "$": "Form" }> {
  return Object.freeze({ $: 'Form' });
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
};

const serde_json = {
  error: {

  },
};

function ml_make_RefreshConfig_RefreshConfig(token_url: string, client_id: string, style: Readonly<{ readonly "$": "Json" }> | Readonly<{ readonly "$": "Form" }>): Readonly<{ readonly "$": "RefreshConfig"; readonly "token_url": string; readonly "client_id": string; readonly "style": Readonly<{ readonly "$": "Json" }> | Readonly<{ readonly "$": "Form" }> }> {
  if (!(typeof token_url === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(token_url))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof client_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(client_id))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(style, {"kind":"data","name":"BodyStyle"}, ml_host_value_schema_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163, { refinements: ml_host_value_refinements_7bfbe538cfea81f8c59a9749bc873eed151c887edc1017da8fce8756d060d163 });
  return Object.freeze({ $: "RefreshConfig", ["token_url"]: token_url, ["client_id"]: client_id, ["style"]: style });
}

function CLAUDE_OAUTH_USER_AGENT(): string {
  return "anthropic-sdk-typescript/0.112.1 userOAuthProvider";
}

function ANTHROPIC_SDK_VERSION(): string {
  return "0.112.1";
}

function GEMINI_CLI_VERSION(): string {
  return "0.59.0";
}

function GOOGLE_AUTH_LIBRARY_VERSION(): string {
  return "10.9.0";
}

function QWEN_CODE_VERSION(): string {
  return "0.23.1";
}

function GEMINI_CLIENT_ID_ENV(): string {
  return "GEMINI_OAUTH_CLIENT_ID";
}

function GEMINI_CLIENT_SECRET_ENV(): string {
  return "GEMINI_OAUTH_CLIENT_SECRET";
}

function GEMINI_CLIENT_ID(): string {
  return "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com";
}

function GEMINI_AUTH_USER_AGENT(): string {
  return "google-api-nodejs-client/10.9.0";
}

function GEMINI_API_CLIENT(): string {
  return "gl-node/22.14.0";
}

function CLAUDE_CLIENT_ID(): string {
  return "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
}

function CLAUDE_TOKEN_URL(): string {
  return "https://platform.claude.com/v1/oauth/token";
}

function REFRESH_SKEW_MS(): bigint {
  return ml_fixed((5n * 60000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function ROTATION_ATTRIBUTION_MS(): bigint {
  return ml_fixed((60n * 60000n), -9223372036854775808n, 9223372036854775807n, "attempt to multiply with overflow");
}

function ml_make_RefreshError_Unsupported(): Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; readonly "field2": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }> {
  return Object.freeze({ $: 'Unsupported' });
}

function ml_make_RefreshError_NoRefreshToken(): Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; readonly "field2": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }> {
  return Object.freeze({ $: 'NoRefreshToken' });
}

function ml_make_RefreshError_Request(field0: string): Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; readonly "field2": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }> {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Request', field0: field0 });
}

function ml_make_RefreshError_Status(field0: bigint, field1: Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>, field2: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>): Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; readonly "field2": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }> {
  ml_fixed(field0, 0n, 65535n, "u16 argument field0 out of range");
  if (!(typeof field0 === 'bigint' && field0 >= 0n && field0 <= 65535n)) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(field1, {"kind":"data","name":"RefreshStatusClass"}, ml_host_value_schema_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865, { refinements: ml_host_value_refinements_c7429a9d35553e3e1a16733637cf0ce26f63237b6e03caf613fe6e3c21ece865 });
  ml_validate_rust_value(field2, {"kind":"data","name":"RouterOption_3_i64"}, ml_host_value_schema_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40, { refinements: ml_host_value_refinements_2e3ea161a73aed61f0b1c9ad7d015a638e446c01744828ba8a655b9be3c1fc40 });
  return Object.freeze({ $: 'Status', field0: field0, field1: field1, field2: field2 });
}

function ml_make_RefreshError_Parse(field0: string): Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; readonly "field2": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }> {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Parse', field0: field0 });
}

function ml_make_RefreshError_Storage(field0: string): Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; readonly "field2": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }> {
  if (!(typeof field0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(field0))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: 'Storage', field0: field0 });
}

function ml_make_RefreshStatusClass_InvalidGrant(): Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }> {
  return Object.freeze({ $: 'InvalidGrant' });
}

function ml_make_RefreshStatusClass_InvalidClient(): Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }> {
  return Object.freeze({ $: 'InvalidClient' });
}

function ml_make_RefreshStatusClass_UnauthorizedClient(): Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }> {
  return Object.freeze({ $: 'UnauthorizedClient' });
}

function ml_make_RefreshStatusClass_UnsupportedGrantType(): Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }> {
  return Object.freeze({ $: 'UnsupportedGrantType' });
}

function ml_make_RefreshStatusClass_RateLimited(): Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }> {
  return Object.freeze({ $: 'RateLimited' });
}

function ml_make_RefreshStatusClass_ClientRejected(): Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }> {
  return Object.freeze({ $: 'ClientRejected' });
}

function ml_make_RefreshStatusClass_Transient(): Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }> {
  return Object.freeze({ $: 'Transient' });
}

function ml_make_RefreshStatusClass_UnexpectedStatus(): Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }> {
  return Object.freeze({ $: 'UnexpectedStatus' });
}

function ml_make_ImportRefreshFailureKind_NotAttempted(): Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }> {
  return Object.freeze({ $: 'NotAttempted' });
}

function ml_make_ImportRefreshFailureKind_ExchangeRejected(): Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }> {
  return Object.freeze({ $: 'ExchangeRejected' });
}

function ml_make_ImportRefreshFailureKind_ExchangeUncertain(): Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }> {
  return Object.freeze({ $: 'ExchangeUncertain' });
}

function ml_make_ImportRefreshFailureKind_PersistenceUncertain(): Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }> {
  return Object.freeze({ $: 'PersistenceUncertain' });
}

function ml_make_ImportRefreshFailure_ImportRefreshFailure(kind: Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }>, message: string): Readonly<{ readonly "$": "ImportRefreshFailure"; readonly "kind": Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }>; readonly "message": string }> {
  ml_validate_rust_value(kind, {"kind":"data","name":"ImportRefreshFailureKind"}, ml_host_value_schema_bfb98a976e138df608e671b34f3f005c5d4cdd5f4c8e2833f0d61e248266d501, { refinements: ml_host_value_refinements_bfb98a976e138df608e671b34f3f005c5d4cdd5f4c8e2833f0d61e248266d501 });
  if (!(typeof message === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(message))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "ImportRefreshFailure", ["kind"]: kind, ["message"]: message });
}

function ml_make_CredentialEvidence_Working(): Readonly<{ readonly "$": "Working" }> | Readonly<{ readonly "$": "Rejected" }> {
  return Object.freeze({ $: 'Working' });
}

function ml_make_CredentialEvidence_Rejected(): Readonly<{ readonly "$": "Working" }> | Readonly<{ readonly "$": "Rejected" }> {
  return Object.freeze({ $: 'Rejected' });
}

export const translated: { "BodyStyle": Readonly<{ "Json": () => Readonly<{ readonly "$": "Json" }> | Readonly<{ readonly "$": "Form" }>; "Form": () => Readonly<{ readonly "$": "Json" }> | Readonly<{ readonly "$": "Form" }> }>; "RefreshConfig": (token_url: string, client_id: string, style: Readonly<{ readonly "$": "Json" }> | Readonly<{ readonly "$": "Form" }>) => Readonly<{ readonly "$": "RefreshConfig"; readonly "token_url": string; readonly "client_id": string; readonly "style": Readonly<{ readonly "$": "Json" }> | Readonly<{ readonly "$": "Form" }> }>; "CLAUDE_OAUTH_USER_AGENT": string; "ANTHROPIC_SDK_VERSION": string; "GEMINI_CLI_VERSION": string; "GOOGLE_AUTH_LIBRARY_VERSION": string; "QWEN_CODE_VERSION": string; "GEMINI_CLIENT_ID_ENV": string; "GEMINI_CLIENT_SECRET_ENV": string; "GEMINI_CLIENT_ID": string; "GEMINI_AUTH_USER_AGENT": string; "GEMINI_API_CLIENT": string; "CLAUDE_CLIENT_ID": string; "CLAUDE_TOKEN_URL": string; "REFRESH_SKEW_MS": bigint; "ROTATION_ATTRIBUTION_MS": bigint; "RefreshError": Readonly<{ "Unsupported": () => Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; readonly "field2": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }>; "NoRefreshToken": () => Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; readonly "field2": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }>; "Request": (field0: string) => Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; readonly "field2": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }>; "Status": (field0: bigint, field1: Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>, field2: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>) => Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; readonly "field2": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }>; "Parse": (field0: string) => Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; readonly "field2": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }>; "Storage": (field0: string) => Readonly<{ readonly "$": "Unsupported" }> | Readonly<{ readonly "$": "NoRefreshToken" }> | Readonly<{ readonly "$": "Request"; readonly "field0": string }> | Readonly<{ readonly "$": "Status"; readonly "field0": bigint; readonly "field1": Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; readonly "field2": Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> }> | Readonly<{ readonly "$": "Parse"; readonly "field0": string }> | Readonly<{ readonly "$": "Storage"; readonly "field0": string }> }>; "RefreshStatusClass": Readonly<{ "InvalidGrant": () => Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; "InvalidClient": () => Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; "UnauthorizedClient": () => Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; "UnsupportedGrantType": () => Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; "RateLimited": () => Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; "ClientRejected": () => Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; "Transient": () => Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }>; "UnexpectedStatus": () => Readonly<{ readonly "$": "InvalidGrant" }> | Readonly<{ readonly "$": "InvalidClient" }> | Readonly<{ readonly "$": "UnauthorizedClient" }> | Readonly<{ readonly "$": "UnsupportedGrantType" }> | Readonly<{ readonly "$": "RateLimited" }> | Readonly<{ readonly "$": "ClientRejected" }> | Readonly<{ readonly "$": "Transient" }> | Readonly<{ readonly "$": "UnexpectedStatus" }> }>; "ImportRefreshFailureKind": Readonly<{ "NotAttempted": () => Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }>; "ExchangeRejected": () => Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }>; "ExchangeUncertain": () => Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }>; "PersistenceUncertain": () => Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }> }>; "ImportRefreshFailure": (kind: Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }>, message: string) => Readonly<{ readonly "$": "ImportRefreshFailure"; readonly "kind": Readonly<{ readonly "$": "NotAttempted" }> | Readonly<{ readonly "$": "ExchangeRejected" }> | Readonly<{ readonly "$": "ExchangeUncertain" }> | Readonly<{ readonly "$": "PersistenceUncertain" }>; readonly "message": string }>; "CredentialEvidence": Readonly<{ "Working": () => Readonly<{ readonly "$": "Working" }> | Readonly<{ readonly "$": "Rejected" }>; "Rejected": () => Readonly<{ readonly "$": "Working" }> | Readonly<{ readonly "$": "Rejected" }> }> } = { ["BodyStyle"]: Object.freeze({ ["Json"]: ml_make_BodyStyle_Json, ["Form"]: ml_make_BodyStyle_Form }), ["RefreshConfig"]: ml_make_RefreshConfig_RefreshConfig, ["CLAUDE_OAUTH_USER_AGENT"]: CLAUDE_OAUTH_USER_AGENT(), ["ANTHROPIC_SDK_VERSION"]: ANTHROPIC_SDK_VERSION(), ["GEMINI_CLI_VERSION"]: GEMINI_CLI_VERSION(), ["GOOGLE_AUTH_LIBRARY_VERSION"]: GOOGLE_AUTH_LIBRARY_VERSION(), ["QWEN_CODE_VERSION"]: QWEN_CODE_VERSION(), ["GEMINI_CLIENT_ID_ENV"]: GEMINI_CLIENT_ID_ENV(), ["GEMINI_CLIENT_SECRET_ENV"]: GEMINI_CLIENT_SECRET_ENV(), ["GEMINI_CLIENT_ID"]: GEMINI_CLIENT_ID(), ["GEMINI_AUTH_USER_AGENT"]: GEMINI_AUTH_USER_AGENT(), ["GEMINI_API_CLIENT"]: GEMINI_API_CLIENT(), ["CLAUDE_CLIENT_ID"]: CLAUDE_CLIENT_ID(), ["CLAUDE_TOKEN_URL"]: CLAUDE_TOKEN_URL(), ["REFRESH_SKEW_MS"]: REFRESH_SKEW_MS(), ["ROTATION_ATTRIBUTION_MS"]: ROTATION_ATTRIBUTION_MS(), ["RefreshError"]: Object.freeze({ ["Unsupported"]: ml_make_RefreshError_Unsupported, ["NoRefreshToken"]: ml_make_RefreshError_NoRefreshToken, ["Request"]: ml_make_RefreshError_Request, ["Status"]: ml_make_RefreshError_Status, ["Parse"]: ml_make_RefreshError_Parse, ["Storage"]: ml_make_RefreshError_Storage }), ["RefreshStatusClass"]: Object.freeze({ ["InvalidGrant"]: ml_make_RefreshStatusClass_InvalidGrant, ["InvalidClient"]: ml_make_RefreshStatusClass_InvalidClient, ["UnauthorizedClient"]: ml_make_RefreshStatusClass_UnauthorizedClient, ["UnsupportedGrantType"]: ml_make_RefreshStatusClass_UnsupportedGrantType, ["RateLimited"]: ml_make_RefreshStatusClass_RateLimited, ["ClientRejected"]: ml_make_RefreshStatusClass_ClientRejected, ["Transient"]: ml_make_RefreshStatusClass_Transient, ["UnexpectedStatus"]: ml_make_RefreshStatusClass_UnexpectedStatus }), ["ImportRefreshFailureKind"]: Object.freeze({ ["NotAttempted"]: ml_make_ImportRefreshFailureKind_NotAttempted, ["ExchangeRejected"]: ml_make_ImportRefreshFailureKind_ExchangeRejected, ["ExchangeUncertain"]: ml_make_ImportRefreshFailureKind_ExchangeUncertain, ["PersistenceUncertain"]: ml_make_ImportRefreshFailureKind_PersistenceUncertain }), ["ImportRefreshFailure"]: ml_make_ImportRefreshFailure_ImportRefreshFailure, ["CredentialEvidence"]: Object.freeze({ ["Working"]: ml_make_CredentialEvidence_Working, ["Rejected"]: ml_make_CredentialEvidence_Rejected }) };
export const provenance = {"sourcePath":"src/refresh.rs","sourceSha256":"dac860972f9c160d8730146477e82177dd1e6e1da97bc2e12e45ed398fa24108","executable":21,"executableFunctions":0,"executableConstants":14,"executableTypes":7,"executableConstructors":24,"carried":45,"preserved":67,"runtimeParity":false};
