import {serde_json_value_get_string as get_field,serde_json_value_as_str as read_string} from "../runtime/json-runtime.mjs";
export function rp_726573706f6e7365732e636861745f696e7075742e6e6f6e656d7074795f737472696e67(input0:Parameters<typeof get_field>[0], input1:Parameters<typeof get_field>[1]):ReturnType<typeof read_string>{
  const field = get_field(input0, input1);
  if (field.$ === "Some") {
    const text = read_string(field.field0);
    if (text.$ === "Some") {
      if (text.field0 !== "") { return text; } else { return {$:"None"}; }
    } else { return {$:"None"}; }
  } else { return {$:"None"}; }
}
