/** Persistent remote credentials: live authority, exact client binding, bounded transport. */
import {clientFailure,clientIntegration} from './client-files.js';
import {parseNativeClientCatalog} from './client-catalog.js';
import {selectedManagedTarget,normalizeManagedOrigin} from './managed-server.js';
import {sendRemoteManagement} from './remote-operations.js';
function tokenClaims(token:unknown):any{
 if(typeof token!=='string'||Buffer.byteLength(token)>65536||!token.startsWith('la_sk_'))throw clientFailure('Remote client token encoding is invalid');const parts=token.slice(6).split('.');if(parts.length!==3||parts.some(part=>!part||!/^[A-Za-z0-9_-]+$/u.test(part)))throw clientFailure('Remote client token encoding is invalid');
 let claims:any;try{claims=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.from(parts[1],'base64url')));}catch{throw clientFailure('Remote client token claims are invalid');}
 if(!claims||typeof claims!=='object'||Array.isArray(claims)||typeof claims.sub!=='string'||!claims.sub)throw clientFailure('Remote client token subject is invalid');return claims;
}
export function remoteClientTokenBinding(token:unknown,client:string):any{
 const claims=tokenClaims(token);
 if(claims.scope==='admin'||claims.client_kind!==client||typeof claims.sub!=='string'||!claims.sub||typeof claims.principal_id!=='string'||!claims.principal_id.trim())throw clientFailure('Remote token requires the exact canonical client and subscriber principal');
 // Decoding grants no trust. The live, client-tagged catalog must authenticate it.
 return {token_id:claims.sub,principal_id:claims.principal_id};
}
async function remoteTarget(context:any):Promise<any>{
 const {origin,managementServer,config={},env={},invocation={},suppliedToken}=context;const server=normalizeManagedOrigin(origin),management=normalizeManagedOrigin(managementServer);
 const target=await selectedManagedTarget({name:'clients.setup',options:{server,management_server:management},config,env,cwd:invocation.cwd});if(!target)throw clientFailure('Remote client requires a selected Router');
 const token=suppliedToken||target.token;if(typeof token!=='string'||!token.trim()||/[\r\n]/u.test(token)||Buffer.byteLength(token)>65536)throw clientFailure('Remote client requires an administrative or exact client credential');return {...target,token};
}
async function catalog(context:any,target:any,token:string):Promise<any[]>{
 const info=clientIntegration(context.client),answer=await sendRemoteManagement({server:target.server,managementServer:target.server,managementCaCert:target.caCert,token},{method:'GET',path:'/api/models',client:info.client},{fetch:context.fetch,signal:context.invocation?.signal,deadlineMs:15000,cwd:context.invocation?.cwd});return parseNativeClientCatalog(answer.data);
}
function preferred(client:string,all:any[]):any[]{const info=clientIntegration(client),rows=info.owners.flatMap(owner=>all.filter(row=>row.owned_by===owner));return info.owners.length&&(rows.length||info.strict)?rows:all;}
async function revoke(target:any,id:string,context:any):Promise<void>{
 if(typeof id!=='string'||!id||Buffer.byteLength(id)>65536)throw clientFailure('Remote managed token ID is invalid');await sendRemoteManagement(target,{method:'POST',path:'/api/management/tokens/revoke',body:{id}},{fetch:context.fetch,deadlineMs:10000,cwd:context.invocation?.cwd});
}
export async function reuseRemoteClientCredential(context:any,record:any,token:string):Promise<boolean>{
 if(record?.router!==normalizeManagedOrigin(context.origin)||record?.management_server!==normalizeManagedOrigin(context.managementServer))return false;
 try{remoteClientTokenBinding(token,context.client);const target=await remoteTarget({...context,suppliedToken:token});await catalog(context,target,token);return true;}catch(error){if(context.invocation?.signal?.aborted)throw error;return false;}
}
export async function prepareRemoteClientCredential(context:any):Promise<any>{
 const target=await remoteTarget(context),ttl=context.ttlHours===undefined?24:Number(context.ttlHours);if(!Number.isSafeInteger(ttl)||ttl<1)throw clientFailure('Remote client TTL requires positive safe integer hours');let mint=false;
 try{await sendRemoteManagement(target,{method:'GET',path:'/api/management/tokens'},{fetch:context.fetch,signal:context.invocation?.signal,cwd:context.invocation?.cwd});mint=true;}catch(error){const status=Object(error).status;if(![401,403,404].includes(status))throw error;}
 let token=target.token,binding:any,minted=false;
 if(mint){const answer=await sendRemoteManagement(target,{method:'POST',path:'/api/management/tokens/client',body:{ttl_hours:ttl,label:'client-'+context.client,client_kind:context.client,max_requests:null,sliding_expiry:false,ephemeral:false,run_lease:false,allowed_models:[],allow_model_substitution:false,model_substitution_source:null}},{fetch:context.fetch,signal:context.invocation?.signal,cwd:context.invocation?.cwd});token=answer.token;const claims=tokenClaims(token);try{binding=remoteClientTokenBinding(token,context.client);}catch(error){try{await revoke(target,claims.sub,context);}catch{throw clientFailure('Remote mint returned an invalid client binding; revocation also failed');}throw error;}minted=true;}else binding=remoteClientTokenBinding(token,context.client);
 let cleaned=false;const cleanup=async():Promise<void>=>{if(minted&&!cleaned){await revoke(target,binding.token_id,context);cleaned=true;}};
 try{const models=preferred(context.client,await catalog(context,target,token));return {token,catalog:models,record:{client:context.client,source:minted?'minted':'supplied',...binding,label:'client-'+context.client,issued_at:context.nowUnix??Math.floor(Date.now()/1000),router:target.server,management_server:target.managementServer,config_sha256:null},cleanup};}catch(error){try{await cleanup();}catch{throw clientFailure('Remote client preparation failed; unused minted credential revocation also failed');}throw error;}
}
export async function revokeRemoteClientCredential(record:any,context:any):Promise<void>{
 const target=await remoteTarget({...context,origin:record.router,managementServer:record.management_server});await revoke(target,record.token_id,context);
}
