// Finite genuine-edition probe: source constants and TryFrom inside records.
import {readFileSync,writeFileSync} from 'node:fs';
import {translateProject} from '../../tools/translation/project.mjs';
import {repositorySourceURL} from '../../tools/translation/test/fixtures/repository-paths.mjs';
const root=new URL('../../',import.meta.url);
const source=`pub struct Converted{before:u8,converted:i64,after:u8}
pub fn convert(value:u64)->Converted{
 Converted{before:7,converted:i64::try_from(value).unwrap_or(-3),after:9}
}
pub fn maximum()->Converted{Converted{before:7,converted:i64::MAX,after:9}}
pub fn minimum()->Converted{Converted{before:7,converted:i64::MIN,after:9}}`;
const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],
 readSource:()=>source,cargoManifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8')});
writeFileSync('ci-logs/issue-784-restart-2/current-numeric-record-probe.json',
 JSON.stringify({source,result})+'\n',{flag:'wx'});
console.log(JSON.stringify({refused:result.meta.refused,typescript:result.typescript}));
