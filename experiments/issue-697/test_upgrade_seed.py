#!/usr/bin/env python3
"""Exercise the real upgrade fixture with the default provider network policy."""

import argparse
import os
from pathlib import Path
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--router", default="target/debug/router")
    parser.add_argument("--verify-router", help="Also verify this binary against the seeded release state")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    router = Path(args.router).resolve()
    env = dict(os.environ)
    for name in (
        "UPSTREAM_ALLOW_PRIVATE_NETWORKS",
        "LINK_ASSISTANT_ROUTER_SERVER",
        "LINK_ASSISTANT_ROUTER_TOKEN",
    ):
        env.pop(name, None)
    with tempfile.TemporaryDirectory() as state:
        result = subprocess.run(
            ["bash", str(root / "scripts/upgrade-matrix.sh"), "seed", str(router), state],
            env=env, capture_output=True, text=True, timeout=30,
        )
        assert result.returncode == 0, result.stderr
        for filename in ("data/providers.lenv", "data/tokens.lino", "tokens.env"):
            assert (Path(state) / filename).is_file(), filename
        if args.verify_router:
            result = subprocess.run(
                ["bash", str(root / "scripts/upgrade-matrix.sh"), "verify",
                 str(Path(args.verify_router).resolve()), state],
                env=env, capture_output=True, text=True, timeout=60,
            )
            assert result.returncode == 0, result.stderr
    print(f"upgrade fixture seeded successfully with {router}")


if __name__ == "__main__":
    main()
