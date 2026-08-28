//! Per-record budget arithmetic and record reconciliation.
//!
//! Split from `storage.rs` to keep that file within the repository's
//! 1000-line limit. These are pure functions over a [`TokenRecord`]: they
//! decide whether a request fits the record's bounds and how two copies of
//! one record reconcile, with no knowledge of how records are stored.

use super::{RequestAdmission, TokenRecord};

pub(super) fn consume_request(record: Option<&mut TokenRecord>) -> bool {
    let Some(record) = record else {
        return true;
    };
    if record
        .max_requests
        .is_some_and(|max| record.used_requests >= max)
    {
        return false;
    }
    record.used_requests = record.used_requests.saturating_add(1);
    true
}

/// Apply every pre-request control, reserving `reserve` tokens against the spend cap.
///
/// The spend check compares `used + reserved + reserve` against `max_tokens`, so a
/// request is only admitted when its own declared output budget still fits. Reserving
/// inside the same locked read-modify-write as the counters is what makes concurrent
/// admissions unable to overshoot together.
pub(super) fn admit_request_reserving(
    record: Option<&mut TokenRecord>,
    now: i64,
    reserve: u64,
) -> RequestAdmission {
    let Some(record) = record else {
        return RequestAdmission::Admitted;
    };
    if record
        .max_requests
        .is_some_and(|max| record.used_requests >= max)
    {
        return RequestAdmission::RequestLimitExceeded;
    }
    if let Some(max) = record.max_tokens {
        let committed = record.used_tokens.saturating_add(record.reserved_tokens);
        // `>= max` (not `>`) keeps an exhausted budget rejecting even when the
        // request declares no output budget of its own.
        if committed >= max || committed.saturating_add(reserve) > max {
            return RequestAdmission::TokenLimitExceeded;
        }
    }
    if let Some(max) = record.rate_limit_per_minute {
        if now.saturating_sub(record.rate_window_started_at) >= 60 {
            record.rate_window_started_at = now;
            record.rate_window_requests = 0;
        }
        if record.rate_window_requests >= max {
            return RequestAdmission::RateLimitExceeded;
        }
        record.rate_window_requests = record.rate_window_requests.saturating_add(1);
    }
    record.used_requests = record.used_requests.saturating_add(1);
    record.reserved_tokens = record.reserved_tokens.saturating_add(reserve);
    RequestAdmission::Admitted
}

pub(super) const fn add_token_usage(record: Option<&mut TokenRecord>, tokens: u64) {
    if let Some(record) = record {
        record.used_tokens = record.used_tokens.saturating_add(tokens);
    }
}

/// Replace a request's reservation with the usage the upstream actually reported.
///
/// `reserved` is released whether or not the request produced usage, so cancelled
/// requests, upstream errors, and responses with no usage block all free their budget.
/// `actual` is recorded in full even when it exceeds the reservation: the persisted
/// total must stay truthful about what was really spent.
pub(super) const fn settle_token_usage(
    record: Option<&mut TokenRecord>,
    reserved: u64,
    actual: u64,
) {
    if let Some(record) = record {
        record.reserved_tokens = record.reserved_tokens.saturating_sub(reserved);
        record.used_tokens = record.used_tokens.saturating_add(actual);
    }
}

pub(super) fn merge_safer_record(current: &mut TokenRecord, other: &TokenRecord) {
    current.revoked |= other.revoked;
    current.used_requests = current.used_requests.max(other.used_requests);
    current.used_tokens = current.used_tokens.max(other.used_tokens);
    current.reserved_tokens = current.reserved_tokens.max(other.reserved_tokens);
    if other.rate_window_started_at > current.rate_window_started_at {
        current.rate_window_started_at = other.rate_window_started_at;
        current.rate_window_requests = other.rate_window_requests;
    } else if other.rate_window_started_at == current.rate_window_started_at {
        current.rate_window_requests = current.rate_window_requests.max(other.rate_window_requests);
    }
}
