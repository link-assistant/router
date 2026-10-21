# Thinking conversion vectors

The five JSON files are extracted without changing their values from
[CLIProxyAPI v8.0.20 thinking_conversion_test.go](https://github.com/router-for-me/CLIProxyAPI/blob/0f96f568e4dbf6f84ad7399a74b78344c5eac7e6/test/thinking_conversion_test.go).
Copyright (c) 2025 router-for-me, MIT. The accompanying LICENSE preserves the
upstream license. `experiments/issue-725/extract_upstream.py` regenerates them
from a checkout of that revision.

Router retains explicit body-control precedence and does not inject default
reasoning into requests with no thinking control. The conformance harness
records those intentional compatibility differences. Synthetic model facts
exist only in the tests and never enter the production catalog.
