#!/usr/bin/env python3
"""Compile the real pure selection function separately on memory-limited hosts."""
from pathlib import Path
import subprocess
import tempfile

source = Path('src/clients/catalog.rs').read_text()
start = source.index('pub fn claude_gateway_model(')
end = source.index('\n/// Every model', start)
function = source[start:end]
code = '''mod selection {
#[derive(Clone)]
pub struct RouterModel {pub id:String,pub owned_by:String,pub provider_created_at:Option<i64>}
'''+function+'''
}
const ZAI_MODEL_OWNER: &str = "z.ai";
const ANTHROPIC_MODEL_OWNER: &str = "anthropic";
fn main() {
    use selection::*;
    let row = |id:&str,created| RouterModel { id:id.into(),owned_by:"z.ai".into(),provider_created_at:Some(created)};
    let catalog=vec![row("glm-5.3",10),row("glm-5.3-flash",20)];
    assert_eq!(claude_gateway_model(&catalog,None).as_deref(),Some("glm-5.3"));
    assert_eq!(claude_gateway_model(&catalog,Some("glm-5.3-flash")).as_deref(),Some("glm-5.3-flash"));
    let absent=vec![row("glm-5.3-flash",20)];
    assert_eq!(claude_gateway_model(&absent,None).as_deref(),Some("glm-5.3-flash"));
    let mut mixed=catalog.clone();
    mixed.push(RouterModel{id:"claude-native".into(),owned_by:"anthropic".into(),provider_created_at:None});
    assert_eq!(claude_gateway_model(&mixed,None),None);
    println!("flagship, explicit Flash, absent flagship and mixed native default passed");
}
'''
with tempfile.TemporaryDirectory(prefix='router-default-') as directory:
    directory=Path(directory)
    path=directory/'probe.rs'
    path.write_text(code)
    subprocess.run(['rustc','--edition=2024',str(path),'-o',str(directory/'probe')],check=True)
    subprocess.run([str(directory/'probe')],check=True)
