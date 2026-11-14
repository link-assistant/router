"""Add bounded shared cases for every ProtoJSON spelling of retrieval location."""
import json
from pathlib import Path
path = Path('parity/fixtures/geolocation.json')
source = path.read_text()
cases = []
for config in ['toolConfig', 'tool_config']:
    for retrieval in ['retrievalConfig', 'retrieval_config']:
        for location in ['latLng', 'lat_lng']:
            payload = {config: {retrieval: {location: {'latitude': 51.5, 'longitude': -0.12}, 'languageCode': 'en'}},
                       'tools': [{'googleMaps': {}}], 'metadata': {'latLng': 'application value'}}
            expected = json.loads(json.dumps(payload))
            del expected[config][retrieval][location]
            cases.append({'name': f'Gemini ProtoJSON {config}/{retrieval}/{location}', 'input': payload, 'expected': expected})
# Keep the existing source and independent expected values reviewable.
assert all(case['name'] not in source for case in cases)
anchor = '\n  ]\n}'
assert source.count(anchor) == 1
source = source.replace(anchor, ',\n' + ',\n'.join('    ' + json.dumps(case) for case in cases) + anchor)
path.write_text(source)
