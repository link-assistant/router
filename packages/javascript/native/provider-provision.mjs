/** Local provider acceptance. Specialized providers require separate reviewed probes. */
import {providerProvisionResponse} from './provider-manifest.mjs';
const failure = (outcome,message)=>Object.assign(new Error(message),{code:'provider_acceptance',outcome,exitCode:1});
export async function provisionLocalProvider(core,input) {
  const kind=(input.kind ?? 'openai-compatible').toLowerCase();
  if (!['openai-compatible','openai','openai_like','litellm','open-a-i-compatible'].includes(kind)) throw failure('unverified','Specialized provider acceptance requires its reviewed live catalog probe');
  try {
    if (!core.installProvider && !core.providers?.install) throw failure('unverified','Injected provider store cannot confirm atomic installation');
    const installed=core.installProvider ? await core.installProvider(input) : await core.providers.install(input);
    return providerProvisionResponse({...installed.record,outcome:installed.outcome});
  } catch(error) {
    if (error.outcome) throw error;
    if (error.code === 'invalid_provider' || error.code === 'invalid_config') throw failure('invalid_candidate','Provider candidate is invalid');
    throw failure('persistence_uncertain','Provider store could not confirm installation');
  }
}
export async function importLocalProviders(core,records) {
  const report={complete:true,results:[]};
  for(const record of records) {
    try {report.results.push(await provisionLocalProvider(core,record));}
    catch(error) {report.complete=false;report.results.push({name:record.name,outcome:error.outcome ?? 'unverified'});break;}
  }
  return report;
}
