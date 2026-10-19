import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {analyzeJavaScript,translateJavaScript,parseMeta,emitRust,emitTypeScript,TranslationError} from '../translator.mjs';
import {toLino} from '../vendor/ir.mjs';
import {parseSequencePattern,sequencePattern,matchesSequence,sequenceStates,validateSequencePattern} from '../vendor/sequence-patterns.mjs';
import {evaluate} from '../interpreter.mjs';
import {loadTypeScript} from '../native-typescript.mjs';

const ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const vectors={schema:'original-sequence-body-v1',host:process.versions.bun?'Bun '+process.versions.bun:'Node '+process.version,rustCompiled:false,census:[],originalBodies:[],boundaries:[],negatives:[]};
const save=()=>{if(process.env.ROUTER_REVERSE_VECTORS)writeFileSync(join(process.env.ROUTER_REVERSE_VECTORS,'sequence-patterns.json'),JSON.stringify(vectors,null,2)+'\n');};
const hash=value=>createHash('sha256').update(value).digest('hex');
async function runtimes(source,program,directory,label) {
  const typescript=emitTypeScript(program)+program.filter(fn=>!fn.exported).map(fn=>'\nexport {'+fn.name.replace(/_([a-z])/gu,(_,letter)=>letter.toUpperCase())+'};\n').join(''),rust=emitRust(program),ts=loadTypeScript(ROOT),typed=join(directory,label+'.ts'),target=join(directory,label+'-target.mjs'),original=join(directory,label+'-original.mjs');
  writeFileSync(original,source);writeFileSync(typed,typescript);
  const compilation=ts.createProgram([typed],{strict:true,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext});
  assert.deepEqual(ts.getPreEmitDiagnostics(compilation).map(row=>ts.flattenDiagnosticMessageText(row.messageText,'\n')),[]);
  writeFileSync(target,ts.transpileModule(typescript,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
  return {typescript,rust,original:await import(pathToFileURL(original).href),typed:await import(pathToFileURL(target).href)};
}

test('two genuine guarded native bodies independently preserve every public value category',{timeout:60000},async()=>{
  const directory=mkdtempSync(join(tmpdir(),'router-sequence-native-'));let hooks=0;
  const opaque={get toString(){hooks++;throw Error('forbidden coercion');},get [Symbol.toPrimitive](){hooks++;throw Error('forbidden primitive lookup');}};
  const unknown=[undefined,null,true,false,NaN,Infinity,-Infinity,0,-0,1,2n**4096n,Symbol('value'),()=>{},[],{},new String('a/b'),new Number(0),opaque];
  const spaces=[9,10,11,12,13,32,160,5760,...Array.from({length:11},(_,i)=>8192+i),8232,8233,8239,8287,12288,65279];
  const repository=[...unknown.map(value=>[value,true]),['',true],['a',true],['/a',true],['a/',true],['a/b/c',true],['a/b\r\n',true],['a/b',false],['\ud800/\udfff',false],['😀/é',false],['a\0/b',false],['a\u0085/b',false],['a\u180e/b',false],...spaces.map(unit=>['a'+String.fromCharCode(unit)+'/b',true]),...spaces.map(unit=>['a/b'+String.fromCharCode(unit),true])];
  const zeroes=[...unknown.map(value=>[value,false]),['',false],['0'.repeat(39),false],['0'.repeat(40),true],['0'.repeat(41),true],['0'.repeat(8192),true],['0'.repeat(40)+'\n',false],['0'.repeat(40)+'\r\n',false],['0'.repeat(40)+'\r',false],['0'.repeat(40)+'\u2029',false],['0'.repeat(40)+'\u2028',false],['0'.repeat(40)+'\ud800',false],['1'+'0'.repeat(40),false]];
  try {
    for(const fixture of [{file:'tokens.mjs',start:4090,cases:repository,arity:1},{file:'github-proxy.mjs',start:2346,cases:zeroes,arity:2}]) {
      const path='js/src/'+fixture.file,source=readFileSync(join(ROOT,path),'utf8'),analysis=analyzeJavaScript(source,{sourcePath:path}),row=analysis.scopedFunctions.items.find(row=>row.start===fixture.start),fn=analysis.scopedFunctions.program.find(fn=>fn.name===row?.name);
      assert.equal(row.status,'translated');assert.equal(row.coverageContract,'full-domain-body');assert.equal(row.owner.status,'unsupported');assert.deepEqual(row.captures,[]);assert.equal(fn.conditionalInputs,undefined);assert.equal(fn.lossless,true);assert.deepEqual(fn.params.map(param=>param.type),Array(fixture.arity).fill('value'));
      const meta=toLino(fn),program=parseMeta(meta);assert.deepEqual(program,[fn]);const name=fn.name.replace(/_([a-z])/gu,(_,letter)=>letter.toUpperCase()),originalSource='export const '+name+'=('+source.slice(row.start,row.end)+');',runtime=await runtimes(originalSource,program,directory,fixture.file),observations=[];
      const observation={path,sourceSha256:hash(source),fullOriginalBody:source.slice(row.start,row.end),row,program,meta,typescript:runtime.typescript,rust:runtime.rust,observations};vectors.originalBodies.push(observation);save();
      for(const[input,want]of fixture.cases)for(const key of fixture.arity===2?['afteroid','other',...unknown]:[undefined]) {
        const args=fixture.arity===2?[key,input]:[input],expected=fixture.arity===2&&key!=='afteroid'?false:want;
        for(const invoke of [runtime.original[name],runtime.typed[name],(...args)=>evaluate(program,fn.name,args)])assert.equal(invoke(...args),expected);
        observations.push({input:typeof input==='string'?{string:input}:{category:typeof input,null:input===null,negativeZero:Object.is(input,-0)},key:typeof key==='string'?key:{category:typeof key},expected});
      }
      assert.match(runtime.rust,/JsPayload<'a>/u);assert.match(runtime.rust,/fn js_sequence_test/u);assert.match(runtime.rust,/as_utf16\(\)/u);
      save();
    }
    assert.equal(hooks,0);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('bounded sequence states match independent literal goldens and original RegExp across UTF16 boundaries',{timeout:60000},async()=>{
  const fixtures=[
    {text:'/^[a-c]+[b-d]*$/',cases:[['',false],['abc',true],['aaad',true],['d',false],['abcd\n',false],['abbdddd',true]]},
    {text:'/^a{2,4}b?$/',cases:[['a',false],['aa',true],['aaaa',true],['aaaaa',false],['aab',true],['aaaabb',false]]},
    {text:'/^a*ab$/',cases:[['ab',true],['aaab',true],['a',false],['b',false]]},
    {text:'/^[^]*$/',cases:[['',true],['😀\n\ud800',true]]},
    {text:String.raw`/^[\ud800-\udfff]{2}$/`,cases:[['😀',true],['\ud800\udfff',true],['\ud800',false]]},
    {text:String.raw`/^[\u{1f600}]{2}$/u`,cases:[['😀😀',true],['😀',false],['\ud800\udfff',false]]},
    {text:String.raw`/^\s{2}$/u`,cases:[[' \ufeff',true],['\u0085 ',false],['\u180e ',false],['\u2028\u2029',true]]},
    {text:'/^[]*$/',cases:[['',true],['a',false]]},
    {text:String.raw`/^\[a\]\.\$$/u`,cases:[['[a].$',true],['a.$',false]]},
  ];
  const directory=mkdtempSync(join(tmpdir(),'router-sequence-boundary-'));
  try {
    for(let index=0;index<fixtures.length;index++) {
      const fixture=fixtures[index],model=parseSequencePattern(fixture.text),name='boundary'+index,source=`export function ${name}(value){return typeof value==='string' && ${fixture.text}.test(value);}`,result=translateJavaScript(source,{lossless:true}),runtime=await runtimes(source,parseMeta(result.meta),directory,name),oracle=new RegExp(fixture.text.slice(1,fixture.text.lastIndexOf('/')),fixture.text.slice(fixture.text.lastIndexOf('/')+1));
      for(const[input,expected]of fixture.cases){assert.equal(oracle.test(input),expected,fixture.text);assert.equal(matchesSequence(model,input),expected);assert.equal(runtime.original[name](input),expected);assert.equal(runtime.typed[name](input),expected);assert.equal(evaluate(result.program,name,[input]),expected);}
      for(const first of ['', 'a','b','d','\n','\r','\ud800','\udfff','😀','\u2028'])for(const second of ['', 'a','b','d','\n','\ud800','😀']) {
        const input=first+second,expected=oracle.test(input);assert.equal(matchesSequence(model,input),expected,fixture.text+JSON.stringify(input));assert.equal(runtime.typed[name](input),expected);assert.equal(evaluate(result.program,name,[input]),expected);
      }
      vectors.boundaries.push({fixture,model,canonicalPattern:sequencePattern(model),states:sequenceStates(model),program:result.program,meta:result.meta,typescript:runtime.typescript,rust:runtime.rust});save();
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('coercion unsupported regexp operators mutations and malformed or oversized meta fail closed',()=>{
  const patterns=['/^[a]+$/g','/^[a]+$/y','/^[a]+$/m','/^[a]+$/i','/^a(?=b)$/','/^(a)+$/','/^a|b$/','/^\\b[a]+$/','/^\\1$/','/^a+?$/','/^a{513}$/','/^a{2,1}$/','/^a{01}$/','/^'+Array(65).fill('[a]').join('')+'$/','/^'+Array(9).fill('a{512}').join('')+'$/'];
  for(const pattern of patterns){assert.throws(()=>parseSequencePattern(pattern));const source=`export function rejected(value){return typeof value==='string' && ${pattern}.test(value);}`;assert.throws(()=>translateJavaScript(source,{lossless:true}),TranslationError);vectors.negatives.push({source,analysis:analyzeJavaScript(source,{lossless:true})});}
  for(const source of ['export const refused=value=>/^[a]+$/.test(value);','export const refused=value=>value && /^[a]+$/.test(value);','export const refused=value=>/^[a]+$/.test(String(value));']){assert.throws(()=>translateJavaScript(source,{lossless:true}),TranslationError);vectors.negatives.push({source,analysis:analyzeJavaScript(source,{lossless:true})});}
  const original='function owner(){return value=>typeof value==="string" && /^[a]+$/.test(value);}';
  for(const mutation of ['RegExp.prototype.test=custom;','RegExp["prototype"]["test"]=custom;','const escaped=RegExp;','Reflect.set(RegExp.prototype,"test",custom);','globalThis.RegExp=custom;']){const source=mutation+original,analysis=analyzeJavaScript(source);assert.equal(analysis.scopedFunctions.translatedItems,0);vectors.negatives.push({source,analysis});}
  const model=parseSequencePattern('/^a{2,4}$/');
  for(const change of [m=>m.unicode='true',m=>m.atoms[0].maximum=1,m=>m.atoms[0].minimum=-1,m=>m.atoms[0].ranges[0].high=0x110000,m=>m.atoms[0].extra=true,m=>m.atoms=Array(9).fill({...m.atoms[0],minimum:512,maximum:512})]){const wrong=structuredClone(model);change(wrong);assert.throws(()=>validateSequencePattern(wrong));}
  const result=translateJavaScript('export function value(input){return typeof input==="string" && /^a{2,4}$/.test(input);}',{lossless:true});
  for(const meta of [result.meta.replace('(minimum 2)','(minimum -1)'),result.meta.replace('(maximum 4)','(maximum 1)'),result.meta.replace('(unicode false)','(unicode maybe)'),result.meta.replace('(maximum 4)','(maximum 4) (extra true)'),result.meta+'\n(unissued source)'])assert.throws(()=>parseMeta(meta));
  vectors.metaBoundary={program:result.program,meta:result.meta};save();
});


test('every old complete program survives within unchanged 788 and 705 source censuses',{timeout:60000},()=>{
  const baselineBytes=readFileSync(join(ROOT,'tools/translation/fixtures/sequence-patterns/native-program-baseline.json'));assert.equal(hash(baselineBytes),'d3b55956cc6eb290f5c9ebbab4c12a5c2635e94dbffb637a37badd6f85ce147b');
  const baseline=JSON.parse(baselineBytes),totals={modules:0,top:0,topDefinitions:0,scoped:0,full:0,conditional:0},gains=[];
  assert.equal(baseline.modules.length,52);assert.deepEqual(baseline.counts,{modules:52,topLevelSourceItems:788,topLevelDefinitions:73,topLevelConstants:38,topLevelFunctions:35,scopedSourceItems:705,scopedFunctions:61,fullDomainScopedFunctions:52,conditionalScopedFunctions:9});
  for(const previous of baseline.modules) {
    const source=readFileSync(join(ROOT,previous.path),'utf8');assert.equal(Buffer.byteLength(source),previous.originalSourceBytes);assert.equal(hash(source),previous.sourceSha256,'original source changed');
    const analysis=analyzeJavaScript(source,{sourcePath:previous.path});assert.equal(analysis.scopedFunctions.complete,true);assert.deepEqual(analysis.program,previous.topLevelProgram);
    for(const fn of previous.scopedProgram){assert.deepEqual(parseMeta(toLino(fn)),[fn]);assert.deepEqual(analysis.scopedFunctions.program.find(row=>row.name===fn.name),fn,'old original body '+previous.path+':'+fn.name);}
    const names=new Set(previous.scopedProgram.map(fn=>fn.name));for(const fn of analysis.scopedFunctions.program)if(!names.has(fn.name)){const row=analysis.scopedFunctions.items.find(row=>row.name===fn.name);gains.push({path:previous.path,start:row.start,end:row.end,name:fn.name,fullOriginalBody:source.slice(row.start,row.end),row,program:fn,meta:toLino(fn),typescript:emitTypeScript([fn]),rust:emitRust([fn])});}
    totals.modules++;totals.top+=analysis.items.length;totals.topDefinitions+=analysis.program.length;totals.scoped+=analysis.scopedFunctions.sourceItems;totals.full+=analysis.scopedFunctions.fullDomainTranslatedItems;totals.conditional+=analysis.scopedFunctions.conditionalPrivateBodyDraftItems;
    vectors.census.push({path:previous.path,sourceSha256:previous.sourceSha256,previous,completeCurrentItems:analysis.items,completeCurrentScoped:analysis.scopedFunctions});save();
  }
  assert.deepEqual(totals,{modules:52,top:788,topDefinitions:73,scoped:705,full:54,conditional:12});assert.deepEqual(gains.map(row=>[row.path,row.start]),[['js/src/client-status.mjs',2581],['js/src/config.mjs',15324],['js/src/github-proxy.mjs',2346],['js/src/provider-manifest.mjs',737],['js/src/tokens.mjs',4090]]);vectors.gains=gains;save();
});
