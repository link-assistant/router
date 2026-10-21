import {router_core_json_option_as_str as optional_as_str} from "../runtime/json-option-runtime.mjs";
export function rp_6272696467655f726573706f6e73652e616e7468726f7069635f736572766963655f746965725f66726f6d5f6f70656e6169(input0){
  const local0 = optional_as_str(input0);
  const local1 = local0;
  if (local1.$ === 'Some') {
    const local2 = local1.field0;
    if ((local2 === "default")) {
      return ({$:'Some',field0:"standard"});
    } else {
      if ((local2 === "auto")) {
        return ({$:'Some',field0:"standard"});
      } else {
        if ((local2 === "priority")) {
          return ({$:'Some',field0:"priority"});
        } else {
          return ({$:'None'});
        }
      }
    }
  } else {
    return ({$:'None'});
  }
}
