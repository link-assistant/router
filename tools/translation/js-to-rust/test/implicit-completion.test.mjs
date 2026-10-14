import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {analyzeJavaScript,translateJavaScript,parseMeta,emitRust,emitTypeScript,TranslationError} from '../translator.mjs';
import {toLino} from '../vendor/ir.mjs';
import {evaluate} from '../interpreter.mjs';
import {loadTypeScript} from '../native-typescript.mjs';
import {ownershipSyntax} from '../vendor/module-syntax.mjs';
const WORK=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..'),ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??WORK,hash=value=>createHash('sha256').update(value).digest('hex');
const vectors={schema:'original-implicit-completion-v1',host:process.versions.bun?'Bun '+process.versions.bun:'Node '+process.version,rustCompiled:false,runtimeParity:false,census:[],bodies:[],refusedEmptyBodies:[],semantics:[],negatives:[]};
const save=()=>{if(process.env.ROUTER_IMPLICIT_VECTORS)writeFileSync(process.env.ROUTER_IMPLICIT_VECTORS,JSON.stringify(vectors,null,2)+'\n');};
const camel=name=>name.replace(/_([a-z])/gu,(_,char)=>char.toUpperCase());
async function runtimes(original,typescript,directory,label){
  const ts=loadTypeScript(ROOT),originalPath=join(directory,label+'.original.mjs'),typedPath=join(directory,label+'.ts'),compiledPath=join(directory,label+'.compiled.mjs');writeFileSync(originalPath,original);writeFileSync(typedPath,typescript);
  const checked=ts.createProgram([typedPath],{strict:true,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext});assert.deepEqual(ts.getPreEmitDiagnostics(checked).map(error=>ts.flattenDiagnosticMessageText(error.messageText,'\n')),[]);
  writeFileSync(compiledPath,ts.transpileModule(typescript,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);return [await import(pathToFileURL(originalPath).href),await import(pathToFileURL(compiledPath).href)];
}
function inputs(effects){const revoked=Proxy.revocable({},{});revoked.revoke();return [
 ['undefined',undefined],['null',null],['false',false],['true',true],['zero',0],['negative-zero',-0],['NaN',NaN],['positive-infinity',Infinity],['negative-infinity',-Infinity],['bigint-zero',0n],['huge-bigint',2n**2048n],['symbol',Symbol('opaque')],['function',()=>{}],['array',[]],['object',{}],['boxed-string',new String('boxed')],['boxed-number',new Number(1)],['revoked-proxy',revoked.proxy],['hooks',{get field(){effects.count++;throw Error('no getter');},[Symbol.toPrimitive](){effects.count++;throw Error('no coercion');}}],['empty-string',''],['lone-high','\ud800'],['lone-low','\udc00'],['surrogate-pair','🧪']];}
test('all52 original modules retain both complete censuses and independently execute all18 genuine empty callback bodies',{timeout:60000},async()=>{
  const paths=execFileSync('git',['ls-files','-z','--','packages/javascript/native/*.mjs'],{cwd:WORK,encoding:'utf8'}).split('\0').filter(Boolean);assert.equal(paths.length,52);
  const selected=[],totals={top:0,topTranslated:0,scoped:0,full:0,conditional:0};
  for(const path of paths){const source=readFileSync(join(WORK,path),'utf8'),analysis=analyzeJavaScript(source,{sourcePath:path}),syntax=ownershipSyntax(source),bySpan=new Map();function visit(node){if(syntax.ts.isArrowFunction(node)||syntax.ts.isFunctionExpression(node)||syntax.ts.isFunctionDeclaration(node))bySpan.set(node.getStart(syntax.file)+':'+node.end,node);syntax.ts.forEachChild(node,visit);}visit(syntax.file);
    assert.equal(analysis.scopedFunctions.complete,true);totals.top+=analysis.items.length;totals.topTranslated+=analysis.program.length;totals.scoped+=analysis.scopedFunctions.sourceItems;totals.full+=analysis.scopedFunctions.fullDomainTranslatedItems;totals.conditional+=analysis.scopedFunctions.conditionalPrivateBodyDraftItems;
    vectors.census.push({path,bytes:Buffer.byteLength(source),sha256:hash(source),source,analysis});
    for(const row of analysis.scopedFunctions.items){const node=bySpan.get(row.start+':'+row.end);assert.ok(node,'genuine original AST span');if(!syntax.ts.isBlock(node.body)||node.body.statements.length!==0||node.parameters.length!==0)continue;
      if(node.modifiers?.some(modifier=>modifier.kind===syntax.ts.SyntaxKind.AsyncKeyword)){assert.equal(row.status,'unsupported');assert.equal(row.diagnostic.kind,'async');vectors.refusedEmptyBodies.push({path,sourceSha256:hash(source),row,originalSource:source.slice(row.start,row.end)});continue;}
      assert.equal(row.status,'translated');assert.equal(row.coverageContract,'full-domain-body');assert.equal(row.owner.status,'unsupported');assert.deepEqual(row.captures,[]);assert.equal(source.slice(row.start,row.end),node.getText(syntax.file));const fn=analysis.scopedFunctions.program.find(fn=>fn.name===row.name);assert.deepEqual(parseMeta(toLino(fn)),[fn]);assert.equal(fn.returns,'undefined');assert.equal(fn.params.length,0);assert.deepEqual(fn.body,[{kind:'return',value:{kind:'undefined',type:'undefined'}}]);selected.push({path,source,row,fn});
    }
  }
  assert.deepEqual(totals,{top:788,topTranslated:73,scoped:705,full:54,conditional:9});assert.equal(selected.length,18);assert.equal(vectors.refusedEmptyBodies.length,2);
  const program=selected.map(row=>row.fn),meta=program.map(toLino).join('\n');assert.deepEqual(parseMeta(meta),program);const typed=emitTypeScript(program),rust=emitRust(program),original=selected.map((row,index)=>`export const original${index}=(${row.source.slice(row.row.start,row.row.end)});`).join('\n'),typescript=typed+'\nexport {'+selected.map((row,index)=>camel(row.fn.name)+' as original'+index).join(',')+'};';
  const directory=mkdtempSync(join(tmpdir(),'router-implicit-original-bodies-'));try{const runtimes_=await runtimes(original,typescript,directory,'original18'),effects={count:0},values=inputs(effects);
    for(const [index,row]of selected.entries()){const observations=[];for(const [label,value]of values)for(const args of [[],[value],[value,undefined,Symbol('extra')]]){
      const results=[Reflect.apply(runtimes_[0]['original'+index],value,args),Reflect.apply(runtimes_[1]['original'+index],value,args),evaluate(program,row.fn.name,args)];for(const result of results)assert.strictEqual(result,undefined);observations.push({label,argumentCount:args.length,expected:{undefined:true},results:results.map(()=>({undefined:true}))});
    }assert.equal(runtimes_[0]['original'+index].length,0);assert.equal(runtimes_[1]['original'+index].length,0);assert.match(rust,new RegExp('fn '+row.fn.name+'\\(\\) -> JsUndefined'));vectors.bodies.push({path:row.path,sourceSha256:hash(row.source),span:{start:row.row.start,end:row.row.end,encoding:'utf16'},originalSource:row.source.slice(row.row.start,row.row.end),row:row.row,program:row.fn,meta:toLino(row.fn),observations});}
    assert.equal(effects.count,0);vectors.actualOriginalTargets={original,typescript,rust,meta,totals,opaqueEffects:effects.count};save();
  }finally{rmSync(directory,{recursive:true,force:true});}
});
test('ordinary completion bare return ASI comments Unicode and unused pure bindings retain undefined independently from null',async()=>{
  const source=`export function empty(){}; export const arrow=()=>{};
export function bare(){return;} export function end(){return /*same line*/}
export function lines(){return\r\n/*comment*/}\nexport function unicode(){return\u2028/*comment*/}\nexport function paragraph(){return\u2029}\nexport function semis(){;;;;}
export function discarded(value){const alias=value;const allocation=[value,null,undefined];}
export function nil(){return null;} export function explicit(){return undefined;}
/** @param {boolean} yes */ export function maybe(yes){if(yes){return 7;}}
export function shadowedReturn(){return /*ordinary*/;}`;
  const result=translateJavaScript(source,{lossless:true}),directory=mkdtempSync(join(tmpdir(),'router-implicit-semantic-'));assert.deepEqual(parseMeta(result.meta),result.program);
  try{const [original,typed]=await runtimes(source,result.typescript,directory,'semantics'),effects={count:0};for(const name of ['empty','arrow','bare','end','lines','unicode','paragraph','semis','discarded','explicit','shadowedReturn'])for(const [label,value]of inputs(effects)){for(const invoke of [original[name],typed[name],(...args)=>evaluate(result.program,name.replace(/[A-Z]/gu,char=>'_'+char.toLowerCase()),args)])assert.strictEqual(invoke(value,Symbol('extra')),undefined);vectors.semantics.push({name,label,expected:{undefined:true}});}
    assert.strictEqual(original.nil(),null);assert.strictEqual(typed.nil(),null);assert.strictEqual(evaluate(result.program,'nil',[]),null);for(const value of [true,false])for(const invoke of [original.maybe,typed.maybe,value=>evaluate(result.program,'maybe',[value])])assert.strictEqual(invoke(value),value?7:undefined);assert.equal(effects.count,0);
    assert.match(result.rust,/fn empty\(\) -> JsUndefined/);assert.match(result.rust,/fn nil\(\) -> JsNull/);assert.doesNotMatch(result.rust,/fn empty\(\) -> \(\)/);assert.match(result.typescript,/function empty\(\): undefined/);assert.throws(()=>parseMeta(result.meta.replace('(returns undefined)','(returns null)')));assert.throws(()=>parseMeta('(function missing (parameters) (returns undefined) (body))'),/path without a return/);vectors.semanticTargets={source,program:result.program,meta:result.meta,typescript:result.typescript,rust:result.rust};save();
  }finally{rmSync(directory,{recursive:true,force:true});}
});
test('ASI operands unsupported effects async captures and false return tags remain refused',()=>{
  const cases=[
    'export function line(){return\n42;}','export function cr(){return\r42;}','export function separator(){return\u202842;}','export function paragraph(){return\u202942;}','export function comment(){return/*\n*/42;}','export function commented(){return//ignored\n42;}',
    'export function effect(value){const ignored=value.field;}','export function effect(value){const ignored=String(value);}','export function effect(){sideEffect();}','export async function effect(){}','export function* effect(){yield 1;}','export function effect(value=sideEffect()){}',
    '/** @returns {number} */ export function wrong(){}','/** @returns {number} */ export function wrong(){return;}','/** @param {boolean} yes @returns {number} */ export function wrong(yes){if(yes){return 1;}}','export function unterminated(){','export function unreachable(){return;sideEffect();}',
  ];for(const source of cases){const analysis=analyzeJavaScript(source);assert.ok(analysis.diagnostics.length,source);assert.throws(()=>translateJavaScript(source),TranslationError,source);vectors.negatives.push({source,analysis});}
  const original=Function('return function line(){return\n42;}')();assert.strictEqual(original(),undefined);let effects=0;const harmless=Function('hook','return function guarded(){return\n hook();}')(function(){effects++;throw Error('unreachable');});assert.strictEqual(harmless(),undefined);assert.equal(effects,0);
  for(const body of ['captured=1;const callback=()=>{const value=captured;};','const callback=()=>{const value=this;};','const callback=()=>{const value=arguments;};','const callback=async()=>{};','const callback=(value=sideEffect())=>{};']){const source='export function owner(captured){'+body+'}',analysis=analyzeJavaScript(source);assert.equal(analysis.program.length,0);assert.equal(analysis.scopedFunctions.translatedItems,0);vectors.negatives.push({source,analysis});}
  for(const source of ['export function shadow(){const undefined=7;return undefined;}','export function shadow(Number){const observed=Number.isFinite(1);}'])assert.throws(()=>translateJavaScript(source),TranslationError);save();
});

test('every ECMAScript whitespace codepoint delimits identifiers and original line terminators retain restricted-production ASI',async()=>{
  const spaces=[9,10,11,12,13,32,160,5760,...Array.from({length:11},(_,index)=>8192+index),8232,8233,8239,8287,12288,65279],lines=new Set([10,13,8232,8233]),directory=mkdtempSync(join(tmpdir(),'router-completion-spaces-')),sources=[];
  for(const unit of spaces){const space=String.fromCharCode(unit),name='space'+unit,source=`export function ${name}(){return${space}${lines.has(unit)?'}':'7;}'}
`;sources.push({unit,name,source,expected:lines.has(unit)?undefined:7});}
  const source=sources.map(row=>row.source).join(''),result=translateJavaScript(source);try{const [original,typed]=await runtimes(source,result.typescript,directory,'spaces');for(const row of sources){assert.strictEqual(original[row.name](),row.expected);assert.strictEqual(typed[row.name](),row.expected);assert.strictEqual(evaluate(result.program,row.name,[]),row.expected);vectors.semantics.push({whitespaceCodepoint:row.unit,source:row.source,expected:row.expected===undefined?{undefined:true}:{number:7}});}vectors.whitespaceTargets={source,program:result.program,meta:result.meta,typescript:result.typescript,rust:result.rust};save();}finally{rmSync(directory,{recursive:true,force:true});}
});
