// Complete current module inputs; scalar output records the missing refusal.
import {readFileSync} from 'node:fs';
import {translateProject} from '../../tools/translation/project.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {repositorySourceURL} from '../../tools/translation/test/fixtures/repository-paths.mjs';
const root=new URL('../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8');
const files=Object.fromEntries(['src/bridge_request.rs','src/bridge_request_tools.rs'].map(path=>[path,read(path)]));
const result=translateProject({entry:'src/bridge_request.rs',paths:Object.keys(files),readSource:path=>files[path],deriveDependencies:loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')}),compilationProfile:PRODUCTION_PROFILE});
const name='untranslatable_responses_state',encoded=Buffer.from(name).toString('hex');
for(const key of ['refused','executable','checkedMethods','sources']){
 const rows=result.meta[key]??[];
 console.log(JSON.stringify({key,total:rows.length,selected:rows.filter(row=>key==='sources'||JSON.stringify(row).includes(name)||JSON.stringify(row).includes(encoded))}));
}
