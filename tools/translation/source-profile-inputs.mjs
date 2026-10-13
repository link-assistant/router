// Complete original profiles remain fingerprint inputs, never semantic authority.
import {discoverTrackedInputs} from './tracked-inputs.mjs';
export const SOURCE_PROFILE_INPUT_LIMITS=Object.freeze({files:8192,fileBytes:32*1024*1024,totalBytes:256*1024*1024});
export function discoverSourceProfileInputs({root,limits}={}){
  return discoverTrackedInputs({root,prefix:'tools/translation/source-profiles/',limits,maximumLimits:SOURCE_PROFILE_INPUT_LIMITS,errorPrefix:'Source profile inputs'});
}
