import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseRust,checkProgram,HostChecker} from '../extensions/host-contracts.mjs';
import {contextualIntegerParseReceiver,contextualIntegerParseTarget} from '../extensions/contextual-integer-parse.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const retain=(name,value)=>{const directory=process.env.ROUTER_CONTEXTUAL_PARSE_VECTOR_DIR;if(!directory)return;mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value,(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item instanceof Map?{$map:[...item]}:item)+'\n');};
const nodes=(node,kind,result=[])=>{if(!node||typeof node!=='object')return result;if(node.k===kind)result.push(node);for(const [key,child]of Object.entries(node))if(key!=='type')Array.isArray(child)?child.forEach(value=>nodes(value,kind,result)):nodes(child,kind,result);return result;};
const integerCases=[['',null],['0',0n],['000',0n],['+0',0n],['+00042',42n],['42',42n],['4294967295',4294967295n],['4294967296',null],['999999999999999999999999',null],['-1',null],[' 1',null],['1 ',null],['1\n',null],['1_000',null],['0xff',null],['1.0',null],['١',null],['１２',null],['😀',null],['\0',null]];
const suffixCases=[...integerCases,['-',null],['+',null],['--',null],['-0',0n],['-000000',0n],['-0001',null],['+4294967295',4294967295n],['+4294967296',null],['-+0',null],['--0',null],['−0',null],['-０',null],['-١',null],['- 0',null],['-0 ',null],['-\t0',null],['-0.0',null]];

test('actual Option fixed payload constrains parse without changing explicit parsing or either target',{timeout:60_000},async()=>{
 const source='pub fn inferred(raw:&str)->Option<u32>{raw.parse().ok()} pub fn explicit(raw:&str)->Option<u32>{raw.parse::<u32>().ok()} pub fn signed(raw:&str)->Option<i64>{raw.parse().ok()}',result=compile(source);retain('01-integer-constraints',{source,result,integerCases});assert.deepEqual(result.meta.refused,[]);
 const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),a=nodes(program.declarations.get('inferred').body,'routerHostCall'),b=nodes(program.declarations.get('explicit').body,'routerHostCall');assert.equal(a.length,1);assert.equal(b.length,1);assert.equal(a[0].id,b[0].id);assert.equal(a[0].contract.instantiation.rustPrimitiveName,'u32');assert.deepEqual(a[0].type,b[0].type);assert.equal(program.declarations.get('inferred').body.operation,'result_ok');
 await verifyTypedTargets(result,api=>{for(const [input,wanted]of integerCases){const expected=wanted===null?none:some(wanted);assert.deepEqual(api.inferred(input),expected);assert.deepEqual(api.explicit(input),expected);}for(const [input,wanted]of [['-9223372036854775808',-(1n<<63n)],['9223372036854775807',(1n<<63n)-1n],['9223372036854775808',null],['-9223372036854775809',null]])assert.deepEqual(api.signed(input),wanted===null?none:some(wanted));assert.throws(()=>api.inferred('\ud800'),TypeError);},{childTimeoutMs:20_000});
});

test('complete unchanged original thinking parent and child sources execute numeric suffix edges',{timeout:60_000},async()=>{
 const read=path=>{const url=new URL(path,root);try{assert.ok(statSync(url).size<4*1024*1024);return readFileSync(url,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;return execFileSync('git',['show','HEAD:'+path],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});}};
 const paths=execFileSync('git',['ls-tree','-r','--name-only','HEAD','--','src'],{cwd:root,encoding:'utf8'}).trim().split('\n'),manifest=read('Cargo.toml'),lock=read('Cargo.lock');
 const originals={};const readSource=path=>originals[path]??=(read(path));
 const result=translateProject({entry:'src/thinking/mod.rs',paths,readSource,cargoManifest:manifest,deriveDependencies:loadDeriveDependencyProof({manifest,lock}),compilationProfile:PRODUCTION_PROFILE});
 retain('02-whole-original-thinking-project',{manifest,lock,originals,result,suffixCases,scope:'complete original thinking parent and its discovered children; full library admission still requires the separate whole-library check'});
 const original=read('src/thinking/parser.rs');assert.equal(hash(original),'7107cb1dab7a488d7abcb10fb8eb1de6888978d4faefdaaac0d573aed5e827c4');
 const entry=result.meta.executable.find(item=>item.source==='src/thinking/parser.rs'&&item.name==='parser.parse_numeric_suffix');assert.ok(entry,JSON.stringify(result.meta.refused.filter(row=>row.file==='src/thinking/parser.rs')));
 assert.ok(result.meta.sources.length>1);for(const row of result.meta.sources)assert.equal(row.sha256,hash(originals[row.source]));assert.equal(result.meta.runtimeParity,false);
 await verifyTypedTargets(result,api=>{for(const [input,wanted]of suffixCases)assert.deepEqual(api['parser.parse_numeric_suffix'](input),wanted===null?none:some(wanted));assert.throws(()=>api['parser.parse_numeric_suffix']('\ud800'),TypeError);},{childTimeoutMs:20_000});
});

test('each fixed primitive retains its own type and constraints do not leak between declarations',{timeout:60_000},async()=>{
 const source='pub fn byte(raw:&str)->Option<u8>{raw.parse().ok()} pub fn signed(raw:&str)->Option<i8>{raw.parse().ok()} pub fn wide(raw:&str)->Option<u128>{raw.parse().ok()}',result=compile(source);retain('03-primitive-identities',{source,result});assert.deepEqual(result.meta.refused,[]);
 await verifyTypedTargets(result,api=>{assert.deepEqual(api.byte('255'),some(255n));assert.deepEqual(api.byte('256'),none);assert.deepEqual(api.signed('-128'),some(-128n));assert.deepEqual(api.signed('128'),none);assert.deepEqual(api.wide('340282366920938463463374607431768211455'),some((1n<<128n)-1n));assert.deepEqual(api.wide('340282366920938463463374607431768211456'),none);assert.deepEqual(api.byte('256'),none);},{childTimeoutMs:20_000});
});

test('unbound noninteger reference and contradictory explicit targets remain refused',()=>{
 const sources=['fn bad(raw:&str)->Option<u32>{let unbound=raw.parse().ok();unbound}','fn bad(raw:&str)->Option<bool>{raw.parse().ok()}','fn bad(raw:&str)->Option<f64>{raw.parse().ok()}','fn bad(raw:&str)->Option<&u32>{raw.parse().ok()}','fn bad(raw:&str)->Option<u32>{raw.parse::<u64>().ok()}','fn bad(raw:&str)->Result<u32,u8>{raw.parse().ok()}','const fn bad(raw:&str)->Option<u32>{raw.parse().ok()}'];
 const rows=sources.map(source=>{const result=translateSource(source,'src/lib.rs');assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);return {source,result};});retain('04-unresolved-or-different-targets',rows);
});

test('custom inherent parse and ok keep ordinary source method selection',{timeout:60_000},async()=>{
 const source='struct Parsed{value:u32} struct Parser{value:u32} impl Parsed{fn ok(&self)->Option<u32>{Some(self.value)}} impl Parser{fn parse(&self)->Parsed{Parsed{value:self.value}}} pub fn custom(value:u32)->Option<u32>{Parser{value}.parse().ok()}',result=compile(source);retain('05-custom-inherent-methods',{source,result});assert.ok(result.meta.executable.some(item=>item.name==='custom'),JSON.stringify(result.meta.refused));
 const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));assert.equal(nodes(program.declarations.get('custom').body,'routerHostCall').length,0);
 await verifyTypedTargets(result,api=>{assert.deepEqual(api.custom(7n),some(7n));assert.deepEqual(api.custom(4294967295n),some(4294967295n));},{childTimeoutMs:20_000});
});

test('shadowed Option imported aliases and standard error families cannot create a constraint',()=>{
 const sources=['enum Option{Some(u32),None} fn bad(raw:&str)->Option{raw.parse().ok()}','use unknown::Option;fn bad(raw:&str)->Option<u32>{raw.parse().ok()}','mod local{pub enum Other{Some(u32),None}}use local::Other as Option;fn bad(raw:&str)->Option{raw.parse().ok()}','mod std{pub mod num{pub struct ParseIntError{value:u32}}} fn bad(raw:&str)->Option<u32>{raw.parse().ok()}'];
 const rows=sources.map(source=>{const result=translateSource(source,'src/lib.rs');assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);return {source,result};});retain('06-shadowed-owner-refusals',rows);
});

test('copied mutated and foreign parser syntax cannot borrow the private constraint',()=>{
 const source='pub fn infer(raw:&str)->Option<u32>{raw.parse().ok()}',surface=parseRust(source+' fn main(){}'),copied=structuredClone(surface);assert.throws(()=>checkProgram(copied),/original standard caller|integer parse target/);
 const changed=parseRust(source+' fn main(){}');changed.items.find(item=>item.name==='infer').body.object.args.push({k:'num',value:'1',span:{start:0,end:1}});assert.throws(()=>checkProgram(changed),/changed|differs/);
 let reads=0;const checker=Object.defineProperty({},'items',{get(){reads++;throw Error('public getter');}}),node=surface.items.find(item=>item.name==='infer').body;
 assert.equal(contextualIntegerParseReceiver(checker,node,new Map(),[],{kind:'data',name:'forged'}),null);assert.equal(contextualIntegerParseTarget(checker,node.object),null);assert.equal(contextualIntegerParseTarget(new HostChecker('Rust',[]),node.object),null);assert.equal(reads,0);
 const hostile=new Proxy(node,{get(){reads++;throw Error('node get');},getOwnPropertyDescriptor(){reads++;throw Error('node descriptor');}});assert.equal(contextualIntegerParseReceiver(checker,hostile,new Map(),[],null),null);assert.equal(contextualIntegerParseTarget(checker,hostile),null);assert.equal(reads,0);
 retain('07-source-association-refusals',{source,surface,copied,changed,reads});
});

test('ordinary receiver expressions execute once and failed checks leave no ambient constraint',{timeout:60_000},async()=>{
 const source='fn text(value:&str)->&str{value}pub fn infer(value:&str)->Option<u32>{text(value).parse().ok()}pub fn loaded(path:&str)->Option<u32>{std::fs::read_to_string(path).ok().and_then(|raw|raw.parse().ok())}',result=compile(source);retain('08-ordinary-calls-and-recovery',{source,result});assert.deepEqual(result.meta.refused,[]);
 const serialized=serializeProgram(checkProgram(parseRust(source+' fn main(){}')));assert.equal(serializeProgram(parseProgram(serialized)),serialized);assert.equal(nodes(parseProgram(serialized).declarations.get('infer').body,'call').length,1);
 await verifyTypedTargets(result,(api,_result,_module,{effects})=>{assert.deepEqual(api.infer('42'),some(42n));assert.deepEqual(api.infer('x'),none);for(const [input,wanted]of [['42',some(42n)],['x',none],[null,none]]){const calls=[],fs={sync:{readFileSync(path){calls.push(['read',path]);if(input===null)throw Object.assign(new Error('missing'),{code:'ENOENT'});return Buffer.from(input);}}};assert.deepEqual(effects.withEffectCapabilities({fs},()=>api.loaded('fixture')),wanted);assert.deepEqual(calls,[['read','fixture']]);}},{childTimeoutMs:20_000});
 const sameSource='fn failed(value:u8)->Option<u32>{value.parse().ok()} fn unbound(value:&str)->Option<u8>{let item=value.parse().ok();item} fn valid(value:&str)->Option<u16>{value.parse().ok()}',surface=parseRust(sameSource+' fn main(){}'),checker=new HostChecker('Rust',[]);
 assert.throws(()=>checker.program(surface),/integer parse requires an actual checked str receiver/);
 const failed=surface.items.find(item=>item.name==='failed'),unbound=surface.items.find(item=>item.name==='unbound'),valid=surface.items.find(item=>item.name==='valid');assert.equal(contextualIntegerParseTarget(checker,failed.body.object),null);
 const check=item=>{const declaration=checker.items.get(item.name);return checker.expr(item.body,new Map([['value',declaration.params[0].type]]),[],declaration.ret);};
 assert.throws(()=>check(unbound),/integer parse target/);const recovered=check(valid);assert.equal(nodes(recovered,'routerHostCall')[0].contract.instantiation.rustPrimitiveName,'u16');assert.equal(contextualIntegerParseTarget(checker,failed.body.object),null);assert.equal(contextualIntegerParseTarget(checker,valid.body.object),null);
 retain('08-same-private-checker-after-failure',{sameSource,surface,recovered,failedIntervalCleared:true,unboundRefused:true});
});
