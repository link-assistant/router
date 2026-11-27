# CI and advisories

## Historical failures

- PR #767 omitted the required changelog fragment. The Dependency Audit also flagged rustls 0.23.45 for `RUSTSEC-2026-0346`, `RUSTSEC-2026-0348`, and `RUSTSEC-2026-0349` in the archived log at lines 1214–1241. At the starting SHA, the root lockfile had rustls 0.23.46 and the fuzz lockfile still had 0.23.45. [Run 38890202607](https://github.com/link-assistant/router/actions/runs/38890202607).
- PRs #778, #787, #788 and #789 used the historical automated translation gate. Their listed strict TypeScript, parity and profile failures prevented Rust jobs from running. A strict gate result cannot be inferred from the later change to the four-stage manual workflow. [#778](https://github.com/link-assistant/router/pull/778), [#787](https://github.com/link-assistant/router/pull/787), [#788](https://github.com/link-assistant/router/pull/788), [#789](https://github.com/link-assistant/router/pull/789).
- PR #809 reached the Rust lane. Clippy showed type errors from fallible HMAC JWT keys and the new `NonZeroU16` dimensions required by the terminal emulator, starting at line 1539 in the archived failed-job log. Bindings, benchmarks, and fuzz jobs shared these build errors. The changelog job also failed. [Pipeline](https://github.com/link-assistant/router/actions/runs/45986555269), [bindings](https://github.com/link-assistant/router/actions/runs/45986555013), [benchmarks](https://github.com/link-assistant/router/actions/runs/45986554681), [fuzz](https://github.com/link-assistant/router/actions/runs/45986554643).
- PR #790's strict workflow reported four lint failures and TypeScript reported a missing neutral tree. The action refresh must pass the active workflow's source auditor and preserve the strict workflow's source structure. [Run 43413079455](https://github.com/link-assistant/router/actions/runs/43413079455).
- The starting `main` pipeline and its bindings and fuzz jobs confirmed the JWT and terminal build errors. The archived failing-step logs show `E0308` at pipeline line 520, downstream line 782 and fuzz line 864. The real-client capture log additionally reports obsolete link-cli mapped-storage methods, starting at line 81. The starting commit's delivery check reached `state: merged` and reported that its release source was missing, with `release.yml` recovery instructions at lines 16–19. The preceding scheduled release check looked for assets on v1.25.5 and reported `no assets to download` at line 1325. The current source selects the highest published version, and v1.25.6 has its expected binary, distribution and contract assets. [Pipeline](https://github.com/link-assistant/router/actions/runs/45990167960), [bindings](https://github.com/link-assistant/router/actions/runs/45990167770), [fuzz](https://github.com/link-assistant/router/actions/runs/45999414916), [capture](https://github.com/link-assistant/router/actions/runs/45990167874), [delivery](https://github.com/link-assistant/router/actions/runs/46001702415), [release check](https://github.com/link-assistant/router/actions/runs/45863598137), [v1.25.6](https://github.com/link-assistant/router/releases/tag/v1.25.6).

## Verification for PR #811

The source changes cover blank and placeholder issuer secrets, a raw HMAC with an empty key, deployment fingerprint compatibility and terminal sizing. The PR retains storage reopen coverage. The four-stage manual JavaScript workflow is required for the exact SHA before Rust CI starts. All Rust build, Clippy, test and advisory evidence must come from hosted CI.

| Local check | Result |
| --- | --- |
| Focused Node regression and workflow-policy tests | 30 passed |
| Focused Node and Bun native tests with the Linux subreaper wrapper | 6 Node cases and 32 Bun cases passed |
| Complete active local JavaScript gate at `14dbdea8` | All four stages passed with the Linux subreaper wrapper. Node and Bun each passed 405 cases, and the TypeScript stage included all 10 Node deadline cases. |
| Complete active local JavaScript gate with updated npm | All four stages passed with npm 12.2.3 on Node 26.13.1 and npm 11.21.3 on Node 20.20.2. The gate covered 405 cases each on Node and Bun, 10 Node deadline cases, both public declaration checks, 188 native TypeScript sources and the Vite build. This local run used the npm upgrade draft before finalizing the Qwen planner and Maven mirror. |
| Public and native TypeScript checks | Both passed with TypeScript 7.0.2 |
| Admin UI production build and Rust asset synchronization | Passed with Vite 8.4 |
| Browser admin smoke test | Chromium loaded all four built chunks with HTTP 200, then signed in and out against a mock API without an uncaught page error. |
| Active workflow policy and retained matrix-draft generator | Passed |
| Archived fixed parallel workflow generator | Reproduced its source inverse failure on both the starting main source and the proposed source. The archived workflow has sharded custody while the source auditor expects both fixed matrices. |
| Archived strict workflow tests run in isolation | 30 passed and 9 failed. The archived suite includes assertions for the old gate and strict runner commands. |
| npm advisories | Zero across `js`, `ts`, `ui` and `scripts/ci` |
| Real-client install and advisories | The npm 12 install launched all five pinned clients. Gemini's keychain addon and terminal addon loaded. The final installed Linux x64 npm graph returned zero OSV advisories. |
| Universal Python lock and Python advisories | uv lock check passed. `pip-audit` found zero advisories in the installed tool environment. The complete updated universal lock returned zero advisories in OSV. |
| Python distribution | Wheel and source distribution built |
| Python minimum supported runtime | The same 10 released-binary tests passed under Python 3.10. |
| Nix | Flake evaluation passed for the Router package, development shell, formatter and format check. Builds require hosted Rust verification. |
| Released-binary interoperability | Router v1.25.6 passed 11 JavaScript binding cases, 10 Python binding cases and the generated Go, Java and PHP round trips. The unchanged catalog generated all 368 operations in each language. |
| Composer advisories | Zero from Packagist for the committed lock |
| Generated Go and Java advisory scan | OSV found zero advisories in the probe modules and effective Java classpath. The complete plugin graph scan found four remaining advisories, all in the optional Maven site preview. |
| Generated Maven build | Maven 3.10.2 resolved the plugins and built the 368-operation Java client on JDK 25. The released-binary HTTP probe exercised the API calls and both lenient Gson overloads. |
| Container package and advisory checks | The tunnel image built and passed missing-configuration and argument smoke tests. The Debian runtime and Rust builder package layers built independently. See the distribution advisory results below. |
| Rust lockfile advisory cross-check | OSV scanned all three regenerated Cargo locks. Its only result was the informational `chrono` maintenance advisory. Hosted `cargo audit` is pending. |
| Pre-commit hooks | Ran the hook commands directly using pre-commit-hooks v6.0.0 because the pre-commit runner is absent. No Git hook bypass flags were used. |

The initial complete local manual-gate attempt hit process cleanup failures under a container PID 1 that leaves children as zombies. The focused recheck ran with [a Linux subreaper wrapper](../../../../../../experiments/issue-810/reap-test-descendants.py), which leaves the original tests and deadlines intact.

Hosted run 46002025243 at `f1298e12efc10aca87a68d28ab83c4f906d0db63` passed lint, Node and Bun. The TypeScript stage passed the deadline suite and both public declaration checks, then failed in the private compiler's source-integrity check. The downloaded job log records `Original file token context: original source operations changed` at line 374. The same failure reproduces under local Node 26.13.1 and 24.22.3. The Node 22.23.5 probe also shows that its `isProxy` function has the anonymous native representation. Under Node 20.20.2, the two pristine-source guards pass and strict compilation covers all 188 files with TypeScript 5.9.3. The TypeScript stage now pins that runtime. The three other stages retain the current Node release. [Hosted check 46002025243](https://github.com/link-assistant/router/actions/runs/46002025243), [Node #67826](https://github.com/nodejs/node/issues/67826).

At `14dbdea882511262c90889ef18e044332d6b9b8d`, all four hosted JavaScript stages passed and the same-commit gate authorized hosted Cargo. Cargo 1.100.0 resolved the root, fuzz and active sharder locks. The root and fuzz locks now both resolve rustls 0.23.46. The artifact's SHA-256 is `c911f8b7801778a69205edad294e513a88436e96a49af6d23ac7276b8b2db425`. [Hosted lock run](https://github.com/link-assistant/router/actions/runs/46007063014), [Cargo job](https://github.com/link-assistant/router/actions/runs/46007063014/job/140537373394).

The release workflow at the same checkpoint reported one `cargo fmt` difference at line 725 of its lint log. The token validator now includes the exact formatting emitted by the runner. That checkpoint still carried the older fuzz lock and reported 14 advisories and 12 denied warnings at audit log lines 1124–1521. Every affected package is patched in the committed replacement lock, including `cookie`, `ctutils`, `rustix`, `rustls`, `rustls-webpki`, `tokio`, `url`, the two WebPKI root bundles and the three Zstandard crates. The updated locks need their own hosted audit. [Formatting job](https://github.com/link-assistant/router/actions/runs/46007074272/job/140541864640), [audit job](https://github.com/link-assistant/router/actions/runs/46007074272/job/140541864635).

The current Chrono release is 0.4.45. The maintenance advisory assigns no CVSS score and lists no fixed release. Router exposes Chrono in its public operation context, while current Log Lazy depends on it and Schemars supplies the existing date-time schema. Fully removing it requires a public API migration and replacement of those dependency edges. [RustSec advisory](https://rustsec.org/advisories/RUSTSEC-2026-0543.html), [upstream maintenance discussion](https://github.com/chronotope/chrono/issues/1768).

The root and fuzz locks resolve `rsa` 0.10.0 and `crypto-bigint` 0.7.11. Both versions meet the applicable RustSec fixed-version boundaries. The audit configuration drops the two corresponding exceptions so hosted CI can detect any regression to affected versions. [RSA advisory](https://rustsec.org/advisories/RUSTSEC-2023-0071.html), [crypto-bigint advisory](https://rustsec.org/advisories/RUSTSEC-2026-0387.html).

## Hosted client failures and regressions

The downstream check at `2f0e32b1f8dc4f0eaf57c0a708fed8c7a76642dc` passed the JavaScript gate, the semver contract and all six binding jobs. The generated HTTP job reached JDK and PHP setup, then stopped at its Maven distribution download. The archived log records HTTP 429 at line 597. Both Google’s Maven Central mirror and Apache Maven Central supplied Maven 3.10.2 locally with the pinned SHA-512. The setup now tries the mirror first with Central as fallback and verifies the distribution digest before extracting it. [Downstream run](https://github.com/link-assistant/router/actions/runs/46009357161), [generated HTTP job](https://github.com/link-assistant/router/actions/runs/46009357161/job/140552598231).

The initial real-client scan found two advisories in the Sharp 0.35.3 package pinned by Qwen Code 0.23.1. Qwen Code 0.28.7 pins Sharp 0.35.5, which includes both upstream fixes. The final installed graph scan reported zero findings. A loopback mock with an isolated Qwen configuration received one `/v1/chat/completions` request and returned the expected response for the updated positional prompt. The launch regression covers inferred positional prompts, explicit legacy flags and the `sessions` subcommand. [Real-client inventory](real-clients.tsv), [libheif advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), [librsvg advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).

## Maven plugin advisories

The first scan of the full classpath and resolved Maven plugin realms covered 237 versioned components and found 10 affected component and advisory pairs. The Maven manifest now upgrades Commons BeanUtils, Plexus Utils, Plexus Archiver and jsoup in the plugin realms that load them. The resolved Plexus Archiver 4.16.0 no longer depends on Aircompressor. Maven Resources Plugin retains the patched Plexus Utils 3.6.4 API line it was built against. The [plugin inventory](maven-plugins.tsv) records all resolved coordinates and their registry versions.

The patched scan covered 233 versioned components and found Jetty 9.4.58.v20250814 in the optional `mvn site:run` server. Maven Central lists it as the final public Jetty 9 release. Apache replaced Jetty with the JDK HTTP server in its development branch, and the change awaits a Maven Site Plugin release. The four advisories do not affect the generated client runtime or its build and test lifecycle. [Apache Maven Site Plugin #1298](https://github.com/apache/maven-site-plugin/issues/1298), [merged replacement](https://github.com/apache/maven-site-plugin/pull/1303), [Jetty Maven metadata](https://repo.maven.apache.org/maven2/org/eclipse/jetty/jetty-server/maven-metadata.xml).

| Advisory | Scope |
| --- | --- |
| [GHSA-355h-qmc2-wpwf](https://github.com/advisories/GHSA-355h-qmc2-wpwf) | Maven Site Plugin Jetty 9 preview server |
| [GHSA-qh8g-58pp-2wxh](https://github.com/advisories/GHSA-qh8g-58pp-2wxh) | Maven Site Plugin Jetty 9 preview server |
| [GHSA-2fvj-hgj9-j2gr](https://github.com/advisories/GHSA-2fvj-hgj9-j2gr) | Maven Site Plugin Jetty 9 preview server |
| [GHSA-7p3p-8qv8-m2vh](https://github.com/advisories/GHSA-7p3p-8qv8-m2vh) | Maven Site Plugin Jetty 9 preview server |

## Distribution advisories

The Debian and Alpine build stages now apply the updates published by their pinned distribution releases before installing their stage-specific packages. The Alpine tunnel image upgraded OpenSSL and zlib, while the Debian stages upgraded libzstd1, login.defs and passwd. The [container package inventory](container-packages.tsv) records the versions in the pinned images and the built layers.

| Image or stage | Distinct advisory IDs reported by OSV |
| --- | --- |
| Pinned Alpine 3.24 base | 6 |
| Built tunnel image | 0 |
| Pinned Debian 13 runtime base | 94 |
| Runtime layer with the distribution upgrades and CA certificates | 90 |
| Pinned Rust builder base | 163 |
| Builder layer with the distribution upgrades and build packages | 193 |
| Pinned Bun donor image | 111 |

The builder includes additional binutils, Expat and Python packages. Its OS packages stay in the builder. The Bun stage copies only the Bun executable into the Debian runtime. None of the [remaining Debian findings](container-advisories.tsv) lists a fixed release for the Debian 13 source package in the OSV feed. Debian marks each recorded range as unimportant or has yet to assign urgency. The distribution must publish a patched build to close those entries on the supported Debian release. The Docker workflow still needs to verify the complete runtime with the Rust binaries. [Debian Security Tracker](https://security-tracker.debian.org/tracker/), [Alpine security database](https://secdb.alpinelinux.org/).
