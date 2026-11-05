// Actual checked primitive-owned Text output cases SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {receiveJsonScalarReadersProfile} from './json-scalar-readers-20261101-receiving.mjs';
import {proposeJsonScalarReadersProfile,withJsonScalarReadersInstalledSources} from '../json-scalar-readers-20261101-profile.mjs';
import {receiveJsonScalarReadersCorpus} from './json-scalar-readers-20261101-corpus-receiving.mjs';
import {DYNAMIC_OUTPUT_FACADE_SOURCE,DYNAMIC_OUTPUT_LEAF_SOURCE,DYNAMIC_OUTPUT_PRODUCTION_OWNERS,DYNAMIC_OUTPUT_ORIGINAL_FACADE_SOURCE} from '../dynamic-primitive-output-20261101-source.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../json-scalar-readers-20261101-native-source.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
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

#[derive(Clone,Copy)] pub enum Stamp{A,B}
pub fn copied_stamp(value:Stamp)->Stamp{value}
pub fn row(_record:&crate::translation_core::Json,count:u64)->crate::translation_core::Text {crate::translation_core::format!("ROW={count};")}
pub fn table(records:&[crate::translation_core::Json]) {for record in records {crate::translation_core::output_text_write(false,crate::translation_core::format!("{}",row(record,7_u64)));}}
pub fn leaf(n:u64)->crate::translation_core::Text {crate::translation_core::format!("N={n};")}
pub fn render(n:u64)->crate::translation_core::Text {leaf(n)}
pub fn render_output(n:u64){crate::translation_core::output_text_write(false,crate::translation_core::format!("{}",render(n)));}
pub fn borrowed(label:&crate::translation_core::Str)->crate::translation_core::Text {crate::translation_core::format!("BORROW={label};")}
pub fn borrowed_output(){crate::translation_core::output_text_write(false,crate::translation_core::format!("{}",borrowed("λ{}")));}
pub fn helper_partial(record:&crate::translation_core::Json,value:u64,divisor:u64){crate::translation_core::output_text_write(false,crate::translation_core::format!("{}",render(9_u64)));crate::translation_core::output_text_result(true,row(record,value/divisor));}
pub fn prior(record:&crate::translation_core::Json)->bool{record.is_null()}

`;
function scalarRequest(body){const value=request('pub mod translation_core;pub mod translation_json_fields_core;pub mod translation_primitive_option_core;pub mod translation_primitive_option_callbacks_core;pub mod translation_text_core;'+body);value.files.push({path:'src/translation_json_fields_core.rs',source:JSON_FIELDS_NATIVE_SOURCE},{path:'src/translation_primitive_option_core.rs',source:PRIMITIVE_OPTION_NATIVE_SOURCE},{path:'src/translation_primitive_option_callbacks_core.rs',source:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE},{path:'src/translation_text_core.rs',source:TEXT_NATIVE_SOURCE});return value;}
function request(body=source){return {entry:'src/lib.rs',manifest,lock,files:[{path:'src/lib.rs',source:body},{path:'src/translation_core.rs',source:DYNAMIC_OUTPUT_FACADE_SOURCE},{path:'src/translation_core/dynamic_primitive_output_20261101.rs',source:DYNAMIC_OUTPUT_LEAF_SOURCE},{path:'src/translation_core/literal_arguments_core_20261101.rs',source:LITERAL_ARGUMENTS_LEAF_SOURCE},{path:'src/translation_core/output_literal_core_20261101.rs',source:OUTPUT_LITERAL_LEAF_SOURCE},{path:'src/translation_core/persistent_output_backend_20261101.rs',source:PERSISTENT_OUTPUT_LEAF_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'src/translation_core/ranges.rs',source:ROUTER_CORE_RANGES_SOURCE},{path:'src/translation_core/json_collections.rs',source:ROUTER_CORE_JSON_COLLECTIONS_SOURCE},{path:'src/translation_core/base64.rs',source:ROUTER_CORE_BASE64_SOURCE}]};}
const fixed=value=>({kind:'fixed',value:String(value)}),defaults={captureActive:false,captureTerminal:false,operationActive:true,fileDiagnostics:null,transportError:false},receive=(t,extra)=>receiveJsonScalarReadersProfile(t,{request:request(),...extra},{startedAt:performance.now()}),success=received=>{assert.equal(received.result.ok,true,JSON.stringify(received.result.error));return received.result.result;};

test('source operation callback guard rejects declared async/proxy before invocation',limits,()=>{let effects=0;for(const run of [async()=>{effects++;},new Proxy(()=>{effects++;},{apply(){effects++;}})])assert.throws(()=>withJsonScalarReadersInstalledSources(run));assert.equal(effects,0);});
test('complete generalized57c54e parent and all138 predecessor versions remain present in the three-row delta',limits,()=>{const result=proposeJsonScalarReadersProfile();assert.equal(result.predecessor,'owned-json-output-20261101');assert.equal(result.sourceInstalled,false);assert.ok(result.sources.length>=148);assert.equal(result.originalBuiltinEquivalent,false);assert.deepEqual([...new Set(result.ruleTrace.map(row=>row.phase))],['language','repository']);});
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

const nullJson={kind:'json-null'},records=values=>({kind:'json-array',values});
test('genuine borrowed Json custody, helper argument coercion and nested owned Text results replay in JS and strictTS',limits,t=>{
 const checked=success(receive(t,{operation:'compile',verify:[
  {name:'table',arguments:[records([null,'東京{}'])],stdout:'ROW=7;ROW=7;',stderr:''},
  {name:'table',arguments:[records([])],stdout:'',stderr:'',events:[]},
  {name:'render_output',arguments:[fixed(9)],stdout:'N=9;',stderr:''},
  {name:'render',arguments:[fixed(0)],value:'N=0;',stdout:'',stderr:'',events:[]},
  {name:'render',arguments:[fixed('18446744073709551615')],value:'N=18446744073709551615;',stdout:'',stderr:'',events:[]},
  {name:'borrowed_output',arguments:[],stdout:'BORROW=λ{};',stderr:''},
  {name:'prior',arguments:[nullJson],value:true,stdout:'',stderr:'',events:[]},
 ]}));assert.ok(checked.meta.executable.some(row=>row.name==='table'||row.name.endsWith('.table')));
});
test('later failing copied helper argument preserves earlier output without touching later capture',limits,t=>{
 success(receive(t,{operation:'compile',verify:[{name:'helper_partial',arguments:[nullJson,fixed(1),fixed(0)],failure:'zero',failureStdout:'N=9;',failureStderr:'',failureEvents:['capture-probe','context']}]}));
});
for(const language of ['JavaScript','TypeScript'])test(language+' actual helper formatter edit lowers to complete native helper and exact paired target reproduction',limits,t=>{
 const result=success(receive(t,{operation:'format-inverse',language,before:'ROW=',after:'RECORD{}=',verify:[{name:'table',arguments:[records([null,null])],stdout:'RECORD{}=7;RECORD{}=7;',stderr:''}]}));
 assert.ok(result.proposal.rustEdits.some(row=>row.after.includes('RECORD{{}}=')));
 assert.equal(receive(t,{operation:'format-inverse',language,before:'ROW=',after:'RECORD=',singleQuoted:true}).result.ok,false);
});
for(const [name,helper,argument]of [
 ['unissued standard is_null','fn bad(record:&crate::translation_core::Json)->crate::translation_core::Text{crate::translation_core::format!("{}",record.is_null())}','record'],
 ['unissued standard Option reader','fn bad(record:&crate::translation_core::Json)->crate::translation_core::Text{crate::translation_core::format!("{}",record.as_u64().unwrap_or(0_u64))}','record'],
 ['mutable Json borrow','fn bad(record:&mut crate::translation_core::Json)->crate::translation_core::Text{crate::translation_core::format!("x")}','record'],
 ['owned Json transfer','fn bad(record:crate::translation_core::Json)->crate::translation_core::Text{crate::translation_core::format!("x")}','record'],
 ['effectful helper','fn bad(record:&crate::translation_core::Json)->crate::translation_core::Text{crate::translation_core::output_text_write(false,crate::translation_core::format!("SIDE;"));crate::translation_core::format!("x")}','record'],
 ['cycle','fn bad(record:&crate::translation_core::Json)->crate::translation_core::Text{bad(record)}','record'],
 ['static array/index remains original witness prerequisite','const HEADERS:[&crate::translation_core::Str;1]=["x"];fn bad(record:&crate::translation_core::Json)->crate::translation_core::Text{crate::translation_core::format!("{}",HEADERS[0])}','record'],
])test(name+' is not admitted by public type/name/contract spelling',limits,t=>{
 const body='pub mod translation_core;'+helper+'pub fn attempted(record:&crate::translation_core::Json){crate::translation_core::output_text_write(false,crate::translation_core::format!("{}",bad('+argument+')));}';
 const packet=receive(t,{operation:'compile',request:request(body)}).result;if(packet.ok)assert.equal(packet.result.meta.executable.some(row=>row.name==='attempted'||row.name.endsWith('.attempted')),false);else assert.equal(typeof packet.error.message,'string');
});
test('complete actual opaque source corpus retains original module owners, meta and every residual',limits,t=>{
 const received=receiveJsonScalarReadersCorpus(t,{operation:'inspect'},{startedAt:performance.now()});assert.equal(received.report.cleanupSucceeded,true);
 if(!received.packet.ok){assert.equal(typeof received.packet.error.message,'string');t.diagnostic('whole source producer refused: '+received.packet.error.message);return;}
 const result=received.packet.result;assert.equal(result.originalOwnersExtracted,false);assert.equal(result.wholeOriginalModuleGraphRetained,true);assert.equal(result.productionCoverageQualified,false);assert.equal(result.allCompleteOriginalNativeSourcesDelivered,true);assert.equal(result.allCompleteMetadataDelivered,true);assert.equal(result.originalBuiltinEquivalent,false);assert.ok(result.receipts.length>3);
});
for(const operation of ['source-caught','source-replace','source-primary'])test('whole original corpus '+operation+' closes source custody on all exits',limits,t=>{
 const received=receiveJsonScalarReadersCorpus(t,{operation},{startedAt:performance.now()});assert.equal(received.report.cleanupSucceeded,true);if(operation==='source-primary')assert.equal(received.packet.result.allExactPrimariesPreserved,true);else assert.equal(received.packet.ok,false);
});
test('every native profile leaf must remain in actual installed Git cohort',limits,t=>{
 const received=receiveJsonScalarReadersCorpus(t,{operation:'inspect',omitInstalledNativeLeaf:true},{startedAt:performance.now()});assert.equal(received.packet.ok,false);assert.equal(received.report.cleanupSucceeded,true);
});

test('fresh whole receiving source, stale helper body/namespace, fake public resolver and expired emission remain checked',limits,t=>{
 const result=success(receive(t,{operation:'transport-controls'}));assert.equal(result.staleBodyAndNamespaceRefused,true);assert.equal(result.expiredReceivingRefused,true);assert.equal(result.fakePublicResolverRefused,true);
});
for(const [name,body]of [
 ['ambiguous repeated coerced call data','fn child(n:u64)->crate::translation_core::Text{crate::translation_core::format!("N={n}")}pub fn attempted(n:u64){crate::translation_core::output_text_write(false,crate::translation_core::format!("{}{}",child(n),child(n)));}'],
 ['ambiguous original source import','mod one{pub fn child(n:u64)->crate::translation_core::Text{crate::translation_core::format!("A={n}")}}mod two{pub fn child(n:u64)->crate::translation_core::Text{crate::translation_core::format!("B={n}")}}use one::child;use two::child;pub fn attempted(n:u64){crate::translation_core::output_text_write(false,crate::translation_core::format!("{}",child(n)));}'],
 ['borrowed helper result','fn child(value:&crate::translation_core::Str)->&crate::translation_core::Str{value}pub fn attempted(value:&crate::translation_core::Str){crate::translation_core::output_text_write(false,crate::translation_core::format!("{}",child(value)));}'],
])test(name+' has no descriptor-based or source-spelling permission',limits,t=>{
 const packet=receive(t,{operation:'compile',request:request('pub mod translation_core;'+body)}).result;if(packet.ok)assert.equal(packet.result.meta.executable.some(row=>row.name==='attempted'||row.name.endsWith('.attempted')),false);else assert.equal(typeof packet.error.message,'string');
});

test('joined operations preserve every falsy/frozen primary and fake flow callbacks never execute',limits,t=>{
 const result=success(receive(t,{operation:'joined-primary'}));assert.equal(result.joinedExactPrimaries,true);assert.equal(result.fakeSourceFlowCallbackNeverInvoked,true);
});

test('actual original capture traversal refuses source getters before invocation and caught failure poisons',limits,t=>{const result=success(receive(t,{operation:'capture-getter'}));assert.equal(result.getterNeverInvoked,true);assert.equal(result.caughtCaptureFailurePoisons,true);});

const scalarSource=`
pub fn direct_str(value:&crate::translation_core::Json)->crate::translation_core::Maybe<&crate::translation_core::Str>{crate::translation_json_fields_core::json_value_as_str(value)}
pub fn direct_u64(value:&crate::translation_core::Json)->crate::translation_core::Maybe<u64>{crate::translation_json_fields_core::json_value_as_u64(value)}
pub fn direct_bool(value:&crate::translation_core::Json)->crate::translation_core::Maybe<bool>{crate::translation_json_fields_core::json_value_as_bool(value)}
pub fn direct_null(value:&crate::translation_core::Json)->bool{crate::translation_json_fields_core::json_value_is_null(value)}
pub fn label(value:&crate::translation_core::Json,key:&crate::translation_core::Str)->crate::translation_core::Text{crate::translation_json_fields_core::json_text_field_or_empty(value,key)}
pub fn optional_label(value:&crate::translation_core::Json)->crate::translation_core::Maybe<crate::translation_core::Text>{crate::translation_json_fields_core::json_text_field(value,"text")}
pub fn summary(value:&crate::translation_core::Json){crate::translation_core::output_text_write(false,crate::translation_core::format!("TEXT={} N={} B={} NULL={};",label(value,"text"),crate::translation_primitive_option_core::u64_unwrap_or(crate::translation_json_fields_core::json_u64_field(value,"n"),0_u64),crate::translation_primitive_option_core::bool_unwrap_or(crate::translation_json_fields_core::json_bool_field(value,"b"),false),crate::translation_json_fields_core::json_value_is_null(value)));}
pub fn mapped(value:&crate::translation_core::Json)->crate::translation_core::Text{let text=crate::translation_primitive_option_callbacks_core::u64_to_text_owned_map(crate::translation_json_fields_core::json_u64_field(value,"n"),|n|crate::translation_core::format!("MAP={n};"));crate::translation_primitive_option_core::text_owned_unwrap_or_default(text)}
pub fn mapped_failure(value:&crate::translation_core::Json,divisor:u64)->crate::translation_core::Text{let text=crate::translation_primitive_option_callbacks_core::u64_to_text_owned_map(crate::translation_json_fields_core::json_u64_field(value,"n"),|n|crate::translation_core::format!("DIV={};",n/divisor));crate::translation_primitive_option_core::text_owned_unwrap_or_default(text)}
pub fn lazy(value:&crate::translation_core::Json)->crate::translation_core::Text{crate::translation_primitive_option_callbacks_core::str_unwrap_or_else(crate::translation_json_fields_core::json_str_field(value,"text"),||"FALLBACK{}")}
pub fn chosen_owned(value:&crate::translation_core::Json)->crate::translation_core::Text{crate::translation_primitive_option_core::text_owned_unwrap_or_default(crate::translation_json_fields_core::json_text_field(value,"text"))}
`;
const scalarReceive=(t,extra)=>receiveJsonScalarReadersProfile(t,{request:scalarRequest(scalarSource),...extra},{startedAt:performance.now()});
test('real value-level wrappers preserve precise scalar/None results in emitted JS and strictTS5.9.3',limits,t=>{
 const received=scalarReceive(t,{operation:'runtime',runtimeSource:`({assert,api,jsonRuntime})=>{const parse=text=>{const value=jsonRuntime.serde_json_from_str(text);assert.equal(value.$,'Ok');return value.field0;},none={$:'None'};for(const text of ['null','{}','[]','true','0'])assert.deepEqual(api.direct_str(parse(text)),none);assert.deepEqual(api.direct_str(parse('"東京é😀{}"')),{$:'Some',field0:'東京é😀{}'});assert.deepEqual(api.direct_str(parse('""')),{$:'Some',field0:''});for(const text of ['null','[]','{}','"true"','0'])assert.deepEqual(api.direct_bool(parse(text)),none);assert.deepEqual(api.direct_bool(parse('true')),{$:'Some',field0:true});assert.deepEqual(api.direct_bool(parse('false')),{$:'Some',field0:false});for(const text of ['null','-1','1.0','1.5','"9007199254740993"','false'])assert.deepEqual(api.direct_u64(parse(text)),none);assert.deepEqual(api.direct_u64(parse('9007199254740993')),{$:'Some',field0:9007199254740993n});assert.deepEqual(api.direct_u64(parse('18446744073709551615')),{$:'Some',field0:18446744073709551615n});assert.equal(api.direct_null(parse('null')),true);assert.equal(api.direct_null(parse('{}')),false);}`});success(received);assert.ok(received.result.reports.some(row=>row.stage==='compiler-version'&&row.version==='5.9.3'));
});
test('genuine early owning field flow and actual finite callback scopes produce detached String/Option payloads',limits,t=>{
 success(scalarReceive(t,{operation:'runtime',runtimeSource:`({assert,api,jsonRuntime,output})=>{const parse=text=>{const result=jsonRuntime.serde_json_from_str(text);assert.equal(result.$,'Ok');return result.field0;},value=parse('{"text":"λ{}","n":9007199254740993,"b":true}'),missing=parse('{}');assert.equal(api.label(value,'text'),'λ{}');assert.equal(api.label(missing,'text'),'');assert.deepEqual(api.optional_label(value),{$:'Some',field0:'λ{}'});assert.deepEqual(api.optional_label(missing),{$:'None'});assert.equal(api.mapped(value),'MAP=9007199254740993;');assert.equal(api.mapped(missing),'');assert.equal(api.mapped_failure(missing,0n),'');assert.throws(()=>api.mapped_failure(value,0n),/zero/);assert.equal(api.lazy(value),'λ{}');assert.equal(api.lazy(missing),'FALLBACK{}');assert.equal(api.chosen_owned(value),'λ{}');assert.equal(api.chosen_owned(missing),'');const memory=output.createMemoryOutputBackend({captureActive:false,captureTerminal:false,operationActive:true,fileDiagnostics:null,transportError:false});output.withOutputLiteralBackend(memory.backend,()=>api.summary(value));assert.equal(memory.snapshot().stdout,'TEXT=λ{} N=9007199254740993 B=true NULL=false;');assert.equal(memory.snapshot().stderr,'');}` }));
});
for(const language of ['JavaScript','TypeScript'])test(language+' genuine callback formatter literal edit checks complete changed native source and both exact targets',limits,t=>{
 const result=success(scalarReceive(t,{operation:'format-inverse',language,before:'MAP=',after:'MAP{}=',verify:[]}));assert.ok(result.proposal.rustEdits.some(row=>row.after.includes('MAP{{}}=')));assert.equal(scalarReceive(t,{operation:'format-inverse',language,before:'MAP=',after:'CHANGED=',singleQuoted:true}).result.ok,false);
});
for(const [name,body]of [
 ['unqualified standard is_null stays unissued','pub fn attempted(value:&crate::translation_core::Json){crate::translation_core::output_text_write(false,crate::translation_core::format!("{}",value.is_null()));}'],
 ['borrowed scalar escapes its source lifetime',"pub fn attempted(value:&crate::translation_core::Json)->crate::translation_core::Maybe<&'static crate::translation_core::Str>{crate::translation_json_fields_core::json_value_as_str(value)}"],
 ['owning Option reused after consumption','pub fn attempted(value:&crate::translation_core::Json){let text=crate::translation_json_fields_core::json_text_field(value,"text");crate::translation_core::output_text_write(false,crate::translation_primitive_option_core::text_owned_unwrap_or_default(text));crate::translation_core::output_text_write(false,crate::translation_primitive_option_core::text_owned_unwrap_or_default(text));}'],
 ['mutable callback capture','pub fn attempted(value:&crate::translation_core::Json)->crate::translation_core::Text{let mut used=0_u64;crate::translation_primitive_option_callbacks_core::u64_to_text_owned_map(crate::translation_json_fields_core::json_u64_field(value,"n"),|n|{used+=n;crate::translation_core::format!("{used}")});crate::translation_core::format!("{used}")}'],
 ['unknown callback effect','pub fn attempted(value:&crate::translation_core::Json)->crate::translation_core::Text{crate::translation_primitive_option_core::text_owned_unwrap_or_default(crate::translation_primitive_option_callbacks_core::u64_to_text_owned_map(crate::translation_json_fields_core::json_u64_field(value,"n"),|n|{unknown();crate::translation_core::format!("{n}")}))}'],
])test(name+' cannot manufacture current native/source/flow permission',limits,t=>{
 const packet=receiveJsonScalarReadersProfile(t,{operation:'compile',request:scalarRequest(body)},{startedAt:performance.now()}).result;if(packet.ok)assert.equal(packet.result.meta.executable.some(row=>row.name==='attempted'||row.name.endsWith('.attempted')),false);else assert.equal(typeof packet.error.message,'string');
});

test('actual legacy field/Option producers compose whole-source adoption and independent fresh checking',limits,t=>{
 const before='pub fn legacy(value:&crate::translation_core::Json,key:&crate::translation_core::Str)->crate::translation_core::Text{value.get(key).and_then(|selected|selected.as_str()).unwrap_or_default().to_string()}';
 const result=success(receiveJsonScalarReadersProfile(t,{operation:'adoption',request:scalarRequest(before)},{startedAt:performance.now()}));assert.equal(result.wholeOriginalOwnersRetained,true);assert.equal(result.oldTraitDispatchProved,false);assert.equal(result.oldClosureEquivalenceProved,false);assert.equal(result.productionCoverageQualified,false);assert.ok(result.changedRequest.files.find(row=>row.path==='src/lib.rs').source.includes('crate::translation_json_fields_core::json_text_field_or_empty'));assert.equal(result.final.status,'checked-or-refused');assert.ok(result.final.meta.executable.some(row=>row.name==='legacy'||row.name.endsWith('.legacy')));assert.deepEqual([...new Set(result.ruleTrace.map(row=>row.phase))],['language','repository']);
});
test('scalar field publication is whole-program/current: expired, early, forged-factory and stale receiving projections refuse',limits,t=>{
 const result=success(scalarReceive(t,{operation:'scalar-lifetime-controls'}));for(const name of ['freshFullSourceEmission','detachedProjectionRefused','earlyNewOperationRefused','forgedFactoryDidNotRegister','staleWholeBodyAndNamespaceRefused'])assert.equal(result[name],true);
});
test('multi-input borrowed Option lacks a complete existing lifetime equation and remains refused',limits,t=>{
 const body="pub fn attempted(value:&crate::translation_core::Json,other:crate::translation_core::Maybe<&crate::translation_core::Str>)->crate::translation_core::Maybe<&'static crate::translation_core::Str>{crate::translation_primitive_option_core::str_or(other,crate::translation_json_fields_core::json_value_as_str(value))}";
 const packet=receiveJsonScalarReadersProfile(t,{operation:'compile',request:scalarRequest(body)},{startedAt:performance.now()}).result;if(packet.ok)assert.equal(packet.result.meta.executable.some(row=>row.name==='attempted'||row.name.endsWith('.attempted')),false);else assert.equal(typeof packet.error.message,'string');
});
