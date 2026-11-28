//! Per-lane usage and cooldown observation for accepted WebSocket turns.
use super::{UpstreamTarget, Value};
use crate::output_limit::{ResponsesEventLimit, ResponsesFrame};
use std::collections::{HashMap, VecDeque};

struct Turn {
    tracker: crate::usage::UsageTracker,
    observer: Option<crate::pool_stream_limits::StreamLimits>,
    output: ResponsesEventLimit,
}

pub(super) struct TurnTracking {
    by_lane: HashMap<Option<String>, VecDeque<Turn>>,
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
        output_limit: Option<u64>,
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
        self.by_lane.entry(lane).or_default().push_back(Turn {
            tracker,
            observer,
            output: ResponsesEventLimit::new(output_limit),
        });
    }

    pub(super) fn observe(&mut self, value: &mut Value, bytes: &[u8]) -> ResponsesFrame {
        let event_type = value
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let terminal = matches!(
            event_type,
            "response.completed" | "response.incomplete" | "response.failed" | "error"
        );
        let lane = super::stream_id(value);
        let Some(queue) = self.by_lane.get_mut(&lane) else {
            return ResponsesFrame::Forward;
        };
        if !terminal {
            return queue
                .front_mut()
                .map_or(ResponsesFrame::Forward, |turn| turn.output.apply(value));
        }
        let frame = if let Some(mut turn) = queue.pop_front() {
            turn.tracker.feed(bytes);
            if let Some(observer) = turn.observer {
                observer.observe_event(value);
            }
            turn.output.apply(value)
        } else {
            ResponsesFrame::Forward
        };
        if queue.is_empty() {
            self.by_lane.remove(&lane);
        }
        frame
    }
}
