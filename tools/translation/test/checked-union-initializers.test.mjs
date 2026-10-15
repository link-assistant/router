import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const retain=(name,value)=>{const directory=process.env.ROUTER_CHECKED_UNION_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value)+'\n');}};

test('literal and conditional nominal constructors retain their whole checked union in strict TypeScript',{timeout:60000},async()=>{
 const source='enum Choice{Empty,Text(&\'static str)}pub fn literal()->bool{let value:Choice=Choice::Text("private");match value{Choice::Empty=>false,Choice::Text(text)=>text=="private"}}pub fn choose(mode:bool)->bool{let value=if mode{Choice::Text("private")}else{Choice::Empty};match value{Choice::Empty=>false,Choice::Text(text)=>text=="private"}}';
 const result=compile(source);retain('01-complete-nominal-program',{source,result});assert.deepEqual(result.meta.refused,[]);
 assert.match(result.typescript,/as Readonly</u);assert.match(result.typescript,/readonly "\$": "Empty"/u);assert.match(result.typescript,/readonly "\$": "Text"/u);
 await verifyTypedTargets(result,api=>{assert.equal(api.literal(),true);assert.equal(api.choose(true),true);assert.equal(api.choose(false),false);},{childTimeoutMs:20000});
});

test('contextual Some and None operands execute the original four arms through strict TypeScript',{timeout:60000},async()=>{
 const source='pub fn private(value:Option<&str>)->bool{value==Some("private")}pub fn absent(value:Option<&str>)->bool{None==value}pub fn pair(a:Option<&str>,b:Option<&str>)->bool{a==b}',result=compile(source),observations=[];
 retain('02-complete-option-program',{source,result});assert.deepEqual(result.meta.refused,[]);
 const values=[Object.freeze({$:'None'}),...['','private','Private','private\0','Ω😀'].map(field0=>Object.freeze({$:'Some',field0}))];
 await verifyTypedTargets(result,api=>{for(const value of values){assert.equal(api.private(value),value.$==='Some'&&value.field0==='private');assert.equal(api.absent(value),value.$==='None');for(const other of values){const expected=value.$===other.$&&(value.$==='None'||value.field0===other.field0),actual=api.pair(value,other);assert.equal(actual,expected);observations.push({value,other,expected,actual});}}},{childTimeoutMs:20000});
 retain('02-independent-observations',observations);
});
