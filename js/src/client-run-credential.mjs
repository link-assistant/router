/** Exact per-run model authority and renewable lifetime; no credential is persisted here. */
import {clientFailure,clientIntegration} from './client-files.mjs';
import {preflightNativeClientLaunch,nativeClientRequiresModel} from './client-launch-plan.mjs';
import {nativeClientModelAuthorized,selectNativeClientModel} from './client-catalog.mjs';
import {validateModelPolicy} from './tokens.mjs';import {prepareRemoteRunCredential} from './client-remote.mjs';import {sendRemoteManagement} from './remote-operations.mjs';
export function nativeRunBaseSelector(model){
 if(typeof model!=='string'||Buffer.byteLength(model)>65536)throw clientFailure('Model selector must be bounded text');const open=model.lastIndexOf('(');if(open<=0||!model.endsWith(')'))return model;const suffix=model.slice(open+1,-1),word=suffix.toLowerCase();let interpreted=['none','auto','-1','minimal','low','medium','high','xhigh','max'].includes(word);
 if(!interpreted&&(/^-0+$/u.test(suffix)||/^\+?\d+$/u.test(suffix))){try{const value=BigInt(suffix);interpreted=value>=0n&&value<=4294967295n;}catch{}}
 return interpreted?model.slice(0,open):model;
}
export function requestNativeRunModelPolicy(client,options={}){
 for(const flag of ['pick_model','allow_model_substitution'])if(options[flag]!==undefined&&typeof options[flag]!=='boolean')throw clientFailure('Run model flags must be Boolean');
 const info=clientIntegration(client),preflight=preflightNativeClientLaunch(client,options),selected=options.model??preflight.forwardedModel;
 if(selected!==null&&(typeof selected!=='string'||!selected.trim()))throw clientFailure('Explicit model id must be nonempty');const extra=options.allowed_models??[];if(!Array.isArray(extra)||extra.length>4096||extra.some(value=>typeof value!=='string'||!value.trim()))throw clientFailure('Allowed models require bounded nonempty ids');
 if((extra.length||options.allow_model_substitution)&&selected===null&&!options.pick_model)throw clientFailure('Widening a model grant requires an explicit model or --pick-model');
 const allowed=[...new Set([...(selected===null?[]:[selected]),...extra].map(nativeRunBaseSelector))].sort();if(allowed.some(value=>!value.trim()))throw clientFailure('Base model id must be nonempty');const policy=validateModelPolicy({allowed_models:allowed,allow_substitution:options.allow_model_substitution===true,substitution_source:options.allow_model_substitution?'router with --allow-model-substitution':null});return {client:info.client,selected,pick:options.pick_model===true,policy};
}
export function resolveNativeRunModel(request,catalog){
 let selected=request.selected;if(selected===null&&request.pick){selected=selectNativeClientModel(request.client,catalog);if(selected===null)throw clientFailure('The authorized catalog contains no model for this client');}
 if(selected===null&&nativeClientRequiresModel(request.client))throw clientFailure('This client requires an explicit model or --pick-model');
 for(const model of request.policy.allowed_models)if(!nativeClientModelAuthorized(request.client,catalog,model))throw clientFailure('Allowed model is not available from the selected Router');if(selected!==null&&!nativeClientModelAuthorized(request.client,catalog,nativeRunBaseSelector(selected)))throw clientFailure('Selected model is not available from the authorized live catalog');return selected;
}
export function classifyNativeRunLeaseStatus(status){return status>=200&&status<=299?'renewed':[404,405].includes(status)?'unsupported':[401,403].includes(status)?'rejected':status===409?'refused':'transient';}
async function withLease(credential,context,operation){
 if(!credential.runLease)return operation();const controller=new AbortController();let stopped=false,timer,inFlight=null,last='renewed';
 const tick=async()=>{let state='transient';try{const answer=await sendRemoteManagement({server:credential.origin,managementServer:credential.origin,managementCaCert:credential.caCert,token:credential.token},{method:'POST',path:'/api/run-lease',response:'status-only'},{fetch:context.fetch,signal:controller.signal,deadlineMs:10000,maxOutputBytes:65536,cwd:context.invocation?.cwd});state=classifyNativeRunLeaseStatus(answer.status);}catch{}if(stopped)return;if(state!==last){if(Array.isArray(context.notes)&&context.notes.length<64)context.notes.push('run lease '+state);last=state;}if(state==='unsupported'){stopped=true;return;}timer=setTimeout(start,30000);};
 const start=()=>{if(!stopped)inFlight=tick();};timer=setTimeout(start,30000);
 try{return await operation();}finally{stopped=true;clearTimeout(timer);controller.abort();if(inFlight)await inFlight;}
}
export async function withNativeRunCredential(context,operation){
 const request=requestNativeRunModelPolicy(context.client,context.options),options=context.options??{},held=[];let primary=null;
 try{
  let credential=await prepareRemoteRunCredential({...context,client:request.client,modelPolicy:request.pick?{allowed_models:[],allow_substitution:false,substitution_source:null}:request.policy,ttlHours:options.run_ttl_hours??1,slidingExpiry:!options.fixed_run_ttl,maxRequests:options.run_max_requests,label:options.label});held.push(credential);const selected=resolveNativeRunModel(request,credential.catalog);
  if(request.pick&&selected!==null&&!request.policy.allowed_models.includes(nativeRunBaseSelector(selected))){const policy=validateModelPolicy({...request.policy,allowed_models:[...new Set([nativeRunBaseSelector(selected),...request.policy.allowed_models])].sort()});const replacement=await prepareRemoteRunCredential({...context,client:request.client,modelPolicy:policy,ttlHours:options.run_ttl_hours??1,slidingExpiry:!options.fixed_run_ttl,maxRequests:options.run_max_requests,label:options.label});held.push(replacement);await credential.cleanup();credential=replacement;resolveNativeRunModel({...request,selected,policy},credential.catalog);}
  return await withLease(credential,context,()=>operation({...credential,selectedModel:selected}));
 }catch(error){primary=error;throw error;}
 finally{const failures=[];for(const credential of [...held].reverse())try{await credential.cleanup();}catch(error){failures.push(error);}if(failures.length){const failure=clientFailure('Run credential cleanup failed; the finite token TTL remains the backstop');Object.assign(failure,{cause:primary});throw failure;}}
}
