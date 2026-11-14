#!/usr/bin/env python3
"""Issue #784: run scripts/check-release-workflow.rs's checks without Rust.

The required-snippet list is read from the Rust script itself; the remaining
checks are ported one-for-one. Run from the repository root.
Usage: python3 -I experiments/issue-784/check-release-workflow-port.py
"""
import os
import re
import sys

script = open("scripts/check-release-workflow.rs", encoding="utf-8").read()
block = re.search(r"let required_snippets = \[(.*?)\n    \];", script, re.S).group(1)
snippets = [bytes(m, "utf-8").decode("unicode_escape") for m in re.findall(r'^\s*"((?:[^"\\]|\\.)*)",$', block, re.M)]
wf = open(".github/workflows/release.yml", encoding="utf-8").read()
rec = open(".github/workflows/verify-releases.yml", encoding="utf-8").read()
count = lambda h, n: h.count(n)
fail = [f"missing required release workflow snippet: {s}" for s in snippets if s not in wf]
if count(wf, "packages: write") < 2: fail.append("packages: write")
if count(wf, "docker/login-action@") < 4: fail.append("login-action")
if count(wf, "docker/build-push-action@") != 1: fail.append("build-push-action")
if "docker/setup-qemu-action" in wf: fail.append("qemu")
for line in (wf + "\n" + rec).splitlines():
    if not line.lstrip().startswith("uses:"): continue
    t = line.strip()
    if t.startswith("uses: ./.github/workflows/"):
        if not os.path.isfile(".github/workflows/" + t[len("uses: ./.github/workflows/"):]): fail.append("missing local " + t)
        continue
    rev = (line.split("@", 1)[1].split() or [""])[0] if "@" in line else ""
    if len(rev) != 40 or not re.fullmatch(r"[0-9a-fA-F]+", rev): fail.append("unpinned " + t)
actions = count(wf, "dtolnay/rust-toolchain@") + count(rec, "dtolnay/rust-toolchain@")
sel = next((l.strip()[len("toolchain: "):] for l in wf.splitlines() if l.strip().startswith("toolchain: ")), "")
if not sel or not all(p.isdigit() for p in sel.split(".")): fail.append(f"toolchain {sel!r}")
if actions != count(wf, f"toolchain: {sel}") + count(rec, f"toolchain: {sel}"): fail.append("toolchain count")
if count(wf, "ref: refs/tags/v${{ env.RELEASE_VERSION }}"): fail.append("tag ref checkout")
if count(wf, "ref: ${{ needs.resolve-release-source.outputs.sha }}") < 6: fail.append("resolved sha checkouts < 6")
if "sha256sum dist/*" in wf or "shasum -a 256 dist/*" in wf: fail.append("checksum names")
if count(wf, "sha256sum -c") < 2: fail.append("sha256sum -c")
if "rust-script scripts/check-release-provenance.rs" not in rec: fail.append("reconciliation provenance")
if count(wf, "push-by-digest=true") != 1: fail.append("push-by-digest")
if count(wf, "docker buildx imagetools create") != 2: fail.append("imagetools")
if count(wf, "rust-script scripts/check-docker-platforms.rs") != 1: fail.append("docker platforms")
if count(wf, "bash scripts/verify-ghcr-visibility.sh") != 1: fail.append("ghcr visibility")
if "docker-build:" in wf or "needs: [lint, test, build, docker-build]" in wf: fail.append("docker-build")
if "create-github-release:\n    name: Prepare GitHub Prerelease\n    needs: [javascript, release-javascript, resolve-release-source, auto-release, manual-release]" not in wf: fail.append("create-github-release header")
if "rust-script --test scripts/check-github-releases.rs" not in wf: fail.append("github releases test")
if count(wf, "CARGO_REGISTRY_TOKEN: ${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}") != 1: fail.append("token mapping")
if "\n  finalize-release:\n" in wf:
    prep, job = wf.split("\n  finalize-release:\n", 1)
    for r in ["publish-docker-manifests", "publish-release-artifacts", "verify-release-provenance"]:
        if f"needs.{r}.result == 'success'" not in job: fail.append("finalize waits " + r)
    if "scripts/publish-crate.rs" not in job or "--prerelease=false --latest" not in job: fail.append("finalize publish")
    if "scripts/publish-crate.rs" in prep or "--prerelease true" not in prep: fail.append("preparation")
else:
    fail.append("no finalize-release")
for line in wf.splitlines():
    if line.rstrip() == "jobs:": break
    if "CARGO_REGISTRY_TOKEN:" in line: fail.append("workflow-level token")
for line in wf.splitlines():
    if line.lstrip().startswith("run:") and ("${{ github.event.inputs." in line or "${{ inputs." in line): fail.append("input expansion " + line.strip())
for line in wf.splitlines():
    if (line.startswith("    if:") or line.startswith("      always()")) and "always()" in line and "!cancelled()" not in line:
        fail.append("always() " + line.strip())
for name in sorted(os.listdir(".github/workflows")):
    if not name.endswith(".yml"): continue
    for line in open(".github/workflows/" + name, encoding="utf-8").read().splitlines():
        if not line.lstrip().startswith("#") and ("ubuntu-latest" in line or "macos-latest" in line): fail.append(f"{name}: latest alias {line.strip()}")
if count(wf, '--crates-io-url "https://crates.io/crates/link-assistant-router"') != 1: fail.append("crates badge")
if count(wf, '--docker-hub-url "https://hub.docker.com/r/konard/link-assistant-router"') != 1: fail.append("docker hub badge")
print(f"{len(snippets)} snippets checked")
for f in fail: print("Error:", f)
sys.exit(1 if fail else 0)
