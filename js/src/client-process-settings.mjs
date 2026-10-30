/** Process-local settings projected from actual native contracts; catalog rows remain DATA. */
import {clientFailure,clientIntegration} from './client-files.mjs';
import {persistentClaudeGatewayModel} from './client-persistent.mjs';
import {nativeClientModelAuthorized} from './client-catalog.mjs';
const privacyDefaults=["DISABLE_ERROR_REPORTING","DISABLE_AUTOUPDATER","DISABLE_FEEDBACK_COMMAND"];
export function usableProcessModels(client,models){
 if(!Array.isArray(models)||models.length>10000)throw clientFailure('Process catalog requires bounded rows');const info=clientIntegration(client),preferred=info.owners.flatMap(owner=>models.filter(row=>row.owned_by===owner));return info.owners.length&&(preferred.length||info.strict)?preferred:[...models];
}
export function codexProcessCatalog(models,effort=null,selected=null){
 if(!models.length)throw clientFailure('The Router advertised no models for Codex');const listed=[],omitted=[];
 for(const model of models){const levels=model.supported_reasoning_levels;if(levels!=null&&model.default_reasoning_level!=null&&!levels.some((row)=>row.effort===model.default_reasoning_level)){if(selected===model.id)throw clientFailure('Selected Codex model has inconsistent reasoning metadata');omitted.push(model.id);}else listed.push(model);}
 const compatible=(model)=>effort===null||model.supported_reasoning_levels==null||model.supported_reasoning_levels.some((row)=>row.effort===effort);
 if(selected!==null&&effort!==null){const model=listed.find(row=>row.id===selected);if(!model||!compatible(model))throw clientFailure('Selected Codex model does not support configured reasoning effort');}
 const rows=listed.filter(compatible);if(!rows.length)throw clientFailure('Live Codex catalog has no compatible reasoning metadata');
 return {omitted,document:{models:rows.map((model,index)=>({slug:model.id,display_name:model.id,description:model.owned_by+' via Link.Assistant.Router'+(model.supported_reasoning_levels==null?'; reasoning metadata unavailable, so Codex keeps your configured reasoning effort':''),default_reasoning_level:model.supported_reasoning_levels==null?effort:model.default_reasoning_level??null,supported_reasoning_levels:model.supported_reasoning_levels??[],shell_type:'unified_exec',visibility:'list',supported_in_api:true,priority:Math.min(index,2147483647),availability_nux:null,upgrade:null,support_verbosity:false,default_verbosity:null,apply_patch_tool_type:'freeform',truncation_policy:{mode:'tokens',limit:10000},experimental_supported_tools:[],base_instructions:''}))}};
}
export function claudeProcessSettings(models){
 const usable=usableProcessModels('claude',models),anthropic=usable.some(row=>row.owned_by==='anthropic'),rows=new Map(),unavailable=new Set(usable.filter(row=>row.router_unavailable_reason!=null).map(row=>row.id));
 const candidates=usable.filter(row=>typeof row.id==='string'&&row.id.trim()&&!['default','opus','sonnet','haiku'].includes(row.id.trim().toLowerCase())).sort((left,right)=>Number(left.owned_by!=='anthropic')-Number(right.owned_by!=='anthropic')||(left.id<right.id?-1:left.id>right.id?1:0));
 for(const model of candidates){const capability=model.client_capabilities?.claude,behaves=typeof capability?.behaves_as==='string'&&capability.behaves_as.trim()&&typeof capability.source==='string'&&capability.source.trim()?capability.behaves_as:null;if(!rows.has(model.id))rows.set(model.id,{model:model.id,label:model.id+(unavailable.has(model.id)?' (unavailable)':''),behaves});else if(rows.get(model.id).behaves!==behaves)rows.get(model.id).behaves=null;}
 const options=[...rows.values()].map(({model,label,behaves})=>({model,label,...(behaves===null?{}:{behavesAs:behaves})}));return {verbose:true,...(options.length?{modelPicker:{options,replaceBuiltInOptions:!anthropic}}:{})};
}
export function claudeProcessEnvironment(env,models,selected=null,savedModel=null){
 const result={ANTHROPIC_API_KEY:'',CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY:'1'},anthropic=models.some(row=>row.owned_by==='anthropic'),gateway=selected!==null&&models.some(row=>row.id===selected&&row.owned_by==='z.ai')?selected:persistentClaudeGatewayModel(models),chosen=env.ANTHROPIC_MODEL?.trim()||(selected===null?savedModel?.trim():null);
 for(const key of privacyDefaults)if(env[key]===undefined)result[key]='1';
 const family=(value)=>['default','opus','sonnet','haiku'].includes(value.trim().split('[')[0].toLowerCase());
 let suppress=false;if(chosen){const semanticDefault=chosen.toLowerCase()==='default';if(!(semanticDefault&&!anthropic)){if(!nativeClientModelAuthorized('claude',models,chosen)&&!(anthropic&&family(chosen)))throw clientFailure('Saved or inherited Claude model is not authorized by the live catalog');suppress=true;}}
 if(!anthropic&&gateway)for(const key of ['ANTHROPIC_DEFAULT_OPUS_MODEL','ANTHROPIC_DEFAULT_SONNET_MODEL','ANTHROPIC_DEFAULT_HAIKU_MODEL'])result[key]=models.some(row=>row.id===env[key])?env[key]:gateway;
 if(!suppress&&gateway)for(const key of ['ANTHROPIC_MODEL','CLAUDE_CODE_SUBAGENT_MODEL'])result[key]=gateway;return result;
}
export function codexProcessOverrides(origin,backend,catalogPath,provider,models,selected=null){
 const endpoint=origin+'/api/services/codex/v1',websockets=selected!==null?models.some(row=>row.id===selected&&row.owned_by!=='z.ai'):!usableProcessModels('codex',models).some(row=>row.owned_by==='z.ai'),definition='{ name = "OpenAI", base_url = '+JSON.stringify(endpoint)+', wire_api = "responses", requires_openai_auth = true, supports_websockets = '+websockets+', supports_standalone_web_search = true }',result=[];
 for(const [key,value]of [['model_provider',JSON.stringify(provider)],['model_catalog_json',JSON.stringify(catalogPath)],['model_providers.'+provider,definition],['chatgpt_base_url',JSON.stringify(backend)],['experimental_realtime_ws_base_url',JSON.stringify(endpoint)],['experimental_realtime_webrtc_call_base_url',JSON.stringify(endpoint)]])result.push('-c',key+'='+value);return result;
}

export function claudeProcessPrivacyWarnings(env){const blockers=["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC","DISABLE_TELEMETRY","DO_NOT_TRACK"].filter((key)=>key==='DO_NOT_TRACK'?env[key]==='1'||env[key]?.toLowerCase()==='true':env[key]!==undefined&&env[key]!=='');return blockers.length?['inherited '+blockers.join(' and ')+' preserves user privacy choices and disables Claude feature-flag evaluation']:[];}
