// Generated draft from src/anthropic_stream.rs; sha256=fcd91d239af65a88e746f67d6f3c6c7888ae6d467bbc0a75825e02d93eebf6b0
// Carried constructs are data, never runtime parity evidence.
function map_stop_reason(finish_reason) {
  if (!(typeof finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  if ((finish_reason === "length")) {
    return "max_tokens";
  } else {
    if ((finish_reason === "max_tokens")) {
      return "max_tokens";
    } else {
      if ((finish_reason === "max_output_tokens")) {
        return "max_tokens";
      } else {
        if ((finish_reason === "tool_calls")) {
          return "tool_use";
        } else {
          if ((finish_reason === "function_call")) {
            return "tool_use";
          } else {
            if ((finish_reason === "tool_use")) {
              return "tool_use";
            } else {
              return "end_turn";
            }
          }
        }
      }
    }
  }
}

export const translated = { map_stop_reason };
export const provenance = {"sourcePath":"src/anthropic_stream.rs","sourceSha256":"fcd91d239af65a88e746f67d6f3c6c7888ae6d467bbc0a75825e02d93eebf6b0","executable":1,"executableFunctions":1,"executableConstants":0,"carried":10,"preserved":12,"runtimeParity":false};
