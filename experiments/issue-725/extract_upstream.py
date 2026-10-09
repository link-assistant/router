#!/usr/bin/env python3
"""Extract the five MIT CLIProxyAPI thinking matrices without executing Go."""
import json
import pathlib
import re
import sys

source = pathlib.Path(sys.argv[1]).read_text()
out = pathlib.Path('tests/fixtures/thinking')
out.mkdir(parents=True, exist_ok=True)
functions = {
    'TestThinkingE2EMatrix_Suffix': 'suffix',
    'TestThinkingE2EMatrix_Body': 'body',
    'TestThinkingE2EProviderTargets': 'provider_targets',
    'TestThinkingE2EInteractionsMatrix': 'interactions',
    'TestThinkingE2EClaudeAdaptive_Body': 'claude_adaptive',
}
for function, family in functions.items():
    start = source.index('func ' + function + '(')
    end = source.find('\nfunc ', start + 1)
    section = source[start:end if end >= 0 else None]
    cases = []
    for block in re.findall(r'\n\t\t\{\n(.*?)\n\t\t\},', section, re.S):
        fields = {}
        for key, value in re.findall(r'^\s*(\w+):\s*(.*?)\s*,?\s*$', block, re.M):
            value = value.rstrip(',')
            if value.startswith('`'):
                fields[key] = value[1:-1]
            elif value.startswith('"'):
                fields[key] = json.loads(value)
            elif value.startswith('[]string{'):
                fields[key] = re.findall(r'"([^"]*)"', value)
            elif value in ('true', 'false'):
                fields[key] = value == 'true'
            else:
                raise ValueError((key, value))
        assert 'name' in fields and 'inputJSON' in fields
        fields['input'] = json.loads(fields.pop('inputJSON'))
        cases.append(fields)
    path = out / (family + '.json')
    path.write_text('[\n' + ',\n'.join(json.dumps(case, separators=(',', ':')) for case in cases) + '\n]\n')
    print(f'{family}: {len(cases)} cases; targets {sorted({case["to"] for case in cases})}')
