# Thinking controls

Add a final suffix to an exact model ID to request thinking:

```json
{"model":"exact-model(high)","messages":[{"role":"user","content":"hello"}]}
```

Router selects and authorizes `exact-model`. The suffix is a request control;
responses retain the actual provider model identity. Explicit body controls
take precedence, so `reasoning_effort: "low"` overrides `(high)`.

| Suffix | Intent |
| --- | --- |
| `none`, `0` | Off |
| `auto`, `-1` | Automatic |
| Positive decimal integer through `4294967295` | Token budget |
| `minimal`, `low`, `medium`, `high`, `xhigh`, `max` | Effort level |

Levels and special words are case insensitive. The last parenthesized suffix
is parsed only at the end of the selector; whitespace is not trimmed. Leading
zeroes and a leading `+` on a numeric budget are accepted. Empty, unrecognized,
negative (except `-1`), overflowing and missing-base suffixes remain literal
model IDs and receive ordinary exact routing checks.

Use the same suffix with `router with --model exact-model(high)` or a forwarded
client `--model`. The short-lived token grants only the base model. Gemini
native requests use the suffix on the URL model selector. Responses WebSocket
`response.create` events use it in `model`, including subsequent events.

| Protocol | Body controls |
| --- | --- |
| Anthropic Messages | `thinking.type`, `thinking.budget_tokens`, `output_config.effort` |
| OpenAI Chat | `reasoning.effort`, then `reasoning_effort` |
| OpenAI Responses / Codex | `reasoning.effort` |
| Gemini / Vertex | `generationConfig.thinkingConfig.thinkingLevel` or `thinkingBudget` |
| Qwen native controls | `enable_thinking`, `thinking_budget` or effort |

Gemini's snake case thinking aliases are also understood. Qwen Chat suffixes
use native thinking controls; Qwen's Responses route retains its existing
Responses envelope and receives Responses controls. The standalone Vertex and Qwen appliers describe their wire formats;
this feature does not add new inference routes.

When conversion requires a budget, efforts map to 512, 1024, 8192, 24576,
32768 and 128000 tokens respectively. These are semantic conversion values,
not claims about a particular model. Exact authenticated capability evidence
can clamp them or select a supported level. Anthropic translations retain
their existing explicit-body effort mapping and output headroom. Reviewed
exact adaptive Anthropic IDs retain adaptive thinking; unknown IDs do not
inherit a model family's capabilities.

Native requests without a suffix keep their existing behavior. The shared
pipeline adds no default. Existing Chat-to-Responses defaults still apply.
Explicit summary visibility does not select an amount of thinking. Signed
thinking blocks, Gemini thought signatures and encrypted Responses history
continue through their established replay paths.

The [model truth contract](model-truth-contract.md#thinking-controls-and-scoped-evidence)
defines which scoped evidence can constrain controls. Set Router's existing
debug log level to inspect conversion, clamp and unsupported-drop traces;
normal logging does not emit these traces.

Conformance tests port all 285 vectors in five CLIProxyAPI v8.0.20 matrices,
with attribution and the upstream MIT license in `tests/fixtures/thinking/`.
The upstream body/suffix conflict order is intentionally adjusted to preserve
Router's explicit body precedence, and the pipeline adds no upstream default.
Run the focused suite with:

```console
cargo test --locked --test thinking_matrix_test --test thinking_parser_test \
  --test thinking_evidence_test --test thinking_pipeline_test
```
