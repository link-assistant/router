"""Route the remaining operational process calls through the injected runner."""
import re
from pathlib import Path

for name in [
    "src/client_lifecycle.rs", "src/client_lifecycle/active.rs",
    "src/managed_server.rs", "src/platform_keychain.rs",
    "src/clients/doctor.rs", "src/codex_identity.rs",
    "src/deploy_local/host_runtime.rs", "src/tunnel_command.rs",
    "src/with_command.rs",
    "src/codex_loopback_bridge.rs",
]:
    path = Path(name)
    source = path.read_text()
    # These chains are statements containing no earlier semicolon. Restrict
    # the match to the native command constructor, not Docker adapter methods.
    pattern = r"(crate::operation_context::command\([^;]*?)\s*\.(output|status|spawn)\(\)"
    def replace(match):
        chain, method = match.groups()
        if method == "spawn":
            return f"crate::operation_context::spawn_process({chain})"
        call = f"crate::operation_context::process_output({chain})"
        return call + (".map(|output| output.status)" if method == "status" else "")
    source = re.sub(pattern, replace, source)
    path.write_text(source)
