Add an optional complete forward-file Bun runner that starts one fresh process
per discovered test file, preserves all case deadlines, streams full logs and
records per-child resources. Global-budget exhaustion, interruption, changed
inputs and newly discovered files remain explicit failures. Existing mandatory
gate commands and translation admission are unchanged.
