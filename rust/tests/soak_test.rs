//! Soak test (issue #672): many streaming, non-streaming and disconnected
//! requests against the in-process Router, checking that memory, tasks and
//! file descriptors stay bounded and that no budget reservation is left open.
//!
//! Ignored by default because it runs for a fixed wall-clock time:
//!
//! ```sh
//! SOAK_SECONDS=60 cargo test -j2 --test soak_test -- --ignored --nocapture
//! ```
//!
//! Knobs: `SOAK_SECONDS` (default 60), `SOAK_CONCURRENCY` (default 16) and
//! `SOAK_RSS_GROWTH_MB` (default 64; the allowed resident-memory growth after
//! warm-up). The `Soak` workflow runs it nightly and, briefly, on pull
//! requests that touch the proxy paths.

#[path = "support/replay_router.rs"]
mod replay_router;

use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};

use link_assistant_router::config::UpstreamProvider;
use replay_router::{Cassette, ReplayRouter, Surface};
use serde_json::{Value, json};

/// The model the Anthropic cassettes were served by.
const CLAUDE_MODEL: &str = "claude-sonnet-4-5-20250929";

fn env_number(name: &str, default: u64) -> u64 {
    std::env::var(name)
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(default)
}

/// Resident set size in KiB: `/proc` on Linux, `ps` on macOS.
fn rss_kib() -> Option<u64> {
    if cfg!(target_os = "macos") {
        return ps_rss_kib();
    }
    if !cfg!(target_os = "linux") {
        return None;
    }
    let status = std::fs::read_to_string("/proc/self/status").ok()?;
    parse_rss_kib(
        status
            .lines()
            .find_map(|line| line.strip_prefix("VmRSS:"))?
            .split_whitespace()
            .next()?,
    )
}

/// macOS `ps` reports RSS in 1024-byte units, like Linux's `VmRSS`.
fn ps_rss_kib() -> Option<u64> {
    let output = std::process::Command::new("/bin/ps")
        .args(["-o", "rss=", "-p", &std::process::id().to_string()])
        .env("LC_ALL", "C")
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    parse_rss_kib(std::str::from_utf8(&output.stdout).ok()?)
}

fn parse_rss_kib(sample: &str) -> Option<u64> {
    sample.trim().parse().ok().filter(|&rss| rss > 0)
}

fn assert_rss_bounded(base: Option<u64>, now: Option<u64>, allowed_kib: u64) {
    let base = base.expect("resident memory bound unproven: baseline RSS measurement unavailable");
    let now = now.expect("resident memory bound unproven: final RSS measurement unavailable");
    let growth = now.saturating_sub(base);
    assert!(
        growth <= allowed_kib,
        "resident memory grew {growth} KiB (allowed {allowed_kib} KiB)"
    );
}

#[test]
#[should_panic(expected = "resident memory bound unproven")]
fn memory_guard_rejects_missing_baseline() {
    assert_rss_bounded(None, Some(1024), 64 * 1024);
}

#[test]
#[should_panic(expected = "resident memory bound unproven")]
fn memory_guard_rejects_missing_final_sample() {
    assert_rss_bounded(Some(1024), None, 64 * 1024);
}

#[test]
fn memory_guard_accepts_the_budget_boundary_and_decreases() {
    assert_rss_bounded(Some(1024), Some(1024 + 64 * 1024), 64 * 1024);
    assert_rss_bounded(Some(2048), Some(1024), 64 * 1024);
}

#[test]
#[should_panic(expected = "resident memory grew 65537 KiB (allowed 65536 KiB)")]
fn memory_guard_rejects_growth_over_the_unchanged_budget() {
    assert_rss_bounded(Some(1024), Some(1024 + 64 * 1024 + 1), 64 * 1024);
}

#[test]
fn rss_samples_must_be_positive_numbers_in_kib() {
    assert_eq!(parse_rss_kib("  84768\n"), Some(84_768));
    for sample in ["", "0", "-1", "RSS\n84768", "84768 476496", "unknown"] {
        assert_eq!(
            parse_rss_kib(sample),
            None,
            "invalid RSS sample: {sample:?}"
        );
    }
}

#[test]
#[cfg(any(target_os = "linux", target_os = "macos"))]
fn rss_measurement_is_available_on_supported_platforms() {
    assert!(rss_kib().is_some(), "RSS measurement unavailable");
    // Exercise the macOS command and parser on Linux as well.
    assert!(ps_rss_kib().is_some(), "ps RSS measurement unavailable");
}

/// Open file descriptors (Linux): sockets included, so leaked upstream or
/// client connections show up here.
fn open_fds() -> Option<usize> {
    Some(std::fs::read_dir("/proc/self/fd").ok()?.count())
}

fn alive_tasks() -> usize {
    tokio::runtime::Handle::current()
        .metrics()
        .num_alive_tasks()
}

#[derive(Default)]
struct Counters {
    streamed: AtomicU64,
    translated: AtomicU64,
    unary: AtomicU64,
    disconnected: AtomicU64,
    failed: AtomicU64,
}

struct Rig {
    streaming: ReplayRouter,
    unary: ReplayRouter,
    stream_body: Value,
    unary_body: Value,
    chat_body: Value,
    tokens: Vec<(Surface, String, String, bool)>,
}

impl Rig {
    async fn start() -> Self {
        // One router per upstream answer: the stub replays the same cassette
        // for every request, so streamed and unary turns need their own.
        let streaming = ReplayRouter::start_without_recording(UpstreamProvider::Anthropic).await;
        let stream = Cassette::load("anthropic/messages-stream-thinking-tool-cache.json");
        let mut stream_body = stream.document["request"].clone();
        stream_body["model"] = json!(CLAUDE_MODEL);
        streaming.replay([stream]);
        // A slow upstream, so a client can disconnect mid-stream.
        streaming.set_chunk_delay(Some(Duration::from_millis(2)));

        let unary = ReplayRouter::start_without_recording(UpstreamProvider::Anthropic).await;
        let reply = Cassette::load("anthropic/messages-cache-read.json");
        let mut unary_body = reply.document["request"].clone();
        unary_body["model"] = json!(CLAUDE_MODEL);
        unary.replay([reply]);

        let chat_body = json!({
            "model": CLAUDE_MODEL, "stream": true, "stream_options": {"include_usage": true},
            "messages": [{"role": "user", "content": "What's the weather in Paris?"}],
        });
        let mut tokens = Vec::new();
        for (surface, streamed) in [
            (Surface::AnthropicMessages, true),
            (Surface::OpenAIChat, true),
        ] {
            let (token, id) = streaming.issue(surface.client(), None);
            tokens.push((surface, token, id, streamed));
        }
        let (token, id) = unary.issue(Surface::AnthropicMessages.client(), None);
        tokens.push((Surface::AnthropicMessages, token, id, false));
        Self {
            streaming,
            unary,
            stream_body,
            unary_body,
            chat_body,
            tokens,
        }
    }

    /// One request of kind `round % 4`: a streamed native turn, a streamed
    /// translated turn, a unary turn, or a stream the client abandons after
    /// its first chunk.
    async fn one(&self, round: u64, counters: &Counters) {
        let (kind, counter) = match round % 4 {
            0 => (0, &counters.streamed),
            1 => (1, &counters.translated),
            2 => (2, &counters.unary),
            _ => (3, &counters.disconnected),
        };
        let (surface, token, _, _) = &self.tokens[if kind == 3 { 0 } else { kind }];
        let (router, body) = match kind {
            1 => (&self.streaming, &self.chat_body),
            2 => (&self.unary, &self.unary_body),
            _ => (&self.streaming, &self.stream_body),
        };
        let response = match router.post(*surface, token, body).send().await {
            Ok(response) if response.status().is_success() => response,
            _ => {
                counters.failed.fetch_add(1, Ordering::Relaxed);
                return;
            }
        };
        let complete = if kind == 3 {
            let mut response = response;
            let first = response.chunk().await;
            drop(response);
            first.is_ok()
        } else {
            response.bytes().await.is_ok()
        };
        let counter = if complete { counter } else { &counters.failed };
        counter.fetch_add(1, Ordering::Relaxed);
    }

    /// Drive `concurrency` workers until `deadline`.
    async fn drive(
        self: &Arc<Self>,
        concurrency: u64,
        deadline: Instant,
        counters: &Arc<Counters>,
    ) {
        // Spawn every worker before awaiting any, so they run concurrently.
        let mut workers = Vec::new();
        for worker in 0..concurrency {
            let rig = Arc::clone(self);
            let counters = Arc::clone(counters);
            workers.push(tokio::spawn(async move {
                let mut round = worker;
                while Instant::now() < deadline {
                    rig.one(round, &counters).await;
                    round += 1;
                }
            }));
        }
        for worker in workers {
            worker.await.expect("soak worker");
        }
    }
}

/// Wait up to `limit` for `probe` to report at most `bound`; return the last value.
async fn settle(limit: Duration, bound: usize, probe: impl Fn() -> Option<usize>) -> Option<usize> {
    let started = Instant::now();
    loop {
        let value = probe()?;
        if value <= bound || started.elapsed() > limit {
            return Some(value);
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}

#[tokio::test]
async fn soak_fixture_does_not_retain_requests() {
    tokio::time::timeout(Duration::from_secs(15), async {
        let rig = Rig::start().await;
        let counters = Counters::default();
        // Inspect retention during traffic without clearing any requests.
        // Include every mode twice, with the last cassette repeating.
        for round in 0..8 {
            rig.one(round, &counters).await;
        }
        assert_eq!(counters.failed.load(Ordering::Relaxed), 0);
        assert_eq!(counters.streamed.load(Ordering::Relaxed), 2);
        assert_eq!(counters.translated.load(Ordering::Relaxed), 2);
        assert_eq!(counters.unary.load(Ordering::Relaxed), 2);
        assert_eq!(counters.disconnected.load(Ordering::Relaxed), 2);
        assert!(
            rig.streaming.requests().is_empty() && rig.unary.requests().is_empty(),
            "soak fixtures must not retain upstream requests during traffic"
        );
    })
    .await
    .expect("fixture regression exceeded 15 seconds");
}

#[tokio::test]
async fn replay_fixture_records_requests_by_default() {
    tokio::time::timeout(Duration::from_secs(15), async {
        let router = ReplayRouter::start(UpstreamProvider::Anthropic).await;
        router.replay([Cassette::json("count", 200, &json!({"input_tokens": 1234}))]);
        let surface = Surface::AnthropicCountTokens;
        let (token, _) = router.issue(surface.client(), None);
        let body = json!({
            "model": CLAUDE_MODEL,
            "messages": [{"role": "user", "content": "Count these tokens"}],
        });
        let raw = serde_json::to_vec_pretty(&body).expect("request JSON");
        for _ in 0..2 {
            let response = router
                .post(surface, &token, &body)
                .body(raw.clone())
                .send()
                .await
                .expect("send request");
            assert!(response.status().is_success());
            assert_eq!(
                response.json::<Value>().await.expect("count response"),
                json!({"input_tokens": 1234})
            );
        }
        let recorded = router.requests();
        assert_eq!(recorded.len(), 2);
        for request in recorded {
            assert_eq!(request.path, "/v1/messages/count_tokens");
            assert_eq!(request.headers["anthropic-version"], "2023-06-01");
            assert_eq!(request.raw, raw);
            assert_eq!(request.body, body);
        }
        router.clear_requests();
        assert!(router.requests().is_empty());
    })
    .await
    .expect("recording regression exceeded 15 seconds");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "runs for SOAK_SECONDS; the Soak workflow runs it"]
async fn soak_keeps_memory_tasks_and_connections_bounded() {
    let seconds = env_number("SOAK_SECONDS", 60);
    let concurrency = env_number("SOAK_CONCURRENCY", 16);
    let rss_growth_kib = env_number("SOAK_RSS_GROWTH_MB", 64) * 1024;
    println!(
        "soak configuration: platform {}; seconds {seconds}; concurrency {concurrency}; \
         RSS growth allowance {rss_growth_kib} KiB; request recording disabled",
        std::env::consts::OS
    );
    let rig = Arc::new(Rig::start().await);

    // Warm up: connection pools, lazily built state and allocator arenas
    // reach their steady size before the baseline is taken.
    let warm = Arc::new(Counters::default());
    let warm_up = Duration::from_secs(seconds.clamp(2, 10) / 2);
    rig.drive(concurrency, Instant::now() + warm_up, &warm)
        .await;
    tokio::time::sleep(Duration::from_millis(500)).await;
    let base_rss = rss_kib();
    let base_fds = open_fds();
    let base_tasks = alive_tasks();

    let counters = Arc::new(Counters::default());
    let started = Instant::now();
    rig.drive(
        concurrency,
        started + Duration::from_secs(seconds),
        &counters,
    )
    .await;
    let elapsed = started.elapsed();

    // Let abandoned streams finish settling and idle connections close.
    let tasks = settle(Duration::from_secs(10), base_tasks + 4, || {
        Some(alive_tasks())
    })
    .await
    .unwrap_or_default();
    let fds = match base_fds {
        Some(base) => settle(Duration::from_secs(10), base + 16, open_fds).await,
        None => None,
    };
    let rss = rss_kib();

    let streamed = counters.streamed.load(Ordering::Relaxed);
    let translated = counters.translated.load(Ordering::Relaxed);
    let unary = counters.unary.load(Ordering::Relaxed);
    let disconnected = counters.disconnected.load(Ordering::Relaxed);
    let failed = counters.failed.load(Ordering::Relaxed);
    let total = streamed + translated + unary + disconnected;
    let growth = base_rss
        .zip(rss)
        .map(|(base, now)| now.saturating_sub(base));
    println!(
        "soak: {total} requests in {elapsed:?} ({streamed} streamed, {translated} translated, \
         {unary} unary, {disconnected} disconnected, {failed} failed); \
         rss {base_rss:?} -> {rss:?} KiB; growth {growth:?} KiB (allowed {rss_growth_kib} KiB); \
         fds {base_fds:?} -> {fds:?}; tasks {base_tasks} -> {tasks}"
    );
    if base_fds.is_none() || fds.is_none() {
        println!("soak: connection bound unproven: file descriptor measurements unavailable");
    }
    // Capture every token's accounting before any resource assertion can fail.
    let accounting = rig
        .tokens
        .iter()
        .map(|(_, _, id, streamed)| {
            let router = if *streamed {
                &rig.streaming
            } else {
                &rig.unary
            };
            let (used, reserved) = router.used_tokens(id);
            println!("soak accounting: token {id}; used {used}; reserved {reserved}");
            (id, used, reserved)
        })
        .collect::<Vec<_>>();

    assert_eq!(failed, 0, "every request must succeed");
    assert!(
        streamed > 0 && translated > 0 && unary > 0 && disconnected > 0,
        "every request kind must run"
    );
    assert!(
        tasks <= base_tasks + 4,
        "tasks leaked: {base_tasks} after warm-up, {tasks} after the soak"
    );
    if let (Some(base), Some(now)) = (base_fds, fds) {
        assert!(
            now <= base + 16,
            "file descriptors (connections) leaked: {base} after warm-up, {now} after the soak"
        );
    }
    assert_rss_bounded(base_rss, rss, rss_growth_kib);
    // Every turn, abandoned ones included, settled its reservation.
    for (id, used, reserved) in accounting {
        assert!(used > 0, "token {id} was never charged");
        assert_eq!(reserved, 0, "token {id} kept a reservation open");
    }
}
