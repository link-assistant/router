#!/usr/bin/env python3
"""Compare hosted Linux coverage artifacts and classify files by Git blob ID."""

import argparse
import csv
import json
import posixpath
import subprocess
import zipfile


def read_report(archive):
    with zipfile.ZipFile(archive) as report:
        summary = next(name for name in report.namelist() if name.endswith(".json"))
        data = json.loads(report.read(summary))["data"][0]
    # Hosted jobs use different checkout roots, and the summary can include
    # both rust/src/... and rust/../tools/.... Work with Git-relative paths.
    source = next(
        file["filename"] for file in data["files"] if "/rust/src/" in file["filename"]
    )
    root = source.rpartition("/rust/src/")[0]
    files = {
        posixpath.relpath(posixpath.normpath(file["filename"]), root):
        file["summary"]["lines"]
        for file in data["files"]
    }
    return data["totals"]["lines"], files


def read_tree(revision):
    ls_tree = subprocess.check_output(["git", "ls-tree", "-rz", revision])
    blobs = {}
    for entry in ls_tree.decode().split("\0"):
        if entry:
            metadata, path = entry.split("\t", 1)
            blobs[path] = metadata.split()[-1]
    return blobs


def compare(base_files, head_files, base_tree, head_tree):
    empty = {"covered": 0, "count": 0}
    for path in sorted(base_files.keys() | head_files.keys()):
        if path not in base_tree and path not in head_tree:
            raise ValueError(f"Coverage file is missing from both Git trees: {path}")
        if path not in base_tree:
            status = "added"
        elif path not in head_tree:
            status = "removed"
        elif base_tree[path] == head_tree[path]:
            status = "unchanged"
        else:
            status = "changed"
        base = base_files.get(path, empty)
        head = head_files.get(path, empty)
        yield status, path, base["covered"], base["count"], head["covered"], head["count"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_archive")
    parser.add_argument("head_archive")
    parser.add_argument("base_sha")
    parser.add_argument("head_sha")
    parser.add_argument("--details", help="Write per-file counts to a TSV")
    args = parser.parse_args()
    base, base_files = read_report(args.base_archive)
    head, head_files = read_report(args.head_archive)
    base_tree, head_tree = read_tree(args.base_sha), read_tree(args.head_sha)
    rows = list(compare(base_files, head_files, base_tree, head_tree))

    for label, lines in [("Base", base), ("Head", head)]:
        print(f"{label}: {lines['covered']:,}/{lines['count']:,} = {lines['percent']:.8f}%")
    print(f"Delta: {head['percent'] - base['percent']:+.8f} percentage points")
    for status in ("unchanged", "changed", "added", "removed"):
        group = [row[2:] for row in rows if row[0] == status]
        if group:
            bc, bt, hc, ht = map(sum, zip(*group))
            print(f"{status:9} {len(group):3} files: {bc:,}/{bt:,} → {hc:,}/{ht:,} covered")
    if args.details:
        with open(args.details, "w", encoding="utf-8", newline="") as output:
            writer = csv.writer(output, delimiter="\t")
            writer.writerow(
                ("source", "path", "base covered", "base lines", "head covered", "head lines")
            )
            writer.writerows(rows)


if __name__ == "__main__":
    main()
