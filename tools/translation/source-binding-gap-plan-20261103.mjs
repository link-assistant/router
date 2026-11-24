// Complete conservative native binding gap DATA, never semantic admission.
import {createHash} from 'node:crypto';
import {withSourceBindingGapInputs20261103} from './source-binding-bulk-20261101.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const flags=Object.freeze(['unresolvedTypeScope','unresolvedMacroScope','unresolvedBangMacroScope','unresolvedAttributeMacroScope']);
const fail=message=>{throw TypeError('Original source binding gap plan: '+message);};
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function locate(diagnostic,sources){
 const names=[...new Set([diagnostic.source,diagnostic.file].filter(value=>typeof value==='string'))];
 if(names.length!==1)return {status:names.length?'ambiguous-original-source':'original-source-not-located',candidates:names};
 const source=sources.get(names[0]);if(!source)return {status:'original-source-outside-physical-census',path:names[0]};
 const span=diagnostic.span,start=span?.start,end=span?.end;
 const boundary=at=>Number.isSafeInteger(at)&&at>=0&&at<=source.source.length&&!(at>0&&at<source.source.length&&source.source.charCodeAt(at-1)>=0xd800&&source.source.charCodeAt(at-1)<=0xdbff&&source.source.charCodeAt(at)>=0xdc00&&source.source.charCodeAt(at)<=0xdfff);
 if(!boundary(start)||!boundary(end)||end<start)return {status:'original-span-not-located',path:source.path,sourceSha256:source.sha256,originalSpan:span??null};
 return {status:'located',path:source.path,sourceSha256:source.sha256,span:{unit:'utf16',start,end}};
}
// Sparse endpoints scan disjoint source pieces once per file, rather than
// rescanning a complete UTF8 prefix for every diagnostic in a large module.
function byteLocations(rows,sources){
 const wanted=new Map();for(const row of rows)if(row.location.status==='located'){
  const {path,span}=row.location;if(!wanted.has(path))wanted.set(path,new Set([0]));wanted.get(path).add(span.start).add(span.end);
 }
 const positions=new Map();for(const [path,marks]of wanted){
  const text=sources.get(path).source,offsets=new Map();let previous=0,bytes=0;
  for(const mark of [...marks].sort((a,b)=>a-b)){bytes+=Buffer.byteLength(text.slice(previous,mark));offsets.set(mark,bytes);previous=mark;}positions.set(path,offsets);
 }
 for(const row of rows)if(row.location.status==='located'){const {path,span}=row.location,offsets=positions.get(path);span.byteStart=offsets.get(span.start);span.byteEnd=offsets.get(span.end);}
}
/** This owns the real physical source operation; callers cannot supply a scope
 * array, a reviewed flag, diagnostic list or fabricated source observation. */
export function collectSourceBindingGapPlan20261103(options){
 return withSourceBindingGapInputs20261103(options,api=>{
  const result=createRulePipeline([
   {phase:'language',rules:[{id:'language:fresh-original-whole-source-binding-inspection',apply:()=>{
    const observed=api.inspectBindings(),sources=new Map(api.evidence.sources.map(row=>[row.path,{path:row.path,source:row.source,sha256:hash(row.source),bytes:Buffer.byteLength(row.source)}]));
    return {observed,sources,evidence:api.evidence};
   }}]},
   {phase:'repository',rules:[{id:'repository:retain-every-native-gap-and-map-to-L02-B05',apply:({observed,sources,evidence})=>{
    const rows=[],represented=new Set(),census=[...sources.values()].map(({path,sha256,bytes})=>({path,sha256,bytes}));
    const profileKey=hash(JSON.stringify(observed.compilationProfile)),censusKey=hash(JSON.stringify(census));
    const add=(kind,diagnostic,owner=null)=>{
     if(rows.length>=20000)fail('complete gap row domain exceeded');
     const location=locate(diagnostic,sources),ordinal=rows.length,id=hash(JSON.stringify({kind,ordinal,owner,location,diagnostic,profileKey,censusKey}));
     rows.push({id,kind,owner,diagnostic,location,requirements:['L02','B05'],reviewStatus:'OPEN',unresolved:['actual-source-binding-or-producer-owner-adoption-review-required'],sourceAuthority:false,semanticAuthority:false});
    };
    for(const diagnostic of evidence.graphDiagnostics)add('original-module-graph-diagnostic',diagnostic);
    for(const diagnostic of observed.diagnostics)add('original-module-binding-diagnostic',diagnostic);
    for(const scope of observed.scopes){
     represented.add(scope.file);const owner={file:scope.file,path:[...scope.path]},base={source:scope.file,module:[...scope.path]};
     if(flags.some(flag=>typeof scope[flag]!=='boolean'))fail('complete original namespace flag schema required');
     for(const flag of flags)if(scope[flag]===true)add('original-unresolved-namespace-flag',{...base,flag,value:true},owner);
     if(scope.configurationCondition!=='active')add('original-scope-configuration-review',{...base,configurationCondition:scope.configurationCondition},owner);
     for(const binding of scope.bindings)if(binding.status!=='resolved')add('original-unresolved-or-ambiguous-binding',{...base,span:binding.span,binding},owner);
    }
    for(const source of sources.values())if(!represented.has(source.path))add('physical-source-outside-original-binding-closure',{source:source.path,span:{start:0,end:0}});
    byteLocations(rows,sources);
    const answer={schema:'router-original-binding-gap-plan-20261103-v1',entry:evidence.entry,sourceDirectory:evidence.sourceDirectory,compilationProfile:observed.compilationProfile,sourceCensusSha256:censusKey,
     sources:census,externPrelude:observed.externPrelude,rows,
     originalGraphDiagnostics:evidence.graphDiagnostics,originalBindingDiagnostics:observed.diagnostics,originalScopeCount:observed.scopes.length,originalTrace:api.trace,
     gaps:rows.length,productionFunctionDenominator:null,translationCoverage:null,draftedRequirements:null,scopeReviewComplete:false,
     sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,verification:'UNRUN'};
    accountData(answer);return freeze(structuredClone(answer));
   }}]},
  ]).run(null);
  const answer={...result.value,trace:result.trace};accountData(answer);return freeze(answer);
 });
}
