// Finite regression probe for the complete CI constructor diagnostic.
import {writeFileSync} from 'node:fs';
import {translateSource} from '../../tools/translation/translate.mjs';
const source=`pub enum Provider{First,Second}
pub enum State{Unverified}
pub struct Pool{count:u8}
pub struct Usage{provider:Provider,state:State,status:String,pool:Option<Pool>}
pub fn empty_usage(provider:Provider)->Usage{
 Usage{provider,state:State::Unverified,status:"unverified".into(),pool:None}
}`;
const result=translateSource(source,'src/record-field-regression.rs');
writeFileSync('ci-logs/issue-784-restart-2/current-record-field-emission.json',
 JSON.stringify({source,result})+'\n',{flag:'wx'});
console.log(JSON.stringify({counts:result.ir.counts,typescript:result.typescript,
 diagnostics:result.ir.items.filter(row=>row.status!=='executable')}));
