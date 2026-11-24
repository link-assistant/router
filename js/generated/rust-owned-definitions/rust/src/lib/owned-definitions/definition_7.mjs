import {json_macro_null,json_macro_bool,json_macro_string,json_macro_object} from "../runtime/json-macro-runtime.mjs";
/**
 * @param {string} input0
 */
export function rp_7265636f7665725f61646d696e5f636c692e6661696c7572655f656e76656c6f7065(input0){
  const checked_argument0 = json_macro_string(input0);
  return json_macro_object([["recovered",json_macro_bool(false)],["error",json_macro_string(input0)]]);
}
