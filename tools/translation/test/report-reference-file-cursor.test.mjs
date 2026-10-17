import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync,readFileSync,statSync,truncateSync,renameSync,openSync,closeSync,writeSync,utimesSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {packReport,unpackReport,validateReportEnvelope,referenceProofReport,runReferenceProof,withReferenceProof,compareReferenceProofFiles} from './report-reference-transport.mjs';
import {withIndexedReferenceProof} from './report-reference-file-cursor.mjs';

const temporary=mkdtempSync(join(tmpdir(),'router-indexed-report-'));
after(()=>rmSync(temporary,{recursive:true,force:true}));
const directory=process.env.ROUTER_INDEXED_REPORT_VECTOR_DIR||temporary;
mkdirSync(directory,{recursive:true});
const WINDOW=65536;
let serial=0;
const json=value=>JSON.stringify(value);
const clone=value=>JSON.parse(json(value));
const snapshot=stat=>({dev:stat.dev,ino:stat.ino,size:stat.size,mtimeMs:stat.mtimeMs,ctimeMs:stat.ctimeMs});
function retain(name,value){writeFileSync(join(directory,name+'.reference.json'),json(packReport(value)),{flag:'wx'});}
function file(label,value){
 const bytes=Buffer.isBuffer(value)?value:Buffer.from(typeof value==='string'?value:json(value));
 const envelopePath=join(directory,String(++serial).padStart(4,'0')+'-'+label+'.envelope.json');
 writeFileSync(envelopePath,bytes,{flag:'wx'});return {envelopePath,envelopeBytes:bytes.length,envelopeIdentity:snapshot(statSync(envelopePath))};
}
function errorOf(action){try{return {value:action()};}catch(error){return {error:{name:error.name,message:error.message,stack:error.stack??null}};}}
function oldReport(record){const encoded=readFileSync(record.envelopePath),outer=JSON.parse(encoded.toString('utf8'));validateReportEnvelope(outer.report);return {outer,decoded:unpackReport(outer.report)};}
function ordinaryAt(root,path){let value=root;for(const key of path){if(!value||typeof value!=='object'||!Object.hasOwn(value,String(key)))return undefined;value=Object.getOwnPropertyDescriptor(value,String(key)).value;}return value;}
function observations(record,paths,arrayPaths=[]){
 const label='cursor-observation-'+(++serial),old=oldReport(record),expected=independent(old.decoded,paths,arrayPaths);
 retain(label+'-complete-old-DOM-before-cursor',{record,old,paths,arrayPaths,expected});
 const result={values:[],truth:[],lengths:[]};let failure;
 try{withReferenceProof(record,view=>{for(const path of paths){result.values.push(view.read(...path));result.truth.push(view.has(...path));}for(const path of arrayPaths)result.lengths.push(view.arrayLength(...path));});}catch(error){failure=error;}
 retain(label+'-complete-indexed-outcome-before-assertions',{record,paths,arrayPaths,result,...(failure?{error:{name:failure.name,message:failure.message,stack:failure.stack??null}}:{})});
 if(failure)throw failure;return result;
}
function independent(root,paths,arrayPaths=[]){return {values:paths.map(path=>ordinaryAt(root,path)),truth:paths.map(path=>!!ordinaryAt(root,path)),lengths:arrayPaths.map(path=>ordinaryAt(root,path).length)};}
function refused(label,outer,{transportOnly=false}={}){
 const record=file(label,outer),old=errorOf(()=>oldReport(record)),callbacks=[];
 const actual=errorOf(()=>withReferenceProof(record,view=>{callbacks.push({entered:true});return view.read();}));
 retain(label+'-complete-outcome',{record,transportOnly,old,actual,callbacks});
 assert.equal(actual.error?.name,'Error',label);assert.equal(callbacks.length,0,label);if(!transportOnly)assert.ok(old.error,label+' independent complete codec refusal');
 return {record,old,actual};
}


// Test-only transport observations. Native stderr stays complete and distinct;
// native Error.stack is never requested by the parent descriptor census.
function transportError(error){
  const value=item=>Buffer.isBuffer(item)?{bufferBase64:item.toString('base64'),bytes:item.length}:Array.isArray(item)?item.map(value):item===null||['undefined','string','number','boolean'].includes(typeof item)?item:{unobservedType:typeof item};
  const fields=[];
  for(const key of Reflect.ownKeys(error)){
    if(key==='stack'){fields.push({key,unobservedLazyStack:true});continue;}
    const descriptor=Object.getOwnPropertyDescriptor(error,key);
    fields.push({key:typeof key==='symbol'?{symbol:String(key)}:key,enumerable:descriptor.enumerable,configurable:descriptor.configurable,...(Object.hasOwn(descriptor,'value')?{writable:descriptor.writable,value:value(descriptor.value)}:{accessor:true})});
  }
  return {name:error.name,fields};
}
function moduleTransport(mode,code){
  assert.ok(['eval','stdin'].includes(mode));
  if(mode==='eval')assert.ok(Buffer.byteLength(code)<64*1024,'legacy comparator stays below Linux per-argument limit');
  const argv=mode==='eval'?['--input-type=module','--eval',code]:['--input-type=module'];
  let stdout,stderr=Buffer.alloc(0),error=null,status=0,signal=null;
  try{stdout=execFileSync(process.execPath,argv,{...(mode==='stdin'?{input:code}:{}),timeout:10000,maxBuffer:8*1024*1024,stdio:['pipe','pipe','pipe']});}
  catch(caught){stdout=Buffer.from(caught.stdout??[]);stderr=Buffer.from(caught.stderr??[]);error=transportError(caught);status=caught.status;signal=caught.signal;}
  return {mode,code,execPath:process.execPath,argv,limits:{childMs:10000,maxBuffer:8*1024*1024},status,signal,stdout:{base64:stdout.toString('base64'),bytes:stdout.length},stderr:{base64:stderr.toString('base64'),bytes:stderr.length},error};
}
function transportControls(){
  const code="import {basename} from 'node:path';const tape=['module'];const value='Ω😀\\u0000';await Promise.resolve();tape.push('await');const sentinel=new TypeError('owned child sentinel');let caught;try{throw sentinel;}catch(error){caught={name:error.name,message:error.message,same:error===sentinel};tape.push('caught');}const payload={value,basename:basename('/original/full/source.rs'),sum:7+9,tape,caught};process.stdout.write(JSON.stringify({payload,entry:{url:import.meta.url,argv:process.argv,execArgv:process.execArgv}}));";
  const legacy=moduleTransport('eval',code),current=moduleTransport('stdin',code);
  retain('01-complete-small-legacy-and-stdin-modules',{code,legacy,current});
  assert.equal(legacy.status,0);assert.equal(current.status,0);assert.equal(legacy.signal,null);assert.equal(current.signal,null);assert.equal(legacy.error,null);assert.equal(current.error,null);
  const left=JSON.parse(Buffer.from(legacy.stdout.base64,'base64').toString('utf8')),right=JSON.parse(Buffer.from(current.stdout.base64,'base64').toString('utf8'));
  assert.deepEqual(left.payload,right.payload);assert.deepEqual(right.payload,{value:'Ω😀\u0000',basename:'source.rs',sum:16,tape:['module','await','caught'],caught:{name:'TypeError',message:'owned child sentinel',same:true}});
  // argv, execArgv and anonymous module URL are full raw observations, not
  // presumed equal across Node/Bun eval/stdin loader implementations.
  for(const entry of [left.entry,right.entry]){assert.equal(typeof entry.url,'string');assert.ok(Array.isArray(entry.argv));assert.ok(Array.isArray(entry.execArgv));}
  retain('01-complete-loader-observations',{legacy:left.entry,stdin:right.entry});
  const fixed="process.stdout.write('fixed-out Ω😀\\n');process.stderr.write('fixed-err Ω😀\\n');process.exitCode=23;";
  const failedLegacy=moduleTransport('eval',fixed),failedCurrent=moduleTransport('stdin',fixed);retain('01-complete-controlled-native-errors',{code:fixed,legacy:failedLegacy,current:failedCurrent});
  assert.equal(failedLegacy.status,23);assert.equal(failedCurrent.status,23);assert.equal(failedLegacy.signal,null);assert.equal(failedCurrent.signal,null);assert.ok(failedLegacy.error);assert.ok(failedCurrent.error);assert.deepEqual(failedCurrent.stdout,failedLegacy.stdout);assert.deepEqual(failedCurrent.stderr,failedLegacy.stderr);
  assert.equal(Buffer.from(failedCurrent.stdout.base64,'base64').toString('utf8'),'fixed-out Ω😀\n');assert.equal(Buffer.from(failedCurrent.stderr.base64,'base64').toString('utf8'),'fixed-err Ω😀\n');
  for(const source of ['export const = 1;','throw new TypeError("transport deliberate failure");']){
    const old=moduleTransport('eval',source),now=moduleTransport('stdin',source);retain('01-complete-native-syntax-or-throw-errors',{source,old,current:now});
    assert.notEqual(old.status,0);assert.equal(now.status,old.status);assert.equal(now.signal,old.signal);assert.deepEqual(now.stdout,old.stdout);assert.ok(old.stderr.bytes>0);assert.ok(now.stderr.bytes>0);assert.ok(old.error);assert.ok(now.error);
    // Full native frame/URL/command differences remain above without any
    // stack, path or source normalization, and cannot mint a passing report.
  }
}
function largeStdinProof(){
  const text='Ω😀'.repeat(30000),transport=new URL('./report-reference-transport.mjs',import.meta.url).href;
  const code="import {writeReferenceProofReport} from "+JSON.stringify(transport)+";const text="+JSON.stringify(text)+";const tape=[];const read=value=>{tape.push(value);return value;};read('first');await Promise.resolve();read('second');writeReferenceProofReport({text,tail:'last complete byte',tape,entry:{url:import.meta.url,argv:process.argv,execArgv:process.execArgv}});";
  assert.ok(Buffer.byteLength(code)>128*1024);assert.ok(Buffer.byteLength(code)<512*1024);
  const record=runReferenceProof({name:'08-large-stdin-proof',code,execPath:process.execPath,directory});
  const stored=readFileSync(record.codePath,'utf8');assert.equal(stored,code);assert.equal(record.codeBytes,Buffer.byteLength(code));assert.equal(record.codeSha256,createHash('sha256').update(code).digest('hex'));
  const old=oldReport(record);assert.equal(old.decoded.text,text);assert.equal(old.decoded.tail,'last complete byte');assert.deepEqual(old.decoded.tape,['first','second']);
  const observed={};withReferenceProof(record,view=>{observed.text=view.read('text');observed.tail=view.read('tail');observed.tapeLength=view.arrayLength('tape');observed.first=view.read('tape',0);observed.second=view.read('tape',1);observed.url=view.read('entry','url');});
  assert.equal(observed.text,text);assert.equal(observed.tail,'last complete byte');assert.equal(observed.tapeLength,2);assert.equal(observed.first,'first');assert.equal(observed.second,'second');assert.equal(typeof observed.url,'string');
  retain('08-complete-large-UTF8-stdin-proof',{code,text,record,old,observed,scope:'New stdin source exceeds Linux per-argument128KiB. No oversized legacy launch is attempted; small legacy comparison retains the portable old observer oracle.'});
}

test('complete generic report values retain independent old DOM observations identities descriptors and every source byte',{timeout:60000},()=>{
  transportControls();
 const shared=Object.freeze(Object.assign(Object.create(null),{text:'Ω😀\u0000\ud800',absent:undefined,negativeZero:-0,nan:NaN,positive:Infinity,negative:-Infinity,big:-12345678901234567890n}));
 const original={shared,again:shared,array:[undefined,,shared],nothing:undefined};original.self=original;
 Object.defineProperty(original,'__proto__',{value:'own data',enumerable:false,configurable:false,writable:false});Object.preventExtensions(original);
 const report=referenceProofReport(original),record=file('01-generic',report),old=oldReport(record);
 const paths=[['shared','text'],['again','negativeZero'],['self','shared','nan'],['shared','positive'],['shared','negative'],['shared','big'],['nothing'],['missing'],['array',0],['array',1],['__proto__']];
 const expected=independent(old.decoded,paths,[['array']]),actual=observations(record,paths,[['array']]);
 retain('01-complete-before-after',{original,report,record,old,paths,expected,actual,sources:[{url:new URL('./report-reference-transport.mjs',import.meta.url).href,content:readFileSync(new URL('./report-reference-transport.mjs',import.meta.url),'utf8')},{url:new URL('./report-reference-file-cursor.mjs',import.meta.url).href,content:readFileSync(new URL('./report-reference-file-cursor.mjs',import.meta.url),'utf8')}]});
 assert.deepEqual(actual,expected);assert.equal(old.decoded.self,old.decoded);assert.equal(old.decoded.shared,old.decoded.again);assert.equal(old.decoded.array[2],old.decoded.shared);assert.equal(Object.hasOwn(old.decoded.array,'1'),false);assert.equal(Object.getPrototypeOf(old.decoded.shared),null);assert.equal(Object.isFrozen(old.decoded.shared),true);assert.equal(Object.isExtensible(old.decoded),false);assert.deepEqual(Object.getOwnPropertyDescriptor(old.decoded,'__proto__'),Object.getOwnPropertyDescriptor(original,'__proto__'));
 let wrong;withReferenceProof(record,view=>{wrong=errorOf(()=>view.arrayLength('shared'));});retain('01-non-array-observation',wrong);assert.equal(wrong.error?.name,'Error');
});

test('reordered whitespace escaped strings finite number spellings and exact hash collisions preserve generic envelope behavior',{timeout:60000},()=>{
 const longKey='k'.repeat(1024)+'\ud800😀',original={Dz:'first full key',EY:'second full key',A:'A',array:[1.25,-0,false],[longKey]:27},outer=referenceProofReport(original);
 outer.report.strings.push('A');
 const reordered={alternative:outer.alternative,checks:{roundtrip:{target:outer.checks.roundtrip.target,representation:outer.checks.roundtrip.representation},envelopeBytes:outer.checks.envelopeBytes,dataEqual:outer.checks.dataEqual,envelopeByteEqual:outer.checks.envelopeByteEqual},report:{root:outer.report.root,nodes:outer.report.nodes,strings:outer.report.strings,schema:outer.report.schema},schema:outer.schema};
 let encoded=JSON.stringify(reordered,null,2).replaceAll('"A"','"\\u0041"');
 encoded=encoded.replace('"root": [\n      5,\n      0\n    ]','"root": [ 5e0, -0.000e+0 ]');
 const record=file('02-generic-encoding',encoded),old=oldReport(record),paths=[['Dz'],['EY'],['A'],['array',0],['array',1],['array',2],[longKey]],expected=independent(old.decoded,paths,[['array']]),actual=observations(record,paths,[['array']]);
 retain('02-complete-before-after',{original,outer,reordered,encoded,record,old,paths,expected,actual,collision:{keys:['Dz','EY'],meaning:'both have the same 32-bit routing hash; every code unit still compares'}});
 assert.ok(encoded.includes('5e0'));assert.ok(encoded.includes('\\u0041'));assert.deepEqual(actual,expected);assert.equal(actual.values[0],'first full key');assert.equal(actual.values[1],'second full key');
});

test('full multibyte source strings and escape sequences crossing file windows retain exact UTF16 code units',{timeout:60000},()=>{
 const original={};const controls=[];
 for(const [name,token]of [['multibyte','€'],['astral','😀'],['surrogate','\ud800'],['escape','\\\n"']]){
  original[name]='MARK-'+token+'-END';const probe=json(referenceProofReport(original)),needle=Buffer.from('MARK-'),start=Buffer.from(probe).lastIndexOf(needle)+needle.length;
  const padding=(WINDOW-1-start%WINDOW+WINDOW)%WINDOW;original[name]='MARK-'+'x'.repeat(padding)+token+'-END';
  const bytes=Buffer.from(json(referenceProofReport(original))),marker=bytes.lastIndexOf(needle)+needle.length+padding;
  controls.push({name,padding,marker,windowOffset:marker%WINDOW,source:original[name],sourceCodeUnits:original[name].length});
 }
 original.fullSource='pub fn source()->&\'static str{"Ω😀"}\n'.repeat(10000)+'\udfff\u0000';
 const outer=referenceProofReport(original),record=file('03-window-boundaries',outer),old=oldReport(record),paths=Object.keys(original).map(name=>[name]),expected=independent(old.decoded,paths),actual=observations(record,paths);
 retain('03-complete-source-and-boundaries',{original,outer,record,old,controls,expected,actual});
 assert.deepEqual(actual,expected);for(const control of controls)assert.equal(control.windowOffset,WINDOW-1);assert.equal(actual.values.at(-1),original.fullSource);
 const complete=readFileSync(record.envelopePath);for(const at of [WINDOW-1,WINDOW,WINDOW+1])refused('03-window-truncation-'+at,complete.subarray(0,at));
});

test('every scalar and reference is checked including invalid unreachable node and string slots',{timeout:60000},()=>{
 const base=referenceProofReport({value:'text',number:12n,array:[true]});
 const cases=[
  ['root-reference',outer=>outer.report.root=[5,outer.report.nodes.length]],
  ['root-string-reference',outer=>outer.report.root=[4,outer.report.strings.length]],
  ['root-tag',outer=>outer.report.root=[7]],
  ['boolean-payload',outer=>outer.report.root=[2,'true']],
  ['number-payload',outer=>outer.report.root=[3,'Infinity']],
  ['fractional-reference',outer=>outer.report.root=[5,0.5]],
  ['negative-reference',outer=>outer.report.root=[4,-1]],
  ['bigint-syntax',outer=>{outer.report.strings.push('01');outer.report.root=[6,outer.report.strings.length-1];}],
  ['unreachable-node-reference',outer=>outer.report.nodes.push([1,true,[[0,7,[5,outer.report.nodes.length+1]]]] )],
  ['unreachable-string-reference',outer=>outer.report.nodes.push([0,false,[[0,0,[4,outer.report.strings.length]]]])],
  ['unreachable-scalar-arity',outer=>outer.report.nodes.push([1,true,[[0,7,[1,9]]]])]
 ];
 for(const [name,change]of cases){const outer=clone(base);change(outer);refused('04-'+name,outer);}
 const empty=referenceProofReport(undefined),record=file('04-valid-scalar-root',empty),old=oldReport(record),actual=observations(record,[[]]);retain('04-complete-scalar-root',{empty,record,old,actual});assert.equal(actual.values[0],undefined);
});

test('complete descriptor field key prototype array index length and duplicate decoded-key rules retain independent refusals',{timeout:60000},()=>{
 const base=referenceProofReport({data:[1,,3],object:{a:1}}),array=base.report.nodes.findIndex(node=>node[0]===2);
 const cases=[
  ['prototype',outer=>outer.report.nodes[0][0]=3],
  ['extensibility',outer=>outer.report.nodes[0][1]=1],
  ['descriptor-flags',outer=>outer.report.nodes[0][2][0][1]=8],
  ['descriptor-arity',outer=>outer.report.nodes[0][2][0].pop()],
  ['duplicate-key',outer=>outer.report.nodes[0][2].push(clone(outer.report.nodes[0][2][0]))],
  ['duplicate-value-key',outer=>{const field=clone(outer.report.nodes[0][2][0]);outer.report.strings.push(outer.report.strings[field[0]]);field[0]=outer.report.strings.length-1;outer.report.nodes[0][2].push(field);}],
  ['array-no-length',outer=>outer.report.nodes[array][2]=outer.report.nodes[array][2].filter(field=>outer.report.strings[field[0]]!=='length')],
  ['array-length-flags',outer=>outer.report.nodes[array][2].find(field=>outer.report.strings[field[0]]==='length')[1]=7],
  ['array-length-payload',outer=>outer.report.nodes[array][2].find(field=>outer.report.strings[field[0]]==='length')[2]=[3,0]],
  ['array-length-kind',outer=>outer.report.nodes[array][2].find(field=>outer.report.strings[field[0]]==='length')[2]=[4,0]],
  ['array-overflow',outer=>outer.report.nodes[array][2].find(field=>outer.report.strings[field[0]]==='length')[2]=[3,4294967296]]
 ];
 for(const [name,change]of cases){const outer=clone(base);change(outer);refused('05-'+name,outer);}
 const record=file('05-valid-holes',base),old=oldReport(record),actual=observations(record,[['data',1]],[['data']]);retain('05-complete-holes',{base,record,old,actual});assert.equal(actual.values[0],undefined);assert.equal(actual.lengths[0],3);assert.equal(Object.hasOwn(old.decoded.data,'1'),false);
});

test('unsupported file encodings unknown shapes truncation and complete trailing bytes refuse before any callback',{timeout:60000},()=>{
 const base=referenceProofReport({A:'valid Ω😀',value:1}),encoded=json(base),bytes=Buffer.from(encoded);
 for(const length of [0,1,Math.floor(bytes.length/2),bytes.length-1])refused('06-truncated-'+length,bytes.subarray(0,length));
 refused('06-trailing',encoded+' false');
 const invalid=Buffer.from(bytes),textAt=invalid.indexOf(Buffer.from('valid'));invalid[textAt]=0xc0;refused('06-invalid-UTF8',invalid,{transportOnly:true});
 const duplicate=encoded.replace('"schema":"validated-reference-proof-report-v1"','"schema":"validated-reference-proof-report-v1","schema":"validated-reference-proof-report-v1"'),duplicateResult=refused('06-duplicate-object-name',duplicate,{transportOnly:true});assert.match(duplicateResult.actual.error.message,/duplicate JSON object name/);
 const number=encoded.replace('"root":[5,0]','"root":[5,0.'+'0'.repeat(4096)+']');refused('06-overlong-number',number,{transportOnly:true});
 const unknown=clone(base);unknown.checks.extra='retained unsupported check';refused('06-unknown-check',unknown,{transportOnly:true});
 const shape=clone(base);shape.report.extra='not a codec member';refused('06-unknown-report',shape,{transportOnly:true});
 const badChecks=clone(base);badChecks.checks.dataEqual=false;const failed=file('06-failed-complete-roundtrip',badChecks),result=errorOf(()=>withReferenceProof(failed,()=>{}));retain('06-complete-failed-checks',{badChecks,failed,result});assert.equal(result.error?.name,'Error');
 for(const [name,text]of [['escape',encoded.replace('valid','\\q')],['Unicode-escape',encoded.replace('valid','\\u00G0')],['control-byte',encoded.replace('valid','\n')]])refused('06-invalid-'+name,text);
 const canonical=referenceProofReport({text:'complete native JSON comparison',array:[1,null,true]},{canonicalJson:true}),canonicalFile=file('06-canonical-JSON',canonical),canonicalOld=oldReport(canonicalFile),canonicalValues=[];
 withReferenceProof(canonicalFile,view=>canonicalValues.push(view.read('text')),{canonicalJson:true});const required=errorOf(()=>withReferenceProof(file('06-missing-canonical-JSON',base),()=>{},{canonicalJson:true}));retain('06-complete-canonical-JSON-controls',{canonical,canonicalFile,canonicalOld,canonicalValues,required});assert.equal(canonical.checks.canonicalJsonByteEqual,true);assert.equal(canonicalValues[0],'complete native JSON comparison');assert.equal(required.error?.name,'Error');
 const whitespace=file('06-valid-complete-whitespace',' \r\n\t'+encoded+' \r\n\t'),old=oldReport(whitespace),actual=observations(whitespace,[['A']]);retain('06-full-whitespace-positive',{whitespace,old,actual});assert.equal(actual.values[0],'valid Ω😀');
});

test('file replacement truncation callback failure reentry and cursor lifetimes cannot leak stale indexed observations',{timeout:60000},()=>{
 const outer=referenceProofReport({text:'stable complete source',array:[1,2]});const controls=[];
 for(const change of ['truncate','replace','write']){
  const record=file('07-'+change,outer),before=readFileSync(record.envelopePath);writeFileSync(record.envelopePath+'.before.bin',before,{flag:'wx'});
  const result=errorOf(()=>withReferenceProof(record,view=>{
   controls.push({change,first:view.read('text')});
   if(change==='truncate')truncateSync(record.envelopePath,before.length-1);
   else if(change==='replace'){renameSync(record.envelopePath,record.envelopePath+'.original');writeFileSync(record.envelopePath,before,{flag:'wx'});}
   else{const fd=openSync(record.envelopePath,'r+');try{writeSync(fd,Buffer.from('X'),0,1,before.indexOf(Buffer.from('stable')));}finally{closeSync(fd);}utimesSync(record.envelopePath,1,2);}
  }));retain('07-'+change+'-complete-before-after',{record,before:before.toString('base64'),after:readFileSync(record.envelopePath).toString('base64'),result,controls});assert.equal(result.error?.name,'Error');assert.match(result.error.message,/identity changed/);
 }
 const record=file('07-scope',outer);let captured,reentry,initial;
 withReferenceProof(record,view=>{captured=view;initial=view.read('text');reentry=errorOf(()=>withReferenceProof(record,()=>{}));});
 const closed=errorOf(()=>captured.read('text')),closedHas=errorOf(()=>captured.has('text')),closedArray=errorOf(()=>captured.arrayLength('array'));
 const sentinel=Error('actual callback exception');let caught;try{withReferenceProof(record,()=>{throw sentinel;});}catch(error){caught=error;}
 const restored=observations(record,[['text']],[['array']]);retain('07-complete-lifetimes',{record,initial,reentry,closed,closedHas,closedArray,callbackErrorIdentity:caught===sentinel,restored});
 assert.equal(reentry.error?.name,'Error');assert.match(reentry.error.message,/reentry/);for(const item of [closed,closedHas,closedArray])assert.match(item.error.message,/after close/);assert.equal(caught,sentinel);assert.equal(restored.values[0],'stable complete source');assert.equal(restored.lengths[0],2);
});

test('complete large reference reports keep independent old DOM values and every byte after a late file mismatch',{timeout:60000},()=>{
  largeStdinProof();
 const source='complete source Ω😀\n'.repeat(25000),shared=Object.freeze({source,proof:false,missing:undefined}),original={source,shared,again:shared,records:Array.from({length:3000},(_,index)=>({index,text:'original-'+index,shared})),tail:'last complete value'};
 const outer=referenceProofReport(original),expected=file('08-expected',outer),actual=file('08-actual',outer),old=oldReport(actual);
 const paths=[['source'],['shared','source'],['again','proof'],['records',0,'text'],['records',2999,'index'],['records',2999,'shared','missing'],['tail']];
 const expectedValues=independent(old.decoded,paths,[['records']]),actualValues=observations(actual,paths,[['records']]);
 const equal=compareReferenceProofFiles(expected,actual),changed=clone(outer);changed.report.strings[changed.report.strings.indexOf('last complete value')]='late changed complete value';const alternative=file('08-late-alternative',changed),different=compareReferenceProofFiles(expected,alternative);
 retain('08-complete-before-after',{original,outer,expected,actual,old,paths,expectedValues,actualValues,equal,alternative,changed,different});
 assert.deepEqual(actualValues,expectedValues);assert.equal(equal.equal,true);assert.equal(equal.comparedBytes,expected.envelopeBytes);assert.equal(different.equal,false);assert.ok(different.firstMismatch>WINDOW);assert.equal(different.comparedBytes,Math.max(expected.envelopeBytes,alternative.envelopeBytes));assert.equal(old.decoded.shared,old.decoded.again);assert.equal(old.decoded.records[2999].shared,old.decoded.shared);assert.equal(actualValues.lengths[0],3000);
});
