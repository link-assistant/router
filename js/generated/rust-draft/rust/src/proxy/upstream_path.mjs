// Generated draft from rust/src/proxy/upstream_path.rs; sha256=bd1cf836b23868fdc92750d17c0548c8318930314eef81196fd9768d46ccb898
// Carried constructs are data, never runtime parity evidence.
import { assertImmutableCopy as ml_pattern_immutable } from "../../../runtime/copy-runtime.mjs";

function rp_70726f78792e757073747265616d5f706174682e7265736f6c76655f757073747265616d5f70617468(path) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  const ml_pattern_3 = (() => {
    const ml_text_1 = path;
    const ml_text_2 = "/api/services/anthropic";
    return (ml_text_1.startsWith(ml_text_2)?Object.freeze({ $: 'Some', field0: ml_text_1.slice(ml_text_2.length) }):Object.freeze({ $: 'None' }));
  })();
  if ((ml_pattern_immutable(ml_pattern_3) && (ml_pattern_3.$ === "Some"))) {
    const rest = (ml_pattern_3)["field0"];
    return rest;
  } else {
  }
  const ml_pattern_6 = (() => {
    const ml_text_4 = path;
    const ml_text_5 = "/api/services/bedrock";
    return (ml_text_4.startsWith(ml_text_5)?Object.freeze({ $: 'Some', field0: ml_text_4.slice(ml_text_5.length) }):Object.freeze({ $: 'None' }));
  })();
  if ((ml_pattern_immutable(ml_pattern_6) && (ml_pattern_6.$ === "Some"))) {
    const rest_2 = (ml_pattern_6)["field0"];
    return rest_2;
  } else {
  }
  const ml_pattern_9 = (() => {
    const ml_text_7 = path;
    const ml_text_8 = "/api/services/vertex";
    return (ml_text_7.startsWith(ml_text_8)?Object.freeze({ $: 'Some', field0: ml_text_7.slice(ml_text_8.length) }):Object.freeze({ $: 'None' }));
  })();
  if ((ml_pattern_immutable(ml_pattern_9) && (ml_pattern_9.$ === "Some"))) {
    const rest_3 = (ml_pattern_9)["field0"];
    return rest_3;
  } else {
  }
  const ml_pattern_12 = (() => {
    const ml_text_10 = path;
    const ml_text_11 = "/api/anthropic";
    return (ml_text_10.startsWith(ml_text_11)?Object.freeze({ $: 'Some', field0: ml_text_10.slice(ml_text_11.length) }):Object.freeze({ $: 'None' }));
  })();
  if ((ml_pattern_immutable(ml_pattern_12) && (ml_pattern_12.$ === "Some"))) {
    const rest_4 = (ml_pattern_12)["field0"];
    return rest_4;
  } else {
  }
  const ml_pattern_15 = (() => {
    const ml_text_13 = path;
    const ml_text_14 = "/api/latest/anthropic";
    return (ml_text_13.startsWith(ml_text_14)?Object.freeze({ $: 'Some', field0: ml_text_13.slice(ml_text_14.length) }):Object.freeze({ $: 'None' }));
  })();
  if ((ml_pattern_immutable(ml_pattern_15) && (ml_pattern_15.$ === "Some"))) {
    const rest_5 = (ml_pattern_15)["field0"];
    return rest_5;
  } else {
  }
  return path;
}

export const translated = { ["resolve_upstream_path"]: rp_70726f78792e757073747265616d5f706174682e7265736f6c76655f757073747265616d5f70617468 };
export const provenance = {"sourcePath":"rust/src/proxy/upstream_path.rs","sourceSha256":"bd1cf836b23868fdc92750d17c0548c8318930314eef81196fd9768d46ccb898","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":0,"preserved":2,"runtimeParity":false};
