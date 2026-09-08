# Issue #546 z.ai thinking compatibility plan

## Goal

Make dynamically discovered z.ai Coding Plan models request the Anthropic thinking mode accepted by z.ai, and prove that real reasoning reaches Claude Code without hardcoding model identifiers or rewriting native payloads.

## Design

Router will continue attaching one reviewed Claude capability profile at the z.ai provider boundary. The profile will advertise the compatible Claude Sonnet 4.5 behavior so Claude Code emits `thinking.type: enabled`. The z.ai adapter will remain byte-transparent; it will not inspect model names or repair incompatible client requests.

The offline real-client upstream will model the provider contract strictly: only `thinking.type: enabled` may receive a synthetic thinking stream. The pinned Claude binary test will capture the emitted request and assert the exact mode before accepting the stream.

An opt-in protected acceptance will discover an exact model from the live Router catalog, launch the pinned Claude binary through a loopback Router, and require a genuine thinking delta in verbose stream output. It will skip when the protected z.ai key is unavailable and must never print the key.

## Delivery

1. Commit and run the strengthened regression against the current implementation to record the failure.
2. Change the provider capability identity and update affected fixtures.
3. Add the protected end-to-end acceptance and a patch changelog fragment.
4. Audit every dependency source, public text, and repository test; clear generated build state.
5. Merge the pull request, release the patch, and verify GitHub, crates.io, container images, and provenance.
