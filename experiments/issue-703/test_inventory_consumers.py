"""Audit every subprocess token inventory consumer for the canonical decoder."""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
for name, expected_calls in {"host_migrate.rs": 2, "preservation.rs": 1,
                             "deploy_token.rs": 1, "inventory.rs": 1, "secret.rs": 1}.items():
    source = (root / "src/deploy_local" / name).read_text()
    assert "serde_json::from_str" not in source or name == "preservation.rs", name
    assert source.count("decode_token_inventory(") == expected_calls, name
print("Every deployment inventory consumer uses typed envelope decoding")
