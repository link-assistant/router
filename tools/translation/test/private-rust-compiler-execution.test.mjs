import {repositorySourcePath} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire,syncBuiltinESMExports} from 'node:module';
import {tmpdir} from 'node:os';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {preparePrivateRustCompilerPlan,writePrivateRustCompilerProposal} from '../prepare-private-rust-compiler.mjs';
import {originalPrivateRustCompilerProgram,preparePrivateRustCompiler,executePrivateRustCompiler} from '../private-rust-compiler-execution.mjs';
import {translateProject} from '../project.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {TokenCursor,tokenize} from '../vendor/meta-language/translation/lexer.js';

const TOOL=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(TOOL,'../..');
const get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
const hash=source=>createHash('sha256').update(source).digest('hex');
let vector=0;
function retain(label,value){
  const root=process.env.ROUTER_PRIVATE_RUST_COMPILER_VECTOR_DIR;
  if(root){mkdirSync(root,{recursive:true});writeFileSync(join(root,String(++vector).padStart(3,'0')+'-'+label+'.json'),JSON.stringify(value,(_,v)=>typeof v==='bigint'?{$bigint:String(v)}:v instanceof Map?{$map:[...v]}:v)+'\n',{flag:'wx'});}
}
function outcome(action){try{return {value:action()};}catch(error){const message=error&&typeof error==='object'?get(error,'message'):null;return {error:{message:message&&Object.hasOwn(message,'value')?message.value:'non-data failure'}};}}
async function asyncOutcome(action){try{return {value:await action()};}catch(error){return outcome(()=>{throw error;});}}
function scratch(t){const root=mkdtempSync(join(tmpdir(),'router-private-rust-proposal-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;}
function write(root,path,source){const file=join(root,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,source);return file;}
function prepare(root){
  const before=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT;
  try{process.env.ROUTER_NATIVE_TS_SOURCE_ROOT=ROOT;return preparePrivateRustCompilerPlan({sourceRoot:root});}
  finally{if(before===undefined)delete process.env.ROUTER_NATIVE_TS_SOURCE_ROOT;else process.env.ROUTER_NATIVE_TS_SOURCE_ROOT=before;}
}
// Trusted source-tool fixtures only. They never become runtime programs.
function fixture(t,{host="import {RustParser} from './core.mjs'; export class HostRustParser extends RustParser {}",extra={}}={}){
  const root=scratch(t),core="async function exposed(name,rules){return name;}\n"
    +"export const {RustParser}=await exposed('rust.js',[['export-parser','class RustParser {','export class RustParser {']]);\n"
    +"export const {Checker}=await exposed('check.js',[['export-checker','class Checker {','export class Checker {']]);\n"
    +"export const {JavaScriptEmitter}=await exposed('emit-javascript.js',[['export-emitter','class JavaScriptEmitter {','export class JavaScriptEmitter {']]);\n";
  const rows={
    'tools/translation/extensions/core.mjs':core,
    'tools/translation/extensions/host-contracts.mjs':host,
    'tools/translation/project.mjs':'export function project(){return 1;}\n',
    'tools/translation/translate.mjs':'export function translate(){return 2;}\n',
    'tools/translation/semantic-meta.mjs':'export function meta(){return 3;}\n',
    'tools/translation/vendor/meta-language/translation/rust.js':"import {kind} from './types.js'; class RustParser {cursor(){return kind;}}\n",
    'tools/translation/vendor/meta-language/translation/check.js':"import {kind} from './types.js'; class Checker {check(){return kind;}}\n",
    'tools/translation/vendor/meta-language/translation/emit-javascript.js':'class JavaScriptEmitter {emit(){return "text";}}\n',
    'tools/translation/vendor/meta-language/translation/types.js':'export const kind="raw";\n',
    'tools/translation/checked-types.mjs':'export const kind="checked";\n',...extra,
  };
  for(const [path,source]of Object.entries(rows))write(root,path,source);
  return {root,rows};
}
function undo(source,edits){let result=source;for(const edit of [...edits].sort((a,b)=>b.start-a.start)){assert.equal(result.slice(edit.start,edit.end),edit.expected);result=result.slice(0,edit.start)+edit.replacement+result.slice(edit.end);}return result;}

test('complete receiving static compiler source graph is retained without issuing an executable program',{timeout:60000},()=>{
  const report=prepare(ROOT);retain('01-complete-receiving-proposal',report);
  assert.equal(report.program,null);assert.equal(report.ready,false);assert.deepEqual(report.authority,{type:false,owner:false,cfg:false,body:false,executable:false});
  assert.ok(report.originalSources.length>=275);assert.ok(report.totals.rawBytes<=4194304);assert.ok(report.totals.compiledBytes<=16777216);
  assert.deepEqual(report.coreVariants,['core-exposed:rust.js','core-exposed:check.js','core-exposed:emit-javascript.js']);
  const names=report.modules.flatMap(row=>row.classes.map(item=>item.name));for(const name of ['TokenCursor','ParameterCursor','HostRustParser','HostChecker','HostEmitter'])assert.ok(names.includes(name),name);
  for(const row of report.originalSources){assert.equal(hash(row.source),row.pin.sha256);assert.equal(Buffer.byteLength(row.source),row.pin.bytes);assert.equal(row.source,readFileSync(join(ROOT,repositorySourcePath(row.path,ROOT)),'utf8'));}
  if(fs.existsSync(join(ROOT,'tools/translation/extensions/callback-local-control.mjs')))assert.ok(report.modules.some(row=>row.path==='tools/translation/extensions/callback-local-control.mjs'));
  for(const gate of ['esm-cjs-live-binding-tdz','imported-call-this-and-namespace','complete-native-host-and-private-escape','tla-staging','dynamic-execution-closure'])assert.ok(report.blockers.some(row=>row.gate===gate),gate);
});

test('actual language recipes and exact URL source edits precede candidate packaging',{timeout:60000},t=>{
  const input=fixture(t,{extra:{'tools/translation/project.mjs':"import {Checker} from './vendor/meta-language/translation/check.js'; export const location=import.meta.url; export function project(){return Checker;}\n"}}),report=prepare(input.root);
  retain('02-complete-source-transform',report);assert.equal(report.program,null);
  assert.deepEqual(report.trace,[{phase:'language',id:'private-rust:complete-source-graph-and-lexical-census'},{phase:'repository',id:'private-rust:canonical-urls-cjs-candidates-and-closed-report'}]);
  assert.ok(report.modules.some(row=>row.id==='core-exposed:check.js'));assert.ok(report.modules.some(row=>row.id==='tools/translation/vendor/meta-language/translation/check.js'));
  for(const name of ['rust.js','check.js','emit-javascript.js']){
    const row=report.modules.find(row=>row.id==='core-exposed:'+name);let source=input.rows[row.path];for(const rule of row.language){assert.equal(source.split(rule.expected).length,2);source=source.replace(rule.expected,rule.replacement);}assert.equal(row.source,source);
  }
  const project=report.modules.find(row=>row.path==='tools/translation/project.mjs');assert.equal(project.normalization.edits.length,1);assert.ok(project.normalization.source.includes(JSON.stringify(pathToFileURL(join(input.root,project.path)).href)));
  for(const row of report.modules){assert.equal(undo(row.normalization.source,row.normalization.reverse),row.source);assert.equal(hash(row.candidateCommonJS),row.candidatePin.sha256);assert.ok(row.candidateStatus.startsWith('NOTEXECUTABLE'));}
  const output=scratch(t),file=writePrivateRustCompilerProposal(report,output),readback=JSON.parse(readFileSync(file,'utf8'));retain('02-full-proposal-readback',{file,readback});assert.deepEqual(readback,report);assert.throws(()=>writePrivateRustCompilerProposal(report,output));assert.throws(()=>writePrivateRustCompilerProposal(report,input.root));
  const links=scratch(t),direct=join(links,'source-link'),ancestor=join(links,'ancestor-link'),child='must-not-be-created';symlinkSync(input.root,direct,'dir');symlinkSync(input.root,ancestor,'dir');
  const before={names:fs.readdirSync(input.root),proposal:fs.existsSync(join(input.root,'complete-source-proposal.json')),child:fs.existsSync(join(input.root,child))};
  const directResult=outcome(()=>writePrivateRustCompilerProposal(report,direct)),ancestorResult=outcome(()=>writePrivateRustCompilerProposal(report,join(ancestor,child))),after={names:fs.readdirSync(input.root),proposal:fs.existsSync(join(input.root,'complete-source-proposal.json')),child:fs.existsSync(join(input.root,child))};
  retain('02-physical-output-separation',{sourceRoot:input.root,direct,ancestor,child,before,directResult,ancestorResult,after});assert.equal(before.proposal,false);assert.equal(before.child,false);assert.deepEqual(after,before);assert.match(directResult.error.message,/outside source root/u);assert.match(ancestorResult.error.message,/outside source root/u);
});

test('cycles top-level-await private methods namespaces and dynamic imports remain explicit proof gates',{timeout:60000},t=>{
  const input=fixture(t,{host:"import {answer} from './cycle.mjs'; export class HostRustParser {#method(){return answer;} read(){return this.#method();}}\n",extra:{
    'tools/translation/extensions/cycle.mjs':"import * as host from './host-contracts.mjs'; export const answer=await Promise.resolve(1); export function read(){return host.HostRustParser;} export function load(value){return import(value);}\n",
  }}),report=prepare(input.root);retain('03-complete-open-closure',report);
  assert.equal(report.program,null);assert.equal(report.ready,false);assert.ok(report.scc.some(group=>group.includes('tools/translation/extensions/host-contracts.mjs')&&group.includes('tools/translation/extensions/cycle.mjs')));
  const cycle=report.modules.find(row=>row.path.endsWith('/cycle.mjs'));assert.equal(cycle.awaits.filter(row=>row.topLevel).length,1);assert.equal(cycle.dynamic.filter(row=>row.kind==='import').length,1);assert.ok(cycle.bindings.some(row=>row.kind==='namespace'));assert.ok(cycle.importedReferences.some(row=>row.context==='namespace-or-property-base'));
  const host=report.modules.find(row=>row.path.endsWith('/host-contracts.mjs'));assert.ok(host.classes.some(row=>row.members.some(member=>member.private&&member.name==='#method')));assert.ok(report.blockers.some(row=>row.gate==='dynamic-execution-closure'&&row.module===cycle.id));
});

test('unprepared runtime never reads a copied foreign proxy or request and cannot return classes',{timeout:60000},async()=>{
  let calls=0;const hook=()=>{calls++;throw 293;},foreign=new Proxy({ready:true,program:{}},{get:hook,ownKeys:hook,getPrototypeOf:hook,getOwnPropertyDescriptor:hook});
  const rows=[outcome(()=>originalPrivateRustCompilerProgram()),outcome(()=>executePrivateRustCompiler(foreign,foreign)),outcome(()=>executePrivateRustCompiler({},{})),outcome(()=>executePrivateRustCompiler()),await asyncOutcome(()=>preparePrivateRustCompiler())];
  retain('04-runtime-unavailability',{rows,calls,scope:'PROGRAMnull: these are unavailable-entry controls, not a qualified private compiler or constructor capability.'});assert.equal(rows[0].value,null);for(const row of rows.slice(1))assert.match(row.error.message,/complete module semantics and native escape closure remain unproved/u);assert.equal(calls,0);
});

test('source tool retains actual read and hash work without claiming hostile-native execution authority',{timeout:60000},t=>{
  const input=fixture(t),owner=Object.getPrototypeOf(createHash('sha256')),prior=get(owner,'update'),read=get(fs,'readFileSync'),tape=[],reads=[];let report,failure;
  try{
    define(owner,'update',{...prior,value:function(value,...args){tape.push({kind:typeof value,source:typeof value==='string'?value:Buffer.from(value).toString('utf8')});return apply(prior.value,this,[value,...args]);}});
    define(fs,'readFileSync',{...read,value:function(...args){reads.push({file:typeof args[0]==='string'?args[0]:String(args[0]),args:args.length});return apply(read.value,this,args);}});syncBuiltinESMExports();
    const result=outcome(()=>prepare(input.root));report=result.value;failure=result.error;
  }finally{define(owner,'update',prior);define(fs,'readFileSync',read);syncBuiltinESMExports();}
  retain('05-complete-root-tool-observations',{report,failure,tape,reads,scope:'Root-controlled stock generator domain; no hostile callback or historical source execution theorem.'});assert.equal(failure,undefined);assert.equal(report.program,null);assert.ok(tape.length>0);assert.ok(reads.length>0);for(const row of report.originalSources)assert.ok(tape.some(item=>item.source===row.source));
});

test('unknown source imports malformed bytes and linked complete source refuse or stay blocked',{timeout:60000},t=>{
  const input=fixture(t,{host:"import unknown from 'foreign-loader'; export class HostRustParser {}\n"}),report=prepare(input.root);retain('06-unknown-import',report);assert.equal(report.ready,false);assert.ok(report.blockers.some(row=>row.gate==='unknown-external'&&row.specifier==='foreign-loader'));
  const bad=fixture(t),badFile=join(bad.root,'tools/translation/project.mjs');writeFileSync(badFile,Buffer.from([0xff,0x00]));const bytes=outcome(()=>prepare(bad.root));
  const linked=fixture(t),file=join(linked.root,'tools/translation/project.mjs'),target=join(linked.root,'original-project.mjs');writeFileSync(target,'export const x=1;');rmSync(file);symlinkSync(target,file);const link=outcome(()=>prepare(linked.root));
  const malformed=fixture(t,{host:'export class HostRustParser { method( {\n'}),syntax=prepare(malformed.root);retain('06-complete-refusals',{bytes,link,syntax});assert.match(bytes.error.message,/complete well-formed UTF8/u);assert.match(link.error.message,/linked source component/u);assert.equal(syntax.ready,false);assert.ok(syntax.blockers.some(row=>row.gate==='grammar'));
});

test('independent original cursor and actual checked compiler oracle remain separate from private availability',{timeout:60000},async()=>{
  const source='pub fn answer(value:u8)->u8{value+1u8} pub fn choose(value:u8)->bool{match value {0u8=>true,_=>false}}',tokenization=tokenize('alpha + beta','Rust'),{tokens}=tokenization,cursor=new TokenCursor(tokens,'Rust'),observations=[];
  observations.push({peek:cursor.peek(),kind:cursor.isKind('identifier'),same:cursor.is('alpha'),index:cursor.index});observations.push({next:cursor.next(),index:cursor.index});observations.push({eat:cursor.eat('+'),identifier:cursor.identifier('oracle'),eof:cursor.atEnd()});
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source}),canonical=JSON.stringify(result.meta.checkedSemanticProgram),program=parseProgram(canonical);retain('07-full-original-oracle',{source,tokenization,tokens,observations,result,canonical,program,scope:'PUBLIC original cursor/compiler oracle only. B1 private execution remains unavailable; no public class/source-proof promotion.'});
  assert.equal(observations[0].same,true);assert.equal(observations[1].next.value,'alpha');assert.equal(observations[2].identifier.value,'beta');assert.equal(observations[2].eof,true);assert.deepEqual(result.meta.refused,[]);assert.equal(serializeProgram(program),canonical);
  await verifyTypedTargets(result,api=>{const actual={answer:api.answer(2n),yes:api.choose(0n),no:api.choose(1n)};retain('07-original-targets',actual);assert.deepEqual(actual,{answer:3n,yes:true,no:false});},{childTimeoutMs:20000});
});

test('strict TypeScript requires explicit context and request but grants no runtime preparation',{timeout:60000},t=>{
  const root=scratch(t),contract=join(root,'contract.mts'),source='import {executePrivateRustCompiler,preparePrivateRustCompiler} from '+JSON.stringify(join(TOOL,'private-rust-compiler-execution.mjs'))+';\n'
    +'void preparePrivateRustCompiler();\n'
    +'// @ts-expect-error explicit context and request are required\nexecutePrivateRustCompiler();\n'
    +'// @ts-expect-error explicit request is required\nexecutePrivateRustCompiler({});\n'
    +'executePrivateRustCompiler({},{});\n';writeFileSync(contract,source);
  const require=createRequire(join(ROOT,'js/package.json')),compiler=require.resolve('typescript/bin/tsc'),child=spawnSync(process.execPath,[compiler,'--strict','--allowJs','--skipLibCheck','--target','ES2022','--module','NodeNext','--noEmit',contract],{encoding:'utf8',timeout:20000,maxBuffer:8388608});
  retain('08-complete-strict-contract',{source,child:{status:child.status,stdout:child.stdout,stderr:child.stderr,error:child.error?.message},runtime:outcome(()=>executePrivateRustCompiler({},{}))});assert.equal(child.status,0,child.stdout+'\n'+child.stderr);assert.equal(originalPrivateRustCompilerProgram(),null);
});
