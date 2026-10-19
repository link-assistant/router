use super::*;

#[test]
fn result_lines_are_summed_across_binaries() {
    let output = "running 2 tests\nSKIP [tier3-real-client-offline] a: x\ntest a ... oktest result: garbage\n\
                      test result: ok. 11 passed; 0 failed; 2 ignored; 0 measured; 0 filtered out; finished in 0.01s\n\
                      test result: FAILED. 3 passed; 1 failed; 0 ignored; 0 measured; 4 filtered out; finished in 1.00s\n";
    assert_eq!(
        counts(output),
        Counts {
            passed: 14,
            failed: 1,
            ignored: 2
        }
    );
}

#[test]
fn a_skip_is_counted_once_per_test() {
    let log = r#"{"tier":"tier4-live-credentialed","test":"a","reason":"K is not set"}
{"tier":"tier4-live-credentialed","test":"a","reason":"K is not set"}
not json
{"tier":"tier2-integration","test":"b","reason":"no runtime"}
"#;
    let skipped = skips(log);
    assert_eq!(skipped.len(), 2);
    assert_eq!(skipped[1]["reason"], "no runtime");
}

#[test]
fn a_green_run_with_skips_is_not_parity() {
    let green = Counts {
        passed: 400,
        failed: 0,
        ignored: 0,
    };
    assert_eq!(status(true, &green, 0, 0), "proven");
    assert_eq!(status(true, &green, 1, 0), "not-proven");
    assert_eq!(status(true, &green, 0, 1), "not-proven");
    assert_eq!(status(true, &Counts::default(), 0, 0), "not-proven");
    assert_eq!(status(false, &green, 0, 0), "failed");
    let ignored = Counts {
        ignored: 1,
        ..green
    };
    assert_eq!(status(true, &ignored, 0, 0), "not-proven");
}

#[test]
fn every_area_names_existing_test_targets() {
    // rust-script builds and runs in a cache directory, but compiles the
    // script from its own path in the checkout.
    let tests = Path::new(file!())
        .ancestors()
        .nth(2)
        .expect("scripts/ sits in the repository root")
        .join("tests");
    for area in AREAS {
        for run in area.runs {
            for target in run.targets {
                assert!(
                    tests.join(format!("{target}.rs")).is_file(),
                    "{}: {target} is not a test target",
                    area.name
                );
            }
        }
    }
}

#[test]
fn serial_runs_pass_one_thread_and_never_fail_fast() {
    let rolling = &AREAS
        .iter()
        .find(|area| area.name == "rolling-updates")
        .unwrap()
        .runs[1];
    for (_, args) in invocations(rolling) {
        assert!(args.contains(&"--no-fail-fast".to_string()), "{args:?}");
        assert!(args.ends_with(&["--nocapture".to_string(), "--test-threads=1".to_string()]));
    }
    assert_eq!(
        invocations(&unit(&["--bin", "router"], "deploy_local")),
        [(
            "--bin router".to_string(),
            [
                "test",
                "--locked",
                "--no-fail-fast",
                "--bin",
                "router",
                "deploy_local",
                "--",
                "--nocapture"
            ]
            .map(String::from)
            .to_vec()
        )]
    );
}

#[test]
fn every_declared_target_is_its_own_invocation() {
    let rolling = &AREAS
        .iter()
        .find(|area| area.name == "rolling-updates")
        .unwrap()
        .runs[1];
    let labels: Vec<String> = invocations(rolling)
        .into_iter()
        .map(|(label, _)| label)
        .collect();
    assert_eq!(
        labels,
        rolling
            .targets
            .iter()
            .map(std::string::ToString::to_string)
            .collect::<Vec<_>>()
    );
    for (label, args) in invocations(rolling) {
        let at = args.iter().position(|arg| arg == "--test").expect("--test");
        assert_eq!(args[at + 1], label);
        assert_eq!(args.iter().filter(|arg| *arg == "--test").count(), 1);
    }
}

/// Issue #655: a failing first target no longer hides the others, and a
/// target that produced no `test result:` line is named, not omitted.
#[test]
fn a_failing_first_target_does_not_hide_the_rest() {
    const AREA: Area = Area {
        name: "fixture",
        covers: "fixture",
        enable: "nothing",
        runs: &[tests(&[
            "first_fails",
            "second_passes",
            "third_never_reports",
        ])],
    };
    let directory = tempfile::tempdir().unwrap();
    let mut seen = Vec::new();
    let area = verify_with(&AREA, directory.path(), None, |args| {
        let target = args[args.iter().position(|arg| arg == "--test").unwrap() + 1].clone();
        seen.push(target.clone());
        match target.as_str() {
            "first_fails" => (
                false,
                "test result: FAILED. 1 passed; 2 failed; 0 ignored\n".into(),
            ),
            "second_passes" => (
                true,
                "test result: ok. 8 passed; 0 failed; 0 ignored\n".into(),
            ),
            _ => (false, "error: could not compile\n".into()),
        }
    });
    assert_eq!(
        seen,
        ["first_fails", "second_passes", "third_never_reports"]
    );
    assert_eq!(area["status"], "failed");
    assert_eq!(area["passed"], 9);
    assert_eq!(area["failed"], 2);
    assert_eq!(area["not_run"], json!(["third_never_reports"]));
    let statuses: Vec<&str> = area["targets"]
        .as_array()
        .unwrap()
        .iter()
        .map(|target| target["status"].as_str().unwrap())
        .collect();
    assert_eq!(statuses, ["failed", "proven", "not-run"]);
    let (areas_not_run, targets_not_run) = unexecuted(&[area]);
    assert!(areas_not_run.is_empty());
    let line = summary(
        false,
        true,
        0,
        &areas_not_run,
        &targets_not_run,
        Path::new("r.json"),
    );
    assert!(
        line.contains("targets_not_run=1 (fixture/third_never_reports)"),
        "{line}"
    );
}

/// Issue #654: areas that never ran are counted and named in the summary,
/// separately from skipped tests.
#[test]
fn areas_that_never_ran_are_named_in_the_summary() {
    let reason = "client preparation did not complete";
    let areas = [
        json!({"name": "catalogs", "ran": true, "skipped": [{"test": "a"}, {"test": "b"}], "not_run": []}),
        json!({"name": "real-clients", "ran": false, "reason": reason, "skipped": [], "not_run": []}),
        json!({"name": "staging", "ran": false, "reason": reason, "skipped": [], "not_run": []}),
    ];
    let (areas_not_run, targets_not_run) = unexecuted(&areas);
    assert_eq!(areas_not_run.len(), 2);
    assert_eq!(areas_not_run[0]["reason"], reason);
    let line = summary(
        false,
        false,
        2,
        &areas_not_run,
        &targets_not_run,
        Path::new("r.json"),
    );
    assert_eq!(
        line,
        "verification parity=false failed=false skipped=2 areas_not_run=2 (real-clients, staging) targets_not_run=0 result=r.json"
    );
}
