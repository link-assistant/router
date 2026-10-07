#!/usr/bin/env python3
"""Resolve an existing immutable release and require its successful delivery gates."""
import argparse
import json
from pathlib import Path
import re
import subprocess


def run(*args):
    return subprocess.check_output(args, text=True).strip()


def validate_run(record, jobs, repository, version, commit):
    if record.get("head_sha") != commit or record.get("path") != ".github/workflows/release.yml" or record.get("repository", {}).get("full_name") != repository:
        raise ValueError("source run must be this repository's exact tagged release workflow")
    if record.get("head_branch") != f"v{version}" or record.get("event") != "workflow_dispatch":
        raise ValueError("source run must use the immutable release tag")
    for required in ["Verify published release provenance", "Verify macOS client lifecycle"]:
        matching = [job for job in jobs if job.get("name") == required]
        if len(matching) != 1 or matching[0].get("conclusion") != "success":
            raise ValueError(f"source run did not successfully complete {required}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--source-run", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not re.fullmatch(r"\d+\.\d+\.\d+", args.version) or not re.fullmatch(r"\d+", args.source_run):
        raise ValueError("retry requires an exact stable version and numeric source run")
    tag = f"refs/tags/v{args.version}"
    run("git", "fetch", "origin", "tag", f"v{args.version}")
    commit = run("git", "rev-parse", f"{tag}^{{commit}}")
    record = json.loads(run("gh", "api", f"repos/{args.repository}/actions/runs/{args.source_run}"))
    pages = json.loads(run("gh", "api", f"repos/{args.repository}/actions/runs/{args.source_run}/jobs?per_page=100", "--paginate", "--slurp"))
    validate_run(record, [job for page in pages for job in page["jobs"]], args.repository, args.version, commit)
    release = json.loads(run("gh", "release", "view", f"v{args.version}", "--repo", args.repository, "--json", "isDraft,assets"))
    if release["isDraft"] or not release["assets"]:
        raise ValueError("retry requires an existing non-draft release with attested assets")
    with args.output.open("a") as output:
        output.write(f"version={args.version}\ncommit={commit}\n")
    print(f"Retry v{args.version} at {commit} using successful source gates from {args.source_run}")


if __name__ == "__main__":
    main()
