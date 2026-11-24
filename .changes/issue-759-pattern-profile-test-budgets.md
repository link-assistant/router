Give the existing two-profile if-let fixture a finite 65-second test deadline
for its two independently capped 30-second TypeScript compiler calls and
cleanup. Give the following single-profile record fixture 35 seconds. This
prevents Bun's default five-second cancellation from killing an active compiler
and reporting its late failure against the next test. Keep each compiler's
30-second limit, the focused batch's 360-second limit and every semantic
assertion unchanged.
