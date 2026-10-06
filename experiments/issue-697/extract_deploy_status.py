#!/usr/bin/env python3
"""Keep the coordinator below the repository's 1,000-line Rust-file limit."""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
source = root / "src/deploy_local.rs"
target = root / "src/deploy_local/status_report.rs"
text = source.read_text()
start = text.index("    fn print_status(")
end = text.index("    fn preflight(", start)
methods = text[start:end].replace("    fn print_status(", "    pub(super) fn print_status(")
methods = methods.replace("    fn print_interrupted(", "    pub(super) fn print_interrupted(")
methods = methods.replace("status_report::blocker", "blocker")
source.write_text(text[:start] + text[end:])
report = target.read_text().replace("use super::Coordinator;", "use super::{Coordinator, Existing, LEGACY, RELAY, data_backup, state::{PreviousKind, Transaction}};")
report += "\nimpl Coordinator<'_> {\n" + methods + "}\n"
target.write_text(report)
