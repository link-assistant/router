use super::*;

fn tracker() -> (tempfile::TempDir, ManagementAccess, IpAddr, Instant) {
    let dir = tempfile::tempdir().unwrap();
    let tracker = ManagementAccess::new(dir.path());
    tracker.configure(ManagementConfig {
        lockout_failures: 3,
        lockout_secs: 10,
        ..ManagementConfig::default()
    });
    (
        dir,
        tracker,
        "198.51.100.10".parse().unwrap(),
        Instant::now(),
    )
}

#[test]
fn success_resets_counter_and_the_threshold_request_creates_a_ban() {
    let (_dir, tracker, ip, now) = tracker();
    assert!(tracker.failure_at(ip, now).is_none());
    assert!(tracker.failure_at(ip, now).is_none());
    tracker.success(ip);
    assert!(tracker.failure_at(ip, now).is_none());
    assert!(tracker.failure_at(ip, now).is_none());
    assert!(tracker.failure_at(ip, now).is_some());
    assert_eq!(tracker.check_at(ip, now), Some(10));
    tracker.success(ip);
    assert_eq!(tracker.check_at(ip, now), Some(10));
    assert_eq!(
        tracker.check_at("198.51.100.11".parse().unwrap(), now),
        None
    );
}

#[test]
fn ban_expires_without_retry_extension_and_rounds_retry_after_up() {
    let (_dir, tracker, ip, now) = tracker();
    for _ in 0..3 {
        tracker.failure_at(ip, now);
    }
    assert_eq!(
        tracker.check_at(ip, now + Duration::from_millis(1500)),
        Some(9)
    );
    assert!(
        tracker
            .failure_at(ip, now + Duration::from_secs(9))
            .is_none()
    );
    assert_eq!(tracker.check_at(ip, now + Duration::from_secs(10)), None);
    assert!(
        tracker
            .failure_at(ip, now + Duration::from_secs(10))
            .is_none()
    );
    assert!(
        tracker
            .failure_at(ip, now + Duration::from_secs(10))
            .is_none()
    );
    assert!(
        tracker
            .failure_at(ip, now + Duration::from_secs(10))
            .is_some()
    );
}

#[test]
fn idle_failure_counters_expire() {
    let (_dir, tracker, ip, now) = tracker();
    tracker.failure_at(ip, now);
    tracker.failure_at(ip, now);
    assert!(
        tracker
            .failure_at(ip, now + Duration::from_secs(10))
            .is_none()
    );
}

#[test]
fn loopback_exemption_disabled_lockout_and_mapped_addresses() {
    for config in [
        ManagementConfig::default(),
        ManagementConfig {
            lockout_failures: 0,
            exempt_loopback: false,
            ..ManagementConfig::default()
        },
        ManagementConfig {
            lockout_secs: 0,
            exempt_loopback: false,
            ..ManagementConfig::default()
        },
    ] {
        let dir = tempfile::tempdir().unwrap();
        let tracker = ManagementAccess::new(dir.path());
        tracker.configure(config);
        for ip in ["127.0.0.1", "::1", "::ffff:127.0.0.1"] {
            for _ in 0..6 {
                assert!(tracker.failure(ip.parse().unwrap()).is_none());
            }
            assert_eq!(tracker.check(ip.parse().unwrap()), None);
        }
        assert!(tracker.attempts.lock().unwrap().is_empty());
    }
    assert_eq!(
        normalize_ip("::ffff:198.51.100.10".parse().unwrap()),
        "198.51.100.10".parse::<IpAddr>().unwrap()
    );
}

#[test]
fn tracker_capacity_cannot_evict_bans_and_recovers_after_expiry() {
    let (_dir, tracker, banned_ip, now) = tracker();
    for _ in 0..3 {
        tracker.failure_at(banned_ip, now);
    }
    for offset in 1..MAX_CLIENTS {
        let ip = IpAddr::V4(std::net::Ipv4Addr::from(u32::try_from(offset).unwrap()));
        tracker.failure_at(ip, now);
    }
    let new_ip = "203.0.113.99".parse().unwrap();
    assert_eq!(tracker.check_at(new_ip, now), Some(1));
    tracker.failure_at(new_ip, now);
    assert_eq!(tracker.attempts.lock().unwrap().len(), MAX_CLIENTS);
    assert_eq!(tracker.check_at(banned_ip, now), Some(10));
    assert_eq!(
        tracker.check_at(new_ip, now + Duration::from_secs(10)),
        None
    );
    assert!(tracker.attempts.lock().unwrap().is_empty());
}

#[test]
fn concurrent_failures_create_one_ban_without_extending_it() {
    let (_dir, tracker, ip, now) = tracker();
    let created = std::thread::scope(|scope| {
        let handles: Vec<_> = (0..16)
            .map(|_| scope.spawn(|| tracker.failure_at(ip, now)))
            .collect();
        handles
            .into_iter()
            .filter_map(|handle| handle.join().unwrap())
            .count()
    });
    assert_eq!(created, 1);
    assert_eq!(tracker.active_bans().len(), 1);
}

#[test]
fn diagnostic_snapshot_has_no_credentials_and_expires_with_injected_clock() {
    let (dir, tracker, ip, now) = tracker();
    let mut context = crate::operation_context::OperationContext {
        now: chrono::DateTime::from_timestamp(100, 0),
        ..Default::default()
    };
    context.scope(|| {
        for _ in 0..3 {
            tracker.failure_at(ip, now);
        }
        let report = doctor_report(&[dir.path().to_path_buf()]);
        assert!(
            report.contains("ip=198.51.100.10 retry_after=10s"),
            "{report}"
        );
        assert!(dir.path().join(SNAPSHOT).exists());
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            assert_eq!(
                std::fs::metadata(dir.path().join(SNAPSHOT))
                    .unwrap()
                    .permissions()
                    .mode()
                    & 0o777,
                0o600
            );
        }
        // Loading claims to run doctor must not overwrite the serving snapshot.
        let _ = crate::admin::AdminClaim::load(None, dir.path(), Duration::from_secs(60));
        assert!(!doctor_report(&[dir.path().to_path_buf()]).is_empty());
    });
    context.now = chrono::DateTime::from_timestamp(110, 0);
    context.scope(|| assert!(doctor_report(&[dir.path().to_path_buf()]).is_empty()));
    let fresh = ManagementAccess::new(dir.path());
    fresh.configure(ManagementConfig::default());
    assert!(!dir.path().join(SNAPSHOT).exists());
    assert_eq!(fresh.check(ip), None);
}
