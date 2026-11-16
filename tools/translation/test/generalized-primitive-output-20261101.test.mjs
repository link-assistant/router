// Actual checked primitive-owned Text output cases SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {receiveGeneralizedPrimitiveOutputProfile} from './generalized-primitive-output-20261101-receiving.mjs';
import {proposeGeneralizedOutputProfile,withGeneralizedOutputInstalledSources} from '../generalized-primitive-output-20261101-profile.mjs';
import {DYNAMIC_OUTPUT_FACADE_SOURCE,DYNAMIC_OUTPUT_LEAF_SOURCE,DYNAMIC_OUTPUT_PRODUCTION_OWNERS,DYNAMIC_OUTPUT_ORIGINAL_FACADE_SOURCE} from '../dynamic-primitive-output-20261101-source.mjs';
import {LITERAL_ARGUMENTS_LEAF_SOURCE} from '../literal-arguments-core-20261101-source.mjs';
import {OUTPUT_LITERAL_LEAF_SOURCE} from '../output-literal-core-20261101-source.mjs';
import {PERSISTENT_OUTPUT_LEAF_SOURCE} from '../persistent-output-backend-20261101-source.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),manifest=read('Cargo.toml'),lock=read('Cargo.lock'),limits={timeout:60000};
const source=`pub mod translation_core;
pub fn describe(count:u64,enabled:bool,label:&crate::translation_core::Str){crate::translation_core::output_text_write(false,crate::translation_core::format!("COUNT={count} ok={enabled} {label}\\n"))}
pub fn local(value:&crate::translation_core::Str){let message=crate::translation_core::format!("text={value}\\n");crate::translation_core::output_text_result(false,message)}
pub fn padded(value:&crate::translation_core::Str,number:u64){crate::translation_core::output_text_passthrough(true,crate::translation_core::format!("|{value:界^7.3}|{number:#06x}|"))}
pub fn string_argument(){crate::translation_core::output_text_write(false,crate::translation_core::format!("MESSAGE={}","ORIGINAL_ARG"))}
pub fn argument(){crate::translation_core::output_text_write(true,crate::translation_core::format!("VALUE={}",5_u64))}
pub fn hygienic(String:&crate::translation_core::Str,Math:u64){crate::translation_core::output_text_write(false,crate::translation_core::format!("{String}:{Math}"))}
pub fn order(value:u8,first:u8,second:u8){crate::translation_core::output_text_write(true,crate::translation_core::format!("{} {}",value/first,value%second))}
pub fn multiple(value:u64,label:&crate::translation_core::Str){
 crate::translation_core::output_text_write(false,crate::translation_core::format!("BEGIN={label};"));
 if value>0_u64 {let message=crate::translation_core::format!("POS={value};");crate::translation_core::output_text_result(false,message);} else {crate::translation_core::output_text_result(true,crate::translation_core::format!("ZERO;"));}
 crate::translation_core::output_text_passthrough(true,crate::translation_core::format!("END={label};"));
}
pub fn ranged(limit:u64,label:&crate::translation_core::Str){
 for index in 0_u64..limit {if index==1_u64 {continue;}let value=crate::translation_core::format!("ITER={index};");crate::translation_core::output_text_write(false,value);if index==2_u64 {break;}}
 crate::translation_core::output_text_result(false,crate::translation_core::format!("DONE={label};"));
}
pub fn countdown(count:u64){let mut left=count;while left>0_u64 {crate::translation_core::output_text_write(false,crate::translation_core::format!("LEFT={left};"));left-=1_u64;}crate::translation_core::output_text_result(false,crate::translation_core::format!("STOP;"));}
pub fn early(stop:bool){crate::translation_core::output_text_write(false,crate::translation_core::format!("A;"));if stop {return;}crate::translation_core::output_text_write(false,crate::translation_core::format!("B;"));}
pub fn shadow(value:u64){let value=value+1_u64;crate::translation_core::output_text_write(false,crate::translation_core::format!("OUTER={value};"));if value>0_u64 {let value=value+1_u64;crate::translation_core::output_text_result(false,crate::translation_core::format!("INNER={value};"));}crate::translation_core::output_text_write(false,crate::translation_core::format!("OUTER_AGAIN={value};"));}
pub fn partial(value:u8,divisor:u8){crate::translation_core::output_text_write(false,crate::translation_core::format!("BEFORE;"));crate::translation_core::output_text_write(true,crate::translation_core::format!("AFTER={}",value/divisor));}
pub fn diagnostic(value:u64){crate::translation_core::output_text_write(true,crate::translation_core::format!("D1={value};"));crate::translation_core::output_text_write(true,crate::translation_core::format!("D2={value};"));}
pub fn exclusive(flag:bool){let value=crate::translation_core::format!("OWNED;");if flag {crate::translation_core::output_text_write(false,value);}else{crate::translation_core::output_text_result(true,value);}}
pub fn chosen(flag:bool){crate::translation_core::output_text_write(false,if flag {crate::translation_core::format!("YES;")} else {crate::translation_core::format!("NO;")});}

`;
function request(body=source){return {entry:'src/lib.rs',manifest,lock,files:[{path:'src/lib.rs',source:body},{path:'src/translation_core.rs',source:DYNAMIC_OUTPUT_FACADE_SOURCE},{path:'src/translation_core/dynamic_primitive_output_20261101.rs',source:DYNAMIC_OUTPUT_LEAF_SOURCE},{path:'src/translation_core/literal_arguments_core_20261101.rs',source:LITERAL_ARGUMENTS_LEAF_SOURCE},{path:'src/translation_core/output_literal_core_20261101.rs',source:OUTPUT_LITERAL_LEAF_SOURCE},{path:'src/translation_core/persistent_output_backend_20261101.rs',source:PERSISTENT_OUTPUT_LEAF_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'src/translation_core/ranges.rs',source:ROUTER_CORE_RANGES_SOURCE},{path:'src/translation_core/json_collections.rs',source:ROUTER_CORE_JSON_COLLECTIONS_SOURCE},{path:'src/translation_core/base64.rs',source:ROUTER_CORE_BASE64_SOURCE}]};}
const fixed=value=>({kind:'fixed',value:String(value)}),defaults={captureActive:false,captureTerminal:false,operationActive:true,fileDiagnostics:null,transportError:false},receive=(t,extra)=>receiveGeneralizedPrimitiveOutputProfile(t,{request:request(),...extra},{startedAt:performance.now()}),success=received=>{assert.equal(received.result.ok,true,JSON.stringify(received.result.error));return received.result.result;};

test('source operation callback guard rejects declared async/proxy before invocation',limits,()=>{let effects=0;for(const run of [async()=>{effects++;},new Proxy(()=>{effects++;},{apply(){effects++;}})])assert.throws(()=>withGeneralizedOutputInstalledSources(run));assert.equal(effects,0);});
test('complete dynamic4d3 history remains unchanged and actual2virtual substitutions retain all131 predecessor versions',limits,()=>{const result=proposeGeneralizedOutputProfile();assert.equal(result.predecessor,'dynamic-primitive-output-20261101');assert.equal(result.sourceInstalled,false);assert.ok(result.sources.length>=131);assert.equal(result.originalBuiltinEquivalent,false);assert.deepEqual([...new Set(result.ruleTrace.map(row=>row.phase))],['language','repository']);});
test('all outputs preserve branch order, primitive lexical scope, range break/continue, mutable while and early return in emittedJS and strictTS5.9.3',limits,t=>{
 const verify=[
  {name:'multiple',arguments:[fixed(2),'東京{}'],stdout:'BEGIN=東京{};POS=2;',stderr:'END=東京{};',events:['capture-probe','context','context','context']},
  {name:'multiple',arguments:[fixed(0),'é'],stdout:'BEGIN=é;',stderr:'ZERO;END=é;',events:['capture-probe','context','context','context']},
  {name:'ranged',arguments:[fixed(0),'empty'],stdout:'DONE=empty;',stderr:'',events:['context']},
  {name:'ranged',arguments:[fixed(5),'end'],stdout:'ITER=0;ITER=2;DONE=end;',stderr:'',events:['capture-probe','context','capture-probe','context','context']},
  {name:'countdown',arguments:[fixed(3)],stdout:'LEFT=3;LEFT=2;LEFT=1;STOP;',stderr:'',events:['capture-probe','context','capture-probe','context','capture-probe','context','context']},
  {name:'early',arguments:[true],stdout:'A;',stderr:'',events:['capture-probe','context']},
  {name:'early',arguments:[false],stdout:'A;B;',stderr:'',events:['capture-probe','context','capture-probe','context']},
  {name:'shadow',arguments:[fixed(1)],stdout:'OUTER=2;INNER=3;OUTER_AGAIN=2;',stderr:'',events:['capture-probe','context','context','capture-probe','context']},
  {name:'exclusive',arguments:[true],stdout:'OWNED;',stderr:'',events:['capture-probe','context']},
  {name:'exclusive',arguments:[false],stdout:'',stderr:'OWNED;',events:['context']},
  {name:'chosen',arguments:[true],stdout:'YES;',stderr:'',events:['capture-probe','context']},
  {name:'chosen',arguments:[false],stdout:'NO;',stderr:'',events:['capture-probe','context']},
 ];const received=receive(t,{operation:'compile',verify});success(received);assert.ok(received.result.reports.some(row=>row.stage==='compiler-version'&&row.version==='5.9.3'));assert.ok(received.result.reports.some(row=>row.stage==='strict-typescript'&&row.passed));assert.equal(received.report.cleanupSucceeded,true);
});
test('second eager formatter failure preserves earlier output and never touches its own capture or diagnostics',limits,t=>{success(receive(t,{operation:'compile',verify:[{name:'partial',arguments:[fixed(1),fixed(0)],failure:'zero',failureStdout:'BEFORE;',failureStderr:'',failureEvents:['capture-probe','context'],options:{...defaults,fileDiagnostics:true}}]}));});
test('capture short-circuits diagnostics and repeated stderr writes preserve diagnostic/context/process quiet branches',limits,t=>{success(receive(t,{operation:'compile',verify:[{name:'multiple',arguments:[fixed(2),'x'],options:{...defaults,captureActive:true,captureTerminal:false,fileDiagnostics:true},stdout:'POS=2;',stderr:'BEGIN=x;END=x;',events:['capture-probe','capture-record','context','context','context']},{name:'diagnostic',arguments:[fixed(1)],options:{...defaults,fileDiagnostics:true},stdout:'',stderr:'D1=1;D2=1;',events:['capture-probe','diagnostic','context','capture-probe','diagnostic','context']},{name:'diagnostic',arguments:[fixed(1)],options:{...defaults,operationActive:false,fileDiagnostics:true},stdout:'',stderr:'',events:['capture-probe','diagnostic','capture-probe','diagnostic']},{name:'diagnostic',arguments:[fixed(1)],options:{...defaults,operationActive:false,fileDiagnostics:false,transportError:true},stdout:'',stderr:'',events:['capture-probe','diagnostic','process','capture-probe','diagnostic','process']}]}));});
for(const language of ['JavaScript','TypeScript']){
 test(language+' loop format literal edit independently lowers into actual native source with exact whole paired replay',limits,t=>{const result=success(receive(t,{operation:'format-inverse',language,before:'ITER=',after:'INDEX{}=',verify:[{name:'ranged',arguments:[fixed(3),'x'],stdout:'INDEX{}=0;INDEX{}=2;DONE=x;',stderr:'',events:['capture-probe','context','capture-probe','context','context']}]}));assert.ok(result.proposal.rustEdits.some(row=>row.after.includes('INDEX{{}}=')));});
 test(language+' primitive edited inverse retains exact requested whole bytes',limits,t=>{const result=success(receive(t,{operation:'scalar-inverse',language,before:'5n',after:'8n'}));assert.ok(result.proposal.rustEdits.some(row=>row.after.includes('8_u64')));assert.equal(receive(t,{operation:'inverse',language,before:'ORIGINAL_ARG',after:'CHANGED_ARG',singleQuoted:true}).result.ok,false);assert.equal(receive(t,{operation:'scalar-inverse',language,before:'5n',after:'8n /* noncanonical */'}).result.ok,false);});
}
const fmt=value=>'crate::translation_core::format!('+value+')',out=value=>'crate::translation_core::output_text_write(false,'+value+')';
for(const [name,body]of [
 ['duplicate String move in one continuation','let value='+fmt('"x"')+';'+out('value')+';'+out('value')],
 ['loop carries a consumed outer String','let value='+fmt('"x"')+';for index in 0_u64..2_u64 {'+out('value')+';}'],
 ['branch consumes value before later reuse','let value='+fmt('"x"')+';if flag {'+out('value')+';}'+out('value')],
 ['local initializer does not own a later lexical binding','let value='+fmt('"{future}"')+';let future=1_u64;'+out('value')],
 ['unknown primitive helper is not admitted by type','let value=unknown();'+out(fmt('"{value}"'))],
 ['unknown owned String producer','let value=String::from("x");'+out('value')],
 ['ordered match still needs original witness','match flag {true=>{'+out(fmt('"x"'))+';},false=>{'+out(fmt('"y"'))+';}}'],
 ['for reference pattern needs its own proof','for &index in 0_u64..2_u64 {'+out(fmt('"{index}"'))+';}'],
])test(name+' keeps source/type/effect/loan/move refusal',limits,t=>{const result=receive(t,{operation:'compile',request:request('pub mod translation_core;pub fn attempted(flag:bool){'+body+'}')}).result;if(result.ok)assert.equal(result.result.meta.executable.some(row=>row.name==='attempted'||row.name.endsWith('.attempted')),false);else assert.equal(typeof result.error.message,'string');});
for(const operation of ['source-poison','primary-source-close','custody-reentry'])test(operation+' retains private whole-source closing/primary/caught-failure/expiry contracts',limits,t=>{const result=receive(t,{operation});if(operation==='source-poison')assert.equal(result.result.ok,false);else success(result);assert.equal(result.report.cleanupSucceeded,true);});
test('fresh full checked-meta reissue refuses submitted mutation',limits,t=>{success(receive(t,{operation:'meta'}));assert.equal(receive(t,{operation:'meta',mutate:true}).result.ok,false);});
test('full actual CLI owner proposals retain header+row output migration and every original residual without claim of JSON helper support',limits,t=>{const productionRequest={entry:'src/lib.rs',manifest,lock,files:DYNAMIC_OUTPUT_PRODUCTION_OWNERS.map(row=>({path:row.path,source:row.source}))};productionRequest.files.push({path:'src/translation_core.rs',source:DYNAMIC_OUTPUT_ORIGINAL_FACADE_SOURCE});const result=success(receive(t,{operation:'production',productionRequest})).value;assert.equal(result.wholeOriginalOwnersPreserved,true);assert.equal(result.productionCoverageQualified,false);assert.equal(result.originalBuiltinEquivalent,false);for(const row of result.equations)assert.equal(row.history.inverse,row.before);const table=result.equations.find(row=>row.path==='src/token_report.rs');assert.match(table.after,/output_text_write\(false, crate::translation_core::format!\(/);assert.ok(table.after.includes('HEADERS[8]'));assert.ok(table.after.includes('for record in records'));assert.ok(result.remaining.some(row=>row.includes('owned-helper')));t.diagnostic(JSON.stringify(result.attempt));});
