/** Surgical ownership-aware JSON setup/removal matching src/clients/json_config.rs. */
import {optionalClientText,clientObject,objectProperty,clientFailure,renderClientJSON,writeClientFile,writeClientMarker,removeClientFile,sameClientValue} from './client-files.mjs';
const managedQwen=value=>value?.envKey==='LINK_ASSISTANT_TOKEN' && typeof value.name==='string' && value.name.startsWith('Link.Assistant.Router');
function qwenModels(document) {
  const providers=objectProperty(document,'modelProviders');providers.openai ??=[];
  if (!Array.isArray(providers.openai)) throw clientFailure('modelProviders.openai must be a JSON array');return providers.openai;
}
export async function setupClientJSON(paths,endpoint,catalog,{onWrite=async()=>{}}={}) {
  if (!['opencode','agent','qwen'].includes(paths.info.client)) throw clientFailure('Client does not use an OpenCode/Qwen JSON provider');
  if (!catalog.length) throw clientFailure('Router catalog contains no models from healthy subscriptions');
  const source=await optionalClientText(paths.config),document=clientObject(source);
  const markerSource=await optionalClientText(paths.marker);let marker=markerSource===null ? null : clientObject(markerSource,'Ownership marker');
  if (paths.info.client==='qwen') {
    const models=qwenModels(document),previous=marker?.managed_models ?? (marker?.managed_model ? [marker.managed_model] : []);
    if (!Array.isArray(previous)) throw clientFailure('Invalid ownership marker');
    const managed=catalog.map(({id})=>({id,name:'Link.Assistant.Router',baseUrl:endpoint,envKey:'LINK_ASSISTANT_TOKEN'}));
    const current=models.filter(value=>managedQwen(value) || previous.some(old=>sameClientValue(old,value)));
    if(sameClientValue(current,managed) && sameClientValue(marker?.managed_models,managed)) return {path:paths.config,backup:null,changed:false};
    document.modelProviders.openai=[...models.filter(value=>!managedQwen(value) && !previous.some(old=>sameClientValue(old,value))),...managed];
    marker={...(marker ?? {}),managed_models:managed};delete marker.managed_model;
  } else {
    const providers=objectProperty(document,'provider'),previous=providers['link-assistant'];
    const managed=previous===undefined ? {} : structuredClone(previous);
    if (!managed || typeof managed!=='object' || Array.isArray(managed)) throw clientFailure('provider.link-assistant must be a JSON object');
    Object.assign(managed,{npm:'@ai-sdk/openai-compatible',name:'Link.Assistant.Router',options:{baseURL:endpoint,apiKey:'{env:LINK_ASSISTANT_TOKEN}'}});
    const models=objectProperty(managed,'models');
    for(const id of marker?.managed_model_ids ?? []) if (!catalog.some(model=>model.id===id)) delete models[id];
    for(const {id} of catalog) if(!Object.hasOwn(models,id)) Object.defineProperty(models,id,{value:{name:`Router (${id})`},writable:true,enumerable:true,configurable:true});
    if(sameClientValue(previous,managed) && sameClientValue(marker?.managed_provider,managed)) return {path:paths.config,backup:null,changed:false};
    providers['link-assistant']=managed;
    marker=marker ?? {had_previous_provider:previous!==undefined,previous_provider:previous ?? null};
    Object.assign(marker,{managed_provider:managed,managed_model_ids:catalog.map(({id})=>id)});
  }
  const result=await writeClientFile(paths.config,source,renderClientJSON(document));await onWrite(paths.config,result);await writeClientMarker(paths.marker,marker);await onWrite(paths.marker);return result;
}
export async function removeClientJSON(paths,{onWrite=async()=>{}}={}) {
  const source=await optionalClientText(paths.config);if(source===null || !source.trim()) return {path:paths.config,backup:null,changed:false};
  const markerSource=await optionalClientText(paths.marker);if(markerSource===null || !markerSource.trim()) return {path:paths.config,backup:null,changed:false};
  const marker=clientObject(markerSource,'Ownership marker'),document=clientObject(source);let changed=false;
  if(paths.info.client==='qwen') {
    const managed=marker.managed_models ?? (marker.managed_model ? [marker.managed_model] : null);
    if(!Array.isArray(managed)) throw clientFailure('Invalid ownership marker');const models=qwenModels(document);
    document.modelProviders.openai=models.filter(model=>!managed.some(old=>sameClientValue(old,model)));changed=models.length!==document.modelProviders.openai.length;
  } else {
    if(!Object.hasOwn(marker,'managed_provider')) throw clientFailure('Invalid ownership marker');
    const providers=document.provider;
    if(providers && sameClientValue(providers['link-assistant'],marker.managed_provider)) {
      if(marker.had_previous_provider) {if(!Object.hasOwn(marker,'previous_provider')) throw clientFailure('Invalid ownership marker');providers['link-assistant']=marker.previous_provider;}
      else delete providers['link-assistant'];changed=true;
    }
  }
  const result=changed ? await writeClientFile(paths.config,source,renderClientJSON(document)) : {path:paths.config,backup:null,changed:false};
  if(changed) await onWrite(paths.config);await removeClientFile(paths.marker);await onWrite(paths.marker);return result;
}
