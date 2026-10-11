import {ProtocolError} from './protocols.mjs';
const invoke = async (target,method,...args) => {if(typeof target?.[method] !== 'function')throw new ProtocolError('Management service is unavailable',503);return target[method](...args);};
/** Shared management routing delegates persistence/process work to core services. */
export async function managementOperation(core,request,path,body) {
  const method=request.method;
  if(path === '/api/management/admin/status' && method === 'GET')return invoke(core.admin,'status');
  if(path === '/api/management/admin/bootstrap' && method === 'POST')return invoke(core.admin,'beginWithTtl',body?.ttl_hours);
  if(path === '/api/management/admin/bootstrap/confirm' && method === 'POST') {
    const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token)throw new ProtocolError('Confirm must present the candidate token as a Bearer credential',401);
    if(typeof body?.claim_id !== 'string' || !body.claim_id)throw new ProtocolError('claim_id is required');
    await invoke(core.admin,'confirm',body.claim_id,token);return {claimed:true};
  }
  if(path === '/api/management/admin/rotate' && method === 'POST')return invoke(core.admin,'rotate',request.headers.get('authorization')?.replace(/^Bearer /,''),body?.ttl_hours);
  if(path === '/api/management/admin/summary' && method === 'GET')return invoke(core.admin,'summary');
  if(path === '/api/management/auth/status' && method === 'GET')return invoke(core,'credentialStatus');
  if(path === '/api/management/auth/diagnostics' && method === 'GET')return invoke(core,'authDiagnostics');
  if(path === '/api/management/health/subscriptions' && method === 'GET')return invoke(core,'subscriptionHealth');
  if(path === '/api/management/emergency-auth' && method === 'GET')return invoke(core.emergencyAuth,'status');
  if(path === '/api/management/emergency-auth/disable' && method === 'POST')return invoke(core.emergencyAuth,'disable');
  if(path === '/api/management/login' && method === 'POST') {
    const provider=(body?.provider ?? 'claude').trim().toLowerCase();if(!['claude','codex'].includes(provider))throw new ProtocolError('provider must be claude or codex');
    if(body?.mode && !['full','setup-token'].includes(body.mode))throw new ProtocolError('mode must be full or setup-token');
    return invoke(core.login,'begin',{...body,provider});
  }
  const login=/^\/api\/management\/login\/([^/]+)(?:\/(code))?$/.exec(path);
  if(login) {
    const id=decodeURIComponent(login[1]);
    if(login[2] && method === 'POST'){if(typeof body?.code !== 'string' || !body.code.trim())throw new ProtocolError('code must not be empty');return invoke(core.login,'submitCode',id,body.code);}
    if(!login[2] && method === 'GET'){const result=await invoke(core.login,'status',id);if(!result)throw new ProtocolError('Login not found',404);return result;}
    if(!login[2] && method === 'DELETE'){const result=await invoke(core.login,'cancel',id);if(!result)throw new ProtocolError('Login not found',404);return {cancelled:true};}
  }
  const definitions=/^\/api\/management\/routing\/model-definitions\/([^/]+)$/.exec(path);
  if(definitions && method === 'GET')return invoke(core,'modelDefinitions',decodeURIComponent(definitions[1]));
  if(path === '/api/management/server/latest-version' && method === 'GET')return invoke(core,'latestVersion');
  return undefined;
}
