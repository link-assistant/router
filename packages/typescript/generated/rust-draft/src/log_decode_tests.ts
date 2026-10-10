// Generated draft from src/log_decode_tests.rs; sha256=17a026e59f2f8643666487359458c3a0b153d3b7ab3c635ba2193fce72b0eabb
// Carried constructs are data, never runtime parity evidence.
function TERMINATED() {
  return "event: message_start\ndata: {\"type\":\"message_start\"}\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n";
}

export const translated: { "TERMINATED": string } = { "TERMINATED": TERMINATED() };
export const provenance = {"sourcePath":"src/log_decode_tests.rs","sourceSha256":"17a026e59f2f8643666487359458c3a0b153d3b7ab3c635ba2193fce72b0eabb","executable":1,"executableFunctions":0,"executableConstants":1,"carried":11,"preserved":13,"runtimeParity":false};
