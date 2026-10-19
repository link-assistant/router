//! Per-lane usage and cooldown observation for accepted WebSocket turns.
use super::{UpstreamTarget, Value};
use std::collections::{HashMap, VecDeque};

pub(super) struct TurnTracking {
    by_lane: HashMap<
        Option<String>,
        VecDeque<(
            crate::usage::UsageTracker,
            Option<crate::pool_stream_limits::StreamLimits>,
        )>,
    >,
}

impl TurnTracking {
    pub(super) fn new() -> Self {
        Self {
            by_lane: HashMap::new(),
        }
    }

    pub(super) fn push(
        &mut self,
        lane: Option<String>,
        tracker: crate::usage::UsageTracker,
        target: &UpstreamTarget,
        event: &Value,
    ) {
        let observer = target.pool.as_ref().map(|(router, account)| {
            crate::pool_stream_limits::StreamLimits::new(
                router.clone(),
                account.clone(),
                event
                    .get("model")
                    .and_then(Value::as_str)
                    .map(str::to_string),
            )
        });
        self.by_lane
            .entry(lane)
            .or_default()
            .push_back((tracker, observer));
    }

    pub(super) fn feed_terminal(&mut self, value: &Value, bytes: &[u8]) {
        let event_type = value
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or_default();
        if !matches!(
            event_type,
            "response.completed" | "response.incomplete" | "response.failed" | "error"
        ) {
            return;
        }
        let lane = value
            .get("stream_id")
            .and_then(Value::as_str)
            .map(str::to_string);
        let remove_lane = self.by_lane.get_mut(&lane).is_some_and(|queue| {
            if let Some((mut tracker, observer)) = queue.pop_front() {
                tracker.feed(bytes);
                if let Some(observer) = observer {
                    observer.observe_event(value);
                }
            }
            queue.is_empty()
        });
        if remove_lane {
            self.by_lane.remove(&lane);
        }
    }
}
