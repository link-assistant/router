// Generated draft from src/request_log/stream_outcome.rs; sha256=92452a28069d0b7055a62026b34c241153c21059c18943df97e165790b6f1f29
// Carried constructs are data, never runtime parity evidence.
function STREAM_END_MARKER() {
  return "stream-end marker";
}

function text_terminates_stream(text) {
  return (((text.includes("message_stop") || text.includes("[DONE]")) || text.includes("response.completed")) || text.includes("finishReason"));
}

export const translated = { "STREAM_END_MARKER": STREAM_END_MARKER(), text_terminates_stream };
export const provenance = {"sourcePath":"src/request_log/stream_outcome.rs","sourceSha256":"92452a28069d0b7055a62026b34c241153c21059c18943df97e165790b6f1f29","executable":2,"carried":9,"preserved":12,"runtimeParity":false};
