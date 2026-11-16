# Owned temporary-client process draft

SOURCE ONLY; no application child, test, compiler, translator, preparer or CI
feedback was executed or inspected. Full source drafting remains incomplete.

One template produces the paired JS/TS owned-process supervisor. It accepts only
bounded executable/argv/environment data, an absolute working directory, a finite
deadline and a finite per-pipe output budget. Spawn uses exact argv and no shell.
The child receives only the supplied operation environment. Interactive launches
inherit stdio; structured launches capture each pipe independently, reconstructing
UTF-8 after complete byte collection. Exit status and terminating signal retain
the native 128+signal convention. Credentials/environment are never added to
launch errors, and error data retains only the child output and exit fields.

Cancellation, deadline and output overflow terminate the actual spawned handle,
then escalate after three seconds. No PID from a registry or caller is signalled.
Parent SIGINT/SIGTERM forwarding is opt-in and handlers are removed on every
completion path. Input cancellation refuses before spawn; concurrent calls retain
separate handles, timers, streams and results. No global child/source/owner/result
cache is introduced. Output retained per pipe is bounded even during termination.

A child that exits while its output pipes remain open gets a finite drain budget.
A five-second termination fallback closes owned pipes and unreferences the handle;
this is an explicit platform failure boundary, not proof of OS termination.
Descendant process-group/Windows-job supervision, hard realtime guarantees,
Windows command shims and terminal/PTY integration remain OPEN. The helper alone
does not complete temporary with execution: isolation, run credentials/renewal,
profile leases, bridge cleanup and actual dispatcher composition are next drafts.

Three complete source equations retain both phases/full serialized-reparsed CST
inverses and three full native inputs. Independent unrun cases cover exact argv/
environment/cwd, nonzero exits, multibyte streams, separate output caps, deadline/
cancellation, before-spawn refusal, missing executables and concurrent calls.
The existing strict paired TypeScript case includes actual child behavior from
the compiled module. Every case is source only; Rust remains gated CI only after
all eight same-SHA JavaScript stages. Full forward/reverse/sync, production parity,
platform/resource qualification, receiving and delivery remain OPEN.
