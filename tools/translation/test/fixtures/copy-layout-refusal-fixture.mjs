import {readFileSync} from 'node:fs';
import {HostChecker,parseRust} from '../../extensions/host-contracts.mjs';
import {sourceItems} from '../../rust-structure.mjs';
import {resolveModuleBindings} from '../../module-bindings.mjs';
import {moduleScopeKey} from '../../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../../cfg-profile.mjs';
import {projectCopyEvidence} from '../../project-copy.mjs';

export function fixture(source){
  const module={file:'src/lib.rs',path:[],source,items:sourceItems(source),configurationCondition:'active',compilationProfile:PRODUCTION_PROFILE};
  const surfaces=parseRust(source+' fn main(){}').items.filter(item=>item.k==='data'&&!item.generated);
  const declarations=surfaces.map(surface=>({name:surface.name,term:'struct',file:module.file,path:[],globalSpan:surface.span,surface}));
  const scopes=new Map(resolveModuleBindings({modules:[module],compilationProfile:PRODUCTION_PROFILE}).scopes.map(scope=>[moduleScopeKey(scope),scope]));
  return {module,declarations,scopes};
}

// Called only by the fresh Node child. Inspector observes the genuine method;
// no method, prototype, source or checker input is replaced for measurement.
export async function measureCopyLayoutPhases(source){
  if(!process.versions.node||process.versions.bun)throw new TypeError('Copy layout coverage requires an actual Node child');
  const {Session}=await import('node:inspector'),session=new Session();
  const post=(method,parameters={})=>new Promise((resolve,reject)=>session.post(method,parameters,(error,result)=>error?reject(error):resolve(result)));
  const row=fixture(source),url=new URL('../../extensions/host-contracts.mjs',import.meta.url),hostSource=readFileSync(url,'utf8');
  const own=Object.getOwnPropertyDescriptor(HostChecker.prototype,'program');
  if(!own||typeof own.value!=='function')throw new TypeError('Genuine own HostChecker program method required');
  const text=Function.prototype.toString.call(own.value),start=hostSource.indexOf(text);
  if(start<0||hostSource.indexOf(text,start+1)!==-1)throw new TypeError('HostChecker program full source must have one exact occurrence');
  let evidence,coverage,started=false;
  session.connect();
  try{
    await post('Profiler.enable');
    await post('Profiler.startPreciseCoverage',{callCount:true,detailed:true});started=true;
    evidence=projectCopyEvidence(row.declarations,[row.module],new Map(),row.scopes);
    coverage=await post('Profiler.takePreciseCoverage');
  }finally{
    try{if(started)await post('Profiler.stopPreciseCoverage');}
    finally{try{await post('Profiler.disable');}finally{session.disconnect();}}
  }
  const scripts=coverage.result.filter(script=>script.url===url.href);
  const matches=scripts.flatMap(script=>script.functions.filter(fn=>fn.functionName==='program'&&fn.ranges[0]?.startOffset===start&&fn.ranges[0]?.endOffset===start+text.length));
  const span={start:0,end:source.length};
  return {versions:process.versions,source,fixtureSource:readFileSync(new URL(import.meta.url),'utf8'),hostSource,method:{url:url.href,text,startOffset:start,endOffset:start+text.length},coverage,scriptsMatched:scripts.length,matches,
    results:{good:evidence(['Good'],row.module,span),bad:Array.from({length:64},(_,index)=>evidence(['Bad'+index],row.module,span)),dependent:evidence(['Dependent'],row.module,span),fields:evidence.fieldCertificates(['Good'],row.module,span)}};
}
