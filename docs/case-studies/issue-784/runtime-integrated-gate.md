# Integrated Clone and runtime-import gate attempt

The complete mandatory local gate runs at clean
`21caf33cf798bcb90a00778fc538664f2f3cb4cc`, using Node 20.20.2, Bun 1.4.4 and the
installed TypeScript 5.9.3. Node children receive a 512 MiB old-space bound;
original tests, strictness, assertions and deadlines stay unchanged.

Lint checks all 1776 JavaScript source files and passes its 61 controls. Native
Node and Bun each pass 259 cases. The nine independent deadline controls, public
and native type checking, native TypeScript freshness and strict compilation of
all 165 native TypeScript files also pass.

The complete native TypeScript behavior file reports four passes before the
owned memory observer interrupts the check. Its terminal record retains SIGTERM
and the missing complete deadline audit. It cannot qualify that file. Remaining
TypeScript commands, parity, forward translation and reverse regeneration are
unrun in this attempt. No green stamp exists, and no Rust tool runs.

The container limit is 3135369216 bytes; the observer threshold is 2866933760.
The complete attempt's sampled cgroup maximum is 2887798784 bytes, including
initial fingerprinting. At that initial boundary, inactive-page advice reduces
accounting from 2887798784 to 1541701632 bytes without changing any file. The
receipt does not record a separate final-stop sample, so the initial maximum
cannot be attributed specifically to the later behavior case.

A detached test-server daemon survives the original process-group termination.
Its exact command, subreaper parent and process status are retained before
terminating only that owned daemon. All owned processes are reaped. The final
669.87-second observer duration includes this cleanup wait. The complete
2092-line gate log, raw Node attempts and cleanup receipt remain preserved.

The task observer now follows its own launcher's process ancestry when stopping
children, including detached groups, and records a separate stop sample/time.
A finite detached-daemon control passes in 0.32 seconds and verifies both the
direct child and daemon are reaped. This harness control does not replace any
Router test or qualify the interrupted gate. Complete archived-byte verification
also permits retiring 655360 allocated bytes of inactive duplicate Node receipts;
their complete originals remain in existing packets.

Complete archive/member hashes also verify all 188 inactive task allocation
samples before retiring their duplicate directory. This reclaims 17784832
allocated bytes; the complete originals remain in the project-retention packet.
Neither cleanup changes source, test evidence, compiler authority or limits.

The full integrated gate and same-head CI remain required for
[PR #785](https://github.com/link-assistant/router/pull/785). This attempt
establishes neither complete translation nor parity nor release readiness.
