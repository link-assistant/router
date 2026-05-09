# Issue 27 Requirements

Issue: https://github.com/link-assistant/router/issues/27

## Extracted Requirements

| Requirement | Status | Notes |
|---|---|---|
| Investigate the referenced failing GitHub Actions job. | Done | Failing run `25605733144`, job `75167379430`, was downloaded and analyzed. |
| Download all logs and related issue data into this repository. | Done | Raw issue, PR, run, log, artifact metadata, and Docker build record data are stored under `raw/`. |
| Compile a case study under `docs/case-studies/issue-27`. | Done | See `README.md`, `template-comparison.md`, and `online-research.md`. |
| Reconstruct timeline and sequence of events. | Done | See `README.md`. |
| List root causes of each problem. | Done | Root cause is the Docker builder lacking native OpenSSL discovery/build packages. |
| Propose solution options and choose a plan. | Done | See `README.md`. |
| Compare all GitHub workflow and CI/CD script files against the named templates. | Done | Repository trees and release workflows are archived under `raw/`; findings are in `template-comparison.md`. |
| Reuse applicable CI/CD best practices from the templates. | Done | Existing workflow practices already align; this issue is Dockerfile-specific and not present in templates. |
| Search online for additional facts and data. | Done | See `online-research.md`. |
| Report the same issue in templates if found there. | Not needed | The referenced templates do not include a Rust Dockerfile builder or Docker image publishing path. |
| Add debug output or verbose mode if root cause cannot be found. | Not needed | The log directly identifies missing `pkg-config` and OpenSSL build metadata. |
| Create a reproducing test before the fix. | Done | `dockerfile_builder_installs_native_tls_build_dependencies` failed before the Dockerfile update and passes after it. |
| Execute everything in one pull request. | Done | Implemented on branch `issue-27-1c4f5add71b6` for PR 28. |
