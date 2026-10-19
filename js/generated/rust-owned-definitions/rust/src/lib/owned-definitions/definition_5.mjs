import {serde_json_value_get_string as get_field,serde_json_value_as_i64 as read_scalar} from "../runtime/json-runtime.mjs";
export function rp_74656c656772616d2e7570646174655f6964(input0){
  const field0 = get_field(input0, "update_id");
  if (field0.$ === "Some") {
    const scalar = read_scalar(field0.field0);
    if (scalar.$ === "Some") {
      return scalar.field0;
    } else {
      return 0n;
    }
  } else {
    return 0n;
  }
}
