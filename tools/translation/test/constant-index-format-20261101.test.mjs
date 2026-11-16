// Independent helper/caller source cases, ALL UNRUN. No profile is installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {HostChecker,parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {roundTripProgram,serializeProgram} from '../semantic-meta.mjs';
import {translateSource} from '../translate.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {readBoundedTrackedSourceBytes} from '../forward-output-ownership-20261101-bounded-bytes.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {withConstantIndexFormatOperation,checkConstantIndexFormatProgram,describeConstantIndexFormatProgram,requireConstantIndexFormatValue,joinConstantIndexFormatRoundTrip,requireProjectedConstantIndexFormatValue,hasCapturedConstantIndexFormatSyntax,hasTypedConstantIndexFormatRead,constantIndexFormatOwnershipFootprint} from '../constant-index-format-20261101.mjs';
const SOURCE='const LABELS:[&str;3]=["É😀","","tail"];const INDEX:usize=2usize;pub fn render()->String{format!("{0:<6}|{1}|{2}",LABELS[0usize],LABELS[1usize],LABELS[INDEX])}fn main(){}';
function nodes(program){const result=[];function scan(node){if(!node||typeof node!=='object')return;if(node.k==='index')result.push(node);for(const [key,value] of Object.entries(node))if(!['type','span','formatProvenance'].includes(key))for(const child of Array.isArray(value)?value:[value])scan(child);}for(const entry of program.declarations.values())if(entry.k==='fn')scan(entry.body);return result;}
function checked(source){const surface=parseRust(source),checker=new HostChecker(surface.language,surface.externals??[]);return {surface,checker,program:checkConstantIndexFormatProgram(checker,surface)};}
function inverse(before,after){
 const original=transportConcreteSyntaxSource(before,{language:'Rust'}),changed=transportConcreteSyntaxSource(after,{language:'Rust'});
 const forward=applyConcreteSyntaxSubstitutions(original.meta,{languageRules:[{id:'rust:actual-const-array-string-cell-edit',edits:[{span:[0,before.length],expected:before,replacement:after}]}],repositoryRules:[{id:'fixture:retain-complete-native-owner-and-caller',edits:[]}]}),back=applyConcreteSyntaxSubstitutions(changed.meta,{languageRules:[{id:'rust:restore-whole-original-const-owner',edits:[{span:[0,after.length],expected:after,replacement:before}]}],repositoryRules:[{id:'fixture:restore-exact-complete-native-source',edits:[]}]});
 assert.equal(forward.value.source,after);assert.equal(back.value.source,before);assert.equal(transportConcreteSyntaxMeta(original.meta).source,before);assert.equal(transportConcreteSyntaxMeta(changed.meta).source,after);assert.deepEqual(forward.trace.map(row=>row.phase),['language','repository']);assert.deepEqual(back.trace.map(row=>row.phase),['language','repository']);return {beforeMeta:original.meta,afterMeta:changed.meta};
}
function qualified(source){return withConstantIndexFormatOperation(()=>{const {program}=checked(source),receipt=describeConstantIndexFormatProgram(program);assert.equal(receipt.sourceAuthority,false);assert.equal(receipt.semanticAuthority,false);assert.deepEqual(nodes(program).map(node=>requireConstantIndexFormatValue(node,program)),receipt.cells.map(row=>row.value));const projection=joinConstantIndexFormatRoundTrip(program,roundTripProgram(program));assert.deepEqual(nodes(projection).map(node=>requireProjectedConstantIndexFormatValue(node,projection)),receipt.cells.map(row=>row.value));return receipt;});}
function pinnedCompiler(t){
 const require=createRequire(new URL('../../../js/package.json',import.meta.url)),packagePath=require.resolve('typescript/package.json'),script=require.resolve('typescript/bin/tsc');
 const pkg=JSON.parse(readBoundedTrackedSourceBytes(dirname(packagePath),basename(packagePath),{maxBytes:1048576}).toString('utf8')),lockPath=fileURLToPath(new URL('../../../js/package-lock.json',import.meta.url)),lock=JSON.parse(readBoundedTrackedSourceBytes(dirname(lockPath),basename(lockPath),{maxBytes:8*1048576}).toString('utf8'));
 assert.equal(pkg.version,'5.9.3');assert.equal(lock.packages['node_modules/typescript'].version,'5.9.3');assert.equal(process.env.ROUTER_TRANSLATION_TSC,undefined,'this independent receiving baseline uses the actual lockfile package, never a fallback compiler');const args=[script,'--version'],stdout=execFileSync(process.execPath,args,{encoding:'utf8',timeout:20000,maxBuffer:1048576});assert.equal(stdout.trim(),'Version 5.9.3');t.diagnostic(JSON.stringify({kind:'actual-lockfile-typescript',executable:process.execPath,args,stdout,packageVersion:pkg.version,lockfileVersion:lock.packages['node_modules/typescript'].version,semanticAuthority:false}));
}

test('genuine borrowed-str const cells, literal and checked const usize retain exact source joins',{timeout:60000},()=>{
 const receipt=qualified(SOURCE);assert.deepEqual(receipt.cells.map(row=>row.value),['É😀','','tail']);assert.deepEqual(receipt.cells.map(row=>row.index),['0','1','2']);assert.ok(receipt.cells.every(row=>row.constant==='LABELS'&&row.length===3&&row.wholeOriginalSource===SOURCE&&row.constantSource.includes('const LABELS')));
 assert.deepEqual(qualified(SOURCE.replaceAll('LABELS','ARBITRARY_OWNER')).cells.map(row=>row.value),['É😀','','tail']);
});
test('genuine reachable primitive const functions reissue independently through CTFE',{timeout:60000},()=>{
 const source=SOURCE.replace('const INDEX:usize=2usize;','const fn choose()->usize{2usize}const INDEX:usize=choose();');assert.deepEqual(qualified(source).cells.map(row=>row.value),['É😀','','tail']);
});
test('unrelated local and parameter formatter indexing keeps the complete original checker result',{timeout:60000},()=>{
 for(const source of [
  'pub fn render()->String{let values=["left","right"];format!("{}",values[0usize+1usize])}fn main(){}',
  'pub fn render(values:[&str;2],index:usize)->String{format!("{}",values[index])}fn main(){}',
 ]){const baseline=checkProgram(parseRust(source));withConstantIndexFormatOperation(()=>{const {program}=checked(source);assert.equal(serializeProgram(program),serializeProgram(baseline));assert.deepEqual(describeConstantIndexFormatProgram(program).cells,[]);});}
});
test('existing emitted JS and independently strict TS execute literal-cell native source edits',{timeout:60000},async t=>{
 const started=performance.now(),after=SOURCE.replace('"É😀"','"λ🧱"'),history=inverse(SOURCE,after);assert.ok(history.beforeMeta&&history.afterMeta);
 assert.deepEqual(qualified(SOURCE).cells.map(row=>row.value),['É😀','','tail']);assert.deepEqual(qualified(after).cells.map(row=>row.value),['λ🧱','','tail']);pinnedCompiler(t);
 // Independent existing renderer baseline. This does NOT install the new
 // production Root/flow hooks or implement emitted-target inverse selection.
 for(const [source,expected] of [[SOURCE,'É😀    ||tail'],[after,'λ🧱    ||tail']]){
  const result=translateSource(source);assert.equal(result.ir.items.map(row=>row.source).join(''),source);assert.equal(result.ir.counts.carried,0);await verifyTypedTargets(result,api=>assert.equal(api.render(),expected),{childTimeoutMs:20000});assert.ok(performance.now()-started<=60000,'original complete case deadline; fit remains UNRUN');
 }
});
test('runtime/local/wrong primitive/owned/late-proof cells refuse rather than acquire permission',{timeout:60000},()=>{
 for(const source of [
  SOURCE.replace('LABELS[0usize]','LABELS[3usize]'),
  SOURCE.replace('LABELS[0usize]','LABELS[0usize+0usize]'),
  SOURCE.replace('LABELS[0usize]','LABELS[0u64]'),
  SOURCE.replace('const INDEX:usize=2usize;','const INDEX:u64=2u64;'),
  SOURCE.replace('pub fn render()->String{','pub fn render()->String{let LABELS=["a","b","c"];'),
  SOURCE.replace('pub fn render()->String{','pub fn render(index:usize)->String{').replace('LABELS[0usize]','LABELS[index]'),
  'const WORDS:[String;1]=[String::new()];pub fn render()->String{format!("{}",WORDS[0usize])}fn main(){}',
  'fn effect()->&\'static str{panic!("effect")}const WORDS:[&str;1]=[effect()];pub fn render()->String{format!("{}",WORDS[0usize])}fn main(){}',
 ])assert.throws(()=>qualified(source),undefined,source);
});
test('fresh public meta and copied proof fields cannot mint a live constant-cell witness',{timeout:60000},()=>{
 assert.throws(()=>withConstantIndexFormatOperation(()=>{const {program}=checked(SOURCE),copy=roundTripProgram(program),node=nodes(copy)[0];copy.verified=true;copy.sourceLinksVerified=true;assert.throws(()=>requireConstantIndexFormatValue(node,copy),/sealed/);}),/invalidated|sealed/);
 assert.throws(()=>withConstantIndexFormatOperation(()=>{const {program}=checked(SOURCE),node=nodes(program)[0];assert.throws(()=>requireConstantIndexFormatValue({...node,verified:true},program),/actual sealed/);}),/invalidated|actual sealed/);
});
test('caught restored checked-body edits poison the source operation and cannot hide behind hashes',{timeout:60000},()=>{
 assert.throws(()=>withConstantIndexFormatOperation(()=>{const {program}=checked(SOURCE),node=nodes(program)[0],original=node.index.value;node.index.value='1';assert.throws(()=>requireConstantIndexFormatValue(node,program),/sealed|changed/);node.index.value=original;}),/invalidated|sealed|changed/);
});
test('actual method identity and fresh checker declaration universe remain mandatory',{timeout:60000},()=>{
 assert.throws(()=>withConstantIndexFormatOperation(()=>{const surface=parseRust(SOURCE),checker=new HostChecker(surface.language,surface.externals??[]);checker.items.set('fake',{k:'fn',constant:true});checkConstantIndexFormatProgram(checker,surface);}),/fresh original/);
 assert.throws(()=>withConstantIndexFormatOperation(()=>{const surface=parseRust(SOURCE),checker=new HostChecker(surface.language,surface.externals??[]);checker.program=()=>({verified:true});checkConstantIndexFormatProgram(checker,surface);}));
 assert.equal(hasCapturedConstantIndexFormatSyntax({},{}),false);assert.equal(hasTypedConstantIndexFormatRead({},{}),false);assert.equal(constantIndexFormatOwnershipFootprint({},{},{}),null);
});
test('crossed genuine same-span constants and own guarded-program substitutes refuse',{timeout:60000},()=>{
 assert.throws(()=>withConstantIndexFormatOperation(()=>{const first=parseRust(SOURCE),other=parseRust(SOURCE.replace('É😀','À😀')),checker=new HostChecker(first.language,first.externals??[]);assert.deepEqual(first.items[0].span,other.items[0].span);first.items[0]=other.items[0];checkConstantIndexFormatProgram(checker,first);}),/original source image/);
 let called=0;assert.throws(()=>withConstantIndexFormatOperation(()=>{const first=parseRust(SOURCE),other=parseRust(SOURCE.replace('É😀','À😀')),crossed=checkProgram(other),checker=new HostChecker(first.language,first.externals??[]);Object.defineProperty(checker,'program',{value(){called++;return crossed;}});checkConstantIndexFormatProgram(checker,first);}),/own checker.program/);assert.equal(called,0);
 let getter=0;assert.throws(()=>withConstantIndexFormatOperation(()=>{const surface=parseRust(SOURCE),checker=new HostChecker(surface.language,surface.externals??[]);Object.defineProperty(checker,'program',{get(){getter++;throw false;}});checkConstantIndexFormatProgram(checker,surface);}),/own checker.program/);assert.equal(getter,0);
});
test('source acquisition rejects getters and proxies before invocation and poisons caught null/false transport',{timeout:60000},()=>{
 for(const location of ['surface','items','item','formatArgument']){let invoked=0;assert.throws(()=>withConstantIndexFormatOperation(()=>{
  const surface=parseRust(SOURCE),checker=new HostChecker(surface.language,surface.externals??[]);
  const getter=()=>{invoked++;throw null;};
  if(location==='surface')Object.defineProperty(surface,'items',{get:getter});
  else if(location==='items')Object.defineProperty(surface.items,'0',{get:getter});
  else if(location==='item')Object.defineProperty(surface.items[0],'k',{get:getter});
  else {const entry=surface.items.find(row=>row.name==='render');let format;function find(node){if(!node||typeof node!=='object')return;if(node.k==='routerFormat')format=node;for(const [key,child] of Object.entries(node))if(!['type','span'].includes(key))for(const value of Array.isArray(child)?child:[child])find(value);}find(entry.body);assert.ok(format);Object.defineProperty(format.args[0],'value',{get:getter});}
  assert.throws(()=>checkConstantIndexFormatProgram(checker,surface),/DATA|accessor/);
 }),/invalidated/);assert.equal(invoked,0,location);}
 let traps=0;assert.throws(()=>withConstantIndexFormatOperation(()=>{const checker=new HostChecker('Rust',[]),surface=new Proxy({items:[]},{get(){traps++;throw false;},ownKeys(){traps++;throw false;}});assert.throws(()=>checkConstantIndexFormatProgram(checker,surface),/ordinary/);}),/invalidated/);assert.equal(traps,0);
 for(const primary of [null,false])assert.throws(()=>withConstantIndexFormatOperation(()=>{try{try{const surface=parseRust(SOURCE),checker=new HostChecker(surface.language,surface.externals??[]);Object.defineProperty(surface,'items',{get(){throw Error('getter must never execute');}});checkConstantIndexFormatProgram(checker,surface);}catch{throw primary;}}catch(error){assert.strictEqual(error,primary);}}),/invalidated/);
});
test('operation lifetime expires and falsy/frozen caller primaries survive complete source closing',{timeout:60000},()=>{
 let program,node;withConstantIndexFormatOperation(()=>{program=checked(SOURCE).program;node=nodes(program)[0];assert.equal(requireConstantIndexFormatValue(node,program),'É😀');});assert.throws(()=>requireConstantIndexFormatValue(node,program),/sealed/);
 for(const primary of [false,undefined,null,Object.freeze({failure:'original caller'})]){let failed=false,caught;try{withConstantIndexFormatOperation(()=>{checked(SOURCE);throw primary;});}catch(error){failed=true;caught=error;}assert.equal(failed,true);assert.strictEqual(caught,primary);}
});
