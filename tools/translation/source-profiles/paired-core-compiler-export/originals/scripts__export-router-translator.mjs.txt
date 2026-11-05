#!/usr/bin/env node
import {exportPartitionedTranslatorBundle as exportTranslatorBundle} from '../tools/translation/partitioned-export-bundle.mjs';
const args=process.argv.slice(2),options={};
for(let index=0;index<args.length;index++){
  const key=args[index],value=args[index+1];
  if(!['--root','--output'].includes(key)||!value||value.startsWith('--')||Object.hasOwn(options,key==='--root'?'sourceRoot':'output'))throw new Error('Usage: node scripts/export-router-translator.mjs --output NEW_DIRECTORY [--root SOURCE_REPOSITORY]');
  options[key==='--root'?'sourceRoot':'output']=value;index++;
}
const {destination,manifest}=exportTranslatorBundle(options);
console.log(JSON.stringify({destination,schema:manifest.schema,sourceHead:manifest.sourceHead,sourceInventorySha256:manifest.sourceInventorySha256,files:manifest.files,totalSourceBytes:manifest.totalSourceBytes,runtimeParity:false}));
