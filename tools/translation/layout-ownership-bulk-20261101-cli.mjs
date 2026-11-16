import {resolve} from 'node:path';
export function nativeTypeScriptCLIArguments(args,implementationRoot,{compile=false}={}){
 const values={},seen=new Set();let check=false;
 for(let at=0;at<args.length;at++){
  const argument=args[at];if(argument==='--check'&&!compile){if(check)throw Error('Repeated check mode');check=true;continue;}
  if(!['--root','--output-root','--source-root',...(compile?['--out-dir']:[])].includes(argument))throw Error('Unknown native TypeScript option: '+argument);
  const key=['--root','--output-root'].includes(argument)?'root':argument==='--source-root'?'sourceRoot':'outDir';if(seen.has(key)||!args[at+1]||args[at+1].startsWith('--'))throw Error('One explicit path required for '+argument);seen.add(key);values[key]=args[++at];
 }
 const root=resolve(values.root??implementationRoot),sourceRoot=resolve(values.sourceRoot??root),outDir=values.outDir===undefined?undefined:resolve(root,values.outDir);return {root,sourceRoot,outDir,check};
}
