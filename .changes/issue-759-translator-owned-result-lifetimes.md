Remove copied borrowed-string lifetime metadata when a checked operation
produces an owned String. Preserve the evidence on actual shared results and
string literals, and retain refusals for ownership-changing return signatures.
