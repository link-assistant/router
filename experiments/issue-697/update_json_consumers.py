from pathlib import Path
import re
for p in Path('tests').rglob('*.rs'):
    s=p.read_text()
    s=re.sub(r'serde_json::from_slice\((&[A-Za-z_][A-Za-z_0-9]*\.stdout)\)',r'link_assistant_router::contracts::validation::cli_payload(\1)',s)
    # File-local variables explicitly decoded from a CLI's stdout.
    for match in list(re.finditer(r'(?:let|let mut) (\w+) = (?:String::from_utf8[^;]+\.stdout|std::str::from_utf8\(&\w+\.stdout)[^;]*;',s)):
        name=match[1]
        s=s.replace('serde_json::from_str(&'+name+')','link_assistant_router::contracts::validation::cli_payload('+name+'.as_bytes())')
    p.write_text(s)
