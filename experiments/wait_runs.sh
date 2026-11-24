#!/usr/bin/env bash
# Poll the given run ids until all complete; print conclusions.
repo=link-assistant/router
while :; do
  pending=0; out=""
  for id in "$@"; do
    r=$(gh run view "$id" --repo $repo --json status,conclusion,workflowName --jq '"\(.workflowName)|\(.status)|\(.conclusion)"' 2>/dev/null)
    out+="$id $r"$'\n'
    [[ "$r" == *"|completed|"* ]] || pending=1
  done
  [[ $pending == 0 ]] && { printf '%s' "$out"; exit 0; }
  sleep 120
done
