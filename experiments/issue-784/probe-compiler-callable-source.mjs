// Finite callable-source diagnosis. This grants no compiler or runtime authority.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../../js/package.json',import.meta.url));
const ts=require('typescript'),path=require.resolve('typescript'),source=readFileSync(path,'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const rows=['shouldLog','getAssertionLevel','shouldAssert','assert'].map(key=>{
 const field=Object.getOwnPropertyDescriptor(ts.Debug,key),text=Function.prototype.toString.call(field.value);
 const at=source.indexOf('function '+key+'(');
 return {key,text,exactSourceIndex:source.indexOf(text),candidateOffset:at,candidate:at<0?null:source.slice(at,at+Math.max(text.length+80,300))};
});
console.log(JSON.stringify({runtime:process.versions,typescript:ts.version,path,sourceBytes:Buffer.byteLength(source),sha256:hash(source),rows,semanticAuthority:false},null,2));
