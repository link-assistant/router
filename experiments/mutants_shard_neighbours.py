"""Bracket the mutants of a shard whose runner died, using its neighbours.

cargo-mutants `--sharding round-robin --no-shuffle` gives global mutant i to
shard i % N, in source order. A lost shard uploads no `mutants.json`, but its
j-th mutant lies between the j-th mutants of the shards on either side.

usage: python3 -I mutants_shard_neighbours.py <artifacts-dir> <lost-shard>
"""
import json
import sys
from pathlib import Path


def name(mutant):
    first = mutant["diff"].split("\n", 2)
    return f'{first[0][4:]} :: {first[1][4:]}'


def load(root, shard):
    path = Path(root) / f"mutants-shard-{shard}" / "mutants.json"
    return [name(m) for m in json.loads(path.read_text())] if path.exists() else None


root, lost = sys.argv[1], int(sys.argv[2])
before, after = load(root, lost - 1), load(root, lost + 1)
for j in range(max(len(before or []), len(after or []))):
    print(f"[{j}] after : {before[j] if before and j < len(before) else '?'}")
    print(f"     before: {after[j] if after and j < len(after) else '?'}")
