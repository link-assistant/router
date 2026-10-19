/** Rust-compatible provider import syntax, parsed before any provisioning. */
const fail = message=>Object.assign(new Error(message),{code:'provider_import',exitCode:2});
const fields = new Set(['name','kind','base_url','default_model','models','supported_clients','api_key','api_key_env','encrypted_api_key','enabled','subscriber_id','acknowledge_intermediary_risk','acknowledge_unsupported_clients','if_absent']);
function record(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.name !== 'string' || typeof input.base_url !== 'string') throw fail('Provider declarations require name and base_url strings');
  const result = {if_absent:false,...Object.fromEntries(Object.entries(input).filter(([key])=>fields.has(key)))};
  for (const name of ['kind','default_model','api_key','api_key_env','encrypted_api_key','subscriber_id']) if (result[name] != null && typeof result[name] !== 'string') throw fail(`${name} must be a string`);
  for (const name of ['models','supported_clients','acknowledge_unsupported_clients']) if (result[name] != null && (!Array.isArray(result[name]) || result[name].some(value=>typeof value !== 'string'))) throw fail(`${name} must contain strings`);
  for (const name of ['enabled','acknowledge_intermediary_risk','if_absent']) if (result[name] != null && typeof result[name] !== 'boolean') throw fail(`${name} must be boolean`);
  if ((result.kind ?? '').toLowerCase() === 'lefine' && result.api_key) throw fail('Lefine import files cannot contain plaintext api_key material; use api_key_env or providers add --api-key-stdin');
  return result;
}
export function parseProviderImport(text) {
  if (typeof text !== 'string') throw fail('Provider import requires UTF-8 text');
  const trimmed=text.trimStart();let inputs;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const value=JSON.parse(text);inputs=Array.isArray(value) ? value : Array.isArray(value?.providers) ? value.providers : [value];
  } else if (text.split(/\r?\n/).some(line=>line.startsWith('PROVIDER: '))) {
    inputs=text.split(/\r?\n/).map(line=>line.trim()).filter(line=>line.startsWith('PROVIDER: ')).map(line=>JSON.parse(line.slice(10)));
  } else {
    inputs=[];let current;
    const aliases={'base-url':'base_url',api_base:'base_url','api-base':'base_url',model:'default_model','default-model':'default_model','supported-clients':'supported_clients','api-key':'api_key','api-key-env':'api_key_env','subscriber-id':'subscriber_id','acknowledge-intermediary-risk':'acknowledge_intermediary_risk','acknowledge-unsupported-clients':'acknowledge_unsupported_clients'};
    for (const raw of text.split(/\r?\n/)) {
      if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
      if (!/^[ \t]/.test(raw)) {current={name:raw.trim(),kind:'openai-compatible',base_url:'',models:[],supported_clients:[],enabled:true,if_absent:false};inputs.push(current);continue;}
      if (!current) throw fail('Indented provider field without provider name');
      const match=/^(\S+)\s+(.*)$/.exec(raw.trim());if (!match) throw fail('Provider field must be key value');
      const key=aliases[match[1]] ?? match[1];let value=match[2].trim();if (value.startsWith('"') && value.endsWith('"')) value=value.slice(1,-1);
      if (!fields.has(key) || ['name','encrypted_api_key','if_absent'].includes(key)) throw fail(`Unknown provider field: ${match[1]}`);
      if (['models','supported_clients','acknowledge_unsupported_clients'].includes(key)) value=value.split(',').map(value=>value.trim()).filter(Boolean);
      else if (['enabled','acknowledge_intermediary_risk'].includes(key)) value=['true','1','yes'].includes(value);
      current[key]=value;
    }
    if (!inputs.length) throw fail('Provider import did not contain any providers');
  }
  return inputs.map(record);
}

/** Decode the public typed acceptance DTO; discard unexpected secret fields. */
export function providerProvisionResponse(answer) {
  if (!answer || !['created','replaced','already_present'].includes(answer.outcome) || typeof answer.name !== 'string' || !['openai-compatible','lefine','zai-coding-plan'].includes(answer.kind) || typeof answer.base_url !== 'string') throw fail('Remote provider acceptance is unverified');
  for (const key of ['models','supported_clients','unsupported_clients']) if (!Array.isArray(answer[key]) || answer[key].some(value=>typeof value !== 'string')) throw fail('Remote provider acceptance is unverified');
  for (const key of ['has_encrypted_api_key','enabled','intermediary_risk_acknowledged']) if (typeof answer[key] !== 'boolean') throw fail('Remote provider acceptance is unverified');
  for (const key of ['default_model','api_key_env']) if (answer[key] != null && typeof answer[key] !== 'string') throw fail('Remote provider acceptance is unverified');
  return Object.fromEntries(['outcome','name','kind','base_url','models','supported_clients','has_encrypted_api_key','enabled','intermediary_risk_acknowledged','unsupported_clients','default_model','api_key_env'].filter(key=>answer[key] != null).map(key=>[key,answer[key]]));
}
