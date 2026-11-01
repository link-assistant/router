// Complete original compiler and profile selection contracts, independent budgets.
// SOURCE ONLY / UNRUN. Index-image DATA supplies no compiler permission.
// Complete tracked translator modules are fingerprint inputs. Capturing their
// bytes never certifies translated source or generated runtime behavior.
import {discoverFixedForwardTrackedInputs as discoverTrackedInputs} from './forward-output-ownership-20261101-tracked-inputs.mjs';
export const COMPILER_SOURCE_INPUT_LIMITS=Object.freeze({files:8192,fileBytes:32*1024*1024,totalBytes:256*1024*1024});
const prefix='tools/translation/';
export function isCompilerSourceInputPath(path){
  if(!path.startsWith(prefix))return false;
  const relative=path.slice(prefix.length),parts=relative.split('/');
  if(parts.some(part=>['test','fixtures','meta','projects','generated','source-profiles'].includes(part)||part.endsWith('-generated')))return false;
  return /\.(?:mjs|js|json|mts|ts)$/u.test(relative)&&!/(?:^|\/)\S+\.test\.(?:mjs|js|mts|ts)$/u.test(relative);
}
export function discoverCompilerSourceInputs({root,limits}={}){
  return discoverTrackedInputs({root,prefix,select:isCompilerSourceInputPath,limits,maximumLimits:COMPILER_SOURCE_INPUT_LIMITS,errorPrefix:'Compiler source inputs'});
}

// Complete original profiles remain fingerprint inputs, never semantic authority.
export const SOURCE_PROFILE_INPUT_LIMITS=Object.freeze({files:8192,fileBytes:32*1024*1024,totalBytes:256*1024*1024});
export function discoverSourceProfileInputs({root,limits}={}){
  return discoverTrackedInputs({root,prefix:'tools/translation/source-profiles/',limits,maximumLimits:SOURCE_PROFILE_INPUT_LIMITS,errorPrefix:'Source profile inputs'});
}
