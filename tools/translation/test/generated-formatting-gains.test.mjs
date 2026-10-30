import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const tag=($,fields={})=>Object.freeze({$,...fields});
const object=entries=>tag('Object',{field0:tag('Map',{entries:Object.freeze(entries.map(([key,value])=>tag('MapEntry',{key,value})))})});
async function generated(sourcePath,name,verify){
 const source=read(sourcePath),sha256=createHash('sha256').update(source).digest('hex'),inventory=JSON.parse(read('parity/rust-source-inventory.json')),row=inventory.sources.find(row=>row.source===sourcePath);assert.ok(row);
 const meta=JSON.parse(read(row.targets.meta));assert.equal(row.sha256,sha256);assert.equal(meta.sourceSha256,sha256);assert.equal(meta.items.map(item=>item.source).join(''),source);assert.equal(meta.items.find(item=>item.term==='fn'&&item.name===name)?.status,'executable');
 await verifyTypedTargets({javascript:read(row.targets.javascript),typescript:read(row.targets.typescript),meta:{entry:sourcePath}},async(api,_result,module)=>{assert.equal(module.provenance.sourceSha256,sha256);assert.equal(module.provenance.runtimeParity,false);assert.equal(typeof api[name],'function');await verify(api[name],api);},{childTimeoutMs:20000});
}
function rejectText(fn){for(const input of [null,undefined,0,new String('text'),{},['text'],String.fromCharCode(0xd800)])assert.throws(()=>fn(input),TypeError);}

test('actual annotation extraction preserves JSON Option Result chaining and complete formatted errors',{timeout:60000},async()=>{
 await generated('rust/src/bridge_response.rs','required_annotation_string',fn=>{
  const cases=[
   [object([['url',tag('String',{field0:'https://example.test/Ω😀'})]]),'url',0n,tag('Ok',{field0:'https://example.test/Ω😀'})],
   [object([['url',tag('String',{field0:'  '})]]),'url',9n,tag('Ok',{field0:'  '})],
   [object([['url',tag('String',{field0:''})]]),'url',12n,tag('Err',{field0:'annotations[12].url is required'})],
   [object([]),'label',18446744073709551615n,tag('Err',{field0:'annotations[18446744073709551615].label is required'})],
   [tag('Null'),'url',3n,tag('Err',{field0:'annotations[3].url is required'})],
   [object([['url',tag('Bool',{field0:true})]]),'url',4n,tag('Err',{field0:'annotations[4].url is required'})],
  ];for(const [annotation,field,index,expected]of cases)assert.deepEqual(fn(annotation,field,index),expected);
  for(const index of [-1n,18446744073709551616n])assert.throws(()=>fn(object([]),'url',index),RangeError);
  let reads=0;const hostile=new Proxy({},{get(){reads++;throw Error('unexpected annotation getter');},ownKeys(){reads++;throw Error('unexpected annotation keys');}});assert.throws(()=>fn(hostile,'url',0n),TypeError);assert.equal(reads,0);
 });
});
test('actual deletion note distinguishes zero from subsecond Duration and keeps exact u64 seconds',{timeout:60000},async()=>{
 await generated('rust/src/chat_commands.rs','deletion_note',fn=>{
  const cases=[
   [0n,0n,''],
   [0n,1n,'\n\nI will delete this message in 0s where the platform allows it — copy it now.'],
   [1n,0n,'\n\nI will delete this message in 1s where the platform allows it — copy it now.'],
   [1n,999999999n,'\n\nI will delete this message in 1s where the platform allows it — copy it now.'],
   [18446744073709551615n,0n,'\n\nI will delete this message in 18446744073709551615s where the platform allows it — copy it now.'],
  ];for(const [secs,nanos,expected]of cases)assert.equal(fn(tag('Duration',{secs,nanos})),expected);
  assert.throws(()=>fn({$:'Duration',secs:1n,nanos:0n}),TypeError);assert.throws(()=>fn(tag('Duration',{secs:0n,nanos:1000000000n})),RangeError);
 });
});
test('actual URI path and query formatting preserves empty and Unicode pieces without normalization',{timeout:60000},async()=>{
 await generated('rust/src/codex_remote_control.rs','uri_path_and_query',fn=>{
  for(const [path,query,expected]of [['','',''],['/x','','/x'],['','a=1','?a=1'],['/x','a=1','/x?a=1'],['/Ω😀','q=λ&v=%20','/Ω😀?q=λ&v=%20'],['/x?old','new','/x?old?new'],['/x','#tail','/x?#tail'],[' /x ',' ',' /x ? ']])assert.equal(fn(path,query),expected);
  rejectText(value=>fn(value,''));rejectText(value=>fn('',value));
 });
});
test('actual shell quoting preserves empty strings quotes newlines Unicode and shell metacharacters as data',{timeout:60000},async()=>{
 await generated('rust/src/deploy_remote.rs','shell_quote',fn=>{
  for(const [input,expected]of [['',"''"],['abc',"'abc'"],['a b',"'a b'"],["a'b","'a'\"'\"'b'"],["a''b","'a'\"'\"''\"'\"'b'"],["'a'","''\"'\"'a'\"'\"''"],['a\nb',"'a\nb'"],['Ω😀',"'Ω😀'"],['$HOME;`id`',"'$HOME;`id`'"]])assert.equal(fn(input),expected);rejectText(fn);
 });
});
test('actual catalog URL retains trailing-slash and existing v1 behavior across independent boundaries',{timeout:60000},async()=>{
 await generated('rust/src/lefine.rs','catalog_url',fn=>{
  for(const [input,expected]of [['','/v1/models'],['/','/v1/models'],['https://example.test/','https://example.test/v1/models'],['https://example.test////','https://example.test/v1/models'],['https://example.test/v1/','https://example.test/v1/models'],['https://example.test/V1','https://example.test/V1/v1/models'],['https://example.test/v11','https://example.test/v11/v1/models'],['Ω😀/','Ω😀/v1/models']])assert.equal(fn(input),expected);rejectText(fn);
 });
});
test('actual token placeholder keeps the complete NUL sentinel and independent reason bytes',{timeout:60000},async()=>{
 await generated('rust/src/token_secret.rs','placeholder',(fn,api)=>{
  assert.equal(api.SENTINEL,'\0link-assistant-router:no-token-secret:');
  for(const [input,expected]of [['','\0link-assistant-router:no-token-secret:'],['missing','\0link-assistant-router:no-token-secret:missing'],['Ω😀','\0link-assistant-router:no-token-secret:Ω😀'],['\0\n','\0link-assistant-router:no-token-secret:\0\n']])assert.equal(fn(input),expected);rejectText(fn);
 });
});
