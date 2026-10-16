# Issue 764 implementation plan

- [x] Read the complete issue and PR discussion, contribution rules and FEP-0837.
- [x] Reproduce missing publication and unconditional inbox acceptance with tests.
- [x] Use FEP Proposal/Intent/Agreement/Commitment and ActivityStreams fields only.
- [x] Publish the caller-visible catalog, preserving credentials and model policy.
- [x] Execute model requests through the existing authenticated inference handler.
- [x] Retire Gonka/ForgeFed provider selection and automatic Gonka discovery.
- [x] Preserve logs and run formatting, focused checks and full Clippy sequentially.
- [ ] Run final runtime tests and verify full CI on the pushed commit.
- [x] Add migration documentation, major changelog and PR 765 draft description.
- [ ] Commit, push, review the PR diff, finish CI and mark PR 765 ready.

Scope: FEP-0837 explicitly puts the economic transaction outside its protocol.
Inference uses the existing OpenAI endpoint linked from the finalized agreement;
no prompts or provider credentials are added to the marketplace vocabulary.
