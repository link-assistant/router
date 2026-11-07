// Diagnostic only: transform one canonical module so all genuine private
// issuers import the same module instance. No installed source pin changes.
import {readFileSync} from 'node:fs';
const project=new URL('../../tools/translation/project.mjs',import.meta.url).href;
const selected=process.env.ROUTER_PROJECT_CLOSURE_DIAGNOSTIC;
if(!['original','candidate'].includes(selected))throw new TypeError('Select one fixed project diagnostic source');
const candidate=new URL('./project-closure-'+selected+'.mjs',import.meta.url);
export async function load(url,context,next){
 const result=await next(url,context);
 return url===project?{...result,source:readFileSync(candidate,'utf8')}:result;
}
