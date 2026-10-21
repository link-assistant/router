import {json_macro_null,json_macro_bool,json_macro_string,json_macro_object} from "../runtime/json-macro-runtime.mjs";
/**
 * @param {string} input0
 * @param {string} input1
 * @param {boolean} input2
 */
export function rp_6465706c6f795f6c6f63616c2e7374617475735f7265706f72742e626c6f636b6572(input0:string,input1:string,input2:boolean):ReturnType<typeof json_macro_object>{
  const checked_argument0 = json_macro_string(input0);
  const checked_argument1 = json_macro_string(input1);
  const checked_argument2 = json_macro_bool(input2);
  return json_macro_object([["name",json_macro_string(input0)],["reason",json_macro_string(input1)],["forceable",json_macro_bool(input2)]]);
}
