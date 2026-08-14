//! Local stop-sequence enforcement for backends that cannot accept `stop`.

use serde_json::Value;

/// Incremental matcher that withholds only the tail which might begin a stop
/// sequence, so a match split across arbitrary SSE chunks is never leaked.
#[derive(Clone, Debug, Default)]
pub struct StopSequenceFilter {
    sequences: Vec<String>,
    pending: String,
    stopped: bool,
}

impl StopSequenceFilter {
    #[must_use]
    pub fn new(sequences: Vec<String>) -> Self {
        Self {
            sequences: sequences
                .into_iter()
                .filter(|sequence| !sequence.is_empty())
                .collect(),
            pending: String::new(),
            stopped: false,
        }
    }

    #[must_use]
    pub fn enabled(&self) -> bool {
        !self.sequences.is_empty()
    }

    /// Return safe visible text and the matched sequence, if this chunk stops
    /// generation. Calls after a match return no text.
    pub fn push(&mut self, text: &str) -> (String, Option<String>) {
        if self.stopped {
            return (String::new(), None);
        }
        self.pending.push_str(text);
        let matched = self
            .sequences
            .iter()
            .filter_map(|sequence| self.pending.find(sequence).map(|index| (index, sequence)))
            .min_by_key(|(index, _)| *index)
            .map(|(index, sequence)| (index, sequence.clone()));
        if let Some((index, sequence)) = matched {
            let visible = self.pending[..index].to_string();
            self.pending.clear();
            self.stopped = true;
            return (visible, Some(sequence));
        }

        let retain = self
            .pending
            .char_indices()
            .map(|(index, _)| &self.pending[index..])
            .chain(std::iter::once(self.pending.as_str()))
            .filter(|suffix| {
                !suffix.is_empty()
                    && self
                        .sequences
                        .iter()
                        .any(|sequence| sequence.starts_with(*suffix))
            })
            .map(str::len)
            .max()
            .unwrap_or(0);
        let split = self.pending.len() - retain;
        let visible = self.pending[..split].to_string();
        self.pending.drain(..split);
        (visible, None)
    }

    /// Flush withheld text when generation finishes without a match.
    pub fn finish(&mut self) -> String {
        if self.stopped {
            return String::new();
        }
        std::mem::take(&mut self.pending)
    }
}

#[must_use]
pub fn from_value(value: Option<&Value>) -> Vec<String> {
    match value {
        Some(Value::String(sequence)) => vec![sequence.clone()],
        Some(Value::Array(sequences)) => sequences
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect(),
        _ => Vec::new(),
    }
}

/// Apply stop semantics to a buffered string and return the matched sequence.
pub fn truncate(text: &mut String, sequences: &[String]) -> Option<String> {
    let (index, sequence) = sequences
        .iter()
        .filter(|sequence| !sequence.is_empty())
        .filter_map(|sequence| text.find(sequence).map(|index| (index, sequence)))
        .min_by_key(|(index, _)| *index)?;
    text.truncate(index);
    Some(sequence.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_a_stop_split_across_chunks_without_leaking_its_prefix() {
        let mut filter = StopSequenceFilter::new(vec!["<END>".into()]);
        assert_eq!(filter.push("hello <E"), ("hello ".into(), None));
        assert_eq!(
            filter.push("ND> ignored"),
            (String::new(), Some("<END>".into()))
        );
        assert_eq!(filter.push("more"), (String::new(), None));
        assert!(filter.finish().is_empty());
    }

    #[test]
    fn unicode_tail_is_held_on_a_character_boundary() {
        let mut filter = StopSequenceFilter::new(vec!["終わり".into()]);
        let (visible, matched) = filter.push("回答は終");
        assert_eq!(visible, "回答は");
        assert!(matched.is_none());
        let (visible, matched) = filter.push("わり後");
        assert!(visible.is_empty());
        assert_eq!(matched.as_deref(), Some("終わり"));
    }
}
