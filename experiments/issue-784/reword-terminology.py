#!/usr/bin/env python3
"""Issue #784: reword authored prose that scripts/check-terminology.rs rejects.

In these translation-lane documents "graph" names the Rust crate's module graph
(built by `resolveModuleGraph` in tools/translation/project.mjs), so the
default rewording is "module graph", an allowed phrase. Uses that mean
something else get an exact, reviewed replacement first. Only lines that the
scan reports (`terminology-scan.mjs --hits`) are touched.
Usage: python3 experiments/issue-784/reword-terminology.py <hits-file>
"""
import re
import sys

SPECIAL = {
    '.changes/issue-759-csv-original-context-resource-draft.md': [('fullgraph', 'full module graph')],
    '.changes/issue-759-reverse-string-iterator-draft.md': [('fullgraph', 'full module graph')],
    '.changes/issue-759-formatter-continuation-source-draft.md': [('continuation graph', 'continuation structure')],
    '.changes/issue-759-inferred-scalar-tuples-draft.md': [('checked declaration graph', 'checked declaration table')],
    '.changes/issue-759-serde-success-frontier.md': [('control-flow/interpolation graph', 'control-flow/interpolation structure')],
    '.changes/issue-759-inferred-tuple-source-closure-fixture.md': [('helper/consumer graph', 'helper/consumer call graph')],
    'docs/case-studies/issue-759/current/source-tuples-fe422f75/README.md': [('helper/consumer graph', 'helper/consumer call graph')],
    'docs/case-studies/issue-759/current/canonical-recovery/README.md': [('complete-graph benchmark', 'complete module graph benchmark')],
    'docs/case-studies/issue-784/ci-0e234-terminal-20261111.md': [('full-graph residual', 'full module graph residual')],
    'docs/case-studies/issue-784/ci-beda-terminal-20261111.md': [('full-graph residual', 'full module graph residual')],
    'docs/case-studies/issue-784/current-operation-size-measurements.md': [('whole-graph eligibility', 'whole module graph eligibility')],
    'docs/case-studies/issue-784/core-hook-receiving-20261110.md': [
        ('(`core-transport-receiving-node-graph.log:237`)', '(line 237 of the Node receiving log)')],
    'docs/case-studies/issue-784/current-proof-consumer-graph.md': [
        ('The [complete evidence packet](evidence/current-proof-consumer-graph.json.gz)',
         'The complete evidence packet in [`evidence/`](evidence/) (SHA256 `08d244a2…f411`)'),
        ('# Current complete proof consumer graph', '# Current complete proof consumer module graph')],
    'experiments/issue-784/current-proof-consumer-plan.md': [
        ('in `current-proof-consumer-graph.json.gz` (102,527 bytes,',
         'in the case study\'s proof-consumer evidence packet (102,527 bytes,')],
    'docs/case-studies/issue-784/project-source-origin-cst.md': [
        ('`resolveModuleGraph`', 'the module graph resolver of `tools/translation/project.mjs`')],
    'docs/case-studies/issue-784/current-compiler-cost-investigation.md': [('the current import graph', 'the current module graph')],
    'docs/case-studies/issue-784/standard-source-research-20261110.md': [('graph-ingress case', 'module graph ingress case')],
    'docs/development/namespace-priority-20261021.md': [
        ('The reduced-graph source', 'The `rustc_resolve/src/build_reduced_graph.rs` source'),
        ('with graph-root MacroNS', 'with `graph_root` MacroNS')],
    'docs/development/builtin-canonical-table-candidate-20261021.md': [
        ('final full graph re-encoding', 'final full object graph re-encoding'),
        ('reconstructed value graph', 'reconstructed object graph'),
        ('256-node graphs', '256-node object graphs')],
    'docs/development/builtin-source-meta-string-keys.md': [('the entire graph', 'the entire object graph')],
    'docs/development/negative-budget-proof-json-20261021.md': [
        ('encodes the graph', 'encodes the object graph'), ('graph again', 'object graph again')],
    'docs/development/native-portable-body-drafts.md': [('original-graph validation', 'original module graph validation')],
    'docs/development/concrete-syntax-bulk.md': [
        ('an exact own-data `{constructorGraph}` object', 'an exact own-data options object naming the constructor producer')],
    'tools/translation/js-to-rust/README.md': [
        ('producer graph at `parseMeta(text, {constructorGraph})`', 'producer module graph, passed in the options of `parseMeta(text, options)`')],
    'docs/development/manual-translation-development.md': [('automation caller graph', 'automation call graph')],
    'docs/development/owned-unit-matches.md': [('Real project-graph end observations', 'Real module graph stage end observations')],
    'experiments/issue-784/plan.md': [('module-graph construction', 'module graph construction')],
}

DEFAULT = re.compile(r'(?<![A-Za-z_\-])(?<!module )(?<!object )(?<!call )([Gg])raph(s?)(?![A-Za-z_])')


def default(match):
    module = 'Module' if match.group(1) == 'G' else 'module'
    return f'{module} graph{match.group(2)}'


hits = {}
for row in open(sys.argv[1], encoding='utf-8'):
    m = re.match(r'\./(.+?):(\d+): ', row)
    if m:
        hits.setdefault(m.group(1), set()).add(int(m.group(2)))

for path, numbers in sorted(hits.items()):
    lines = open(path, encoding='utf-8').read().split('\n')
    for number in sorted(numbers):
        line = lines[number - 1]
        for old, new in SPECIAL.get(path, []):
            line = line.replace(old, new)
        lines[number - 1] = DEFAULT.sub(default, line)
    open(path, 'w', encoding='utf-8').write('\n'.join(lines))
    print(path, len(numbers))
