// Independent paired runtime/native expectations SOURCE; do not execute locally.
// Pure helper admission is narrower than url2.5.8: native success is not parity.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {redactLauncherUrls,redactOperationalUrls,PersistentTextDomainError} from '../persistent-output-backend-20261101-url.mjs';
const fixture=JSON.parse(readFileSync(new URL('../../../rust/tests/fixtures/persistent-url-host-boundaries-20261101.json',import.meta.url),'utf8'));

test('complete independent persistent URL host boundary table',{timeout:60000},()=>{
 assert.equal(fixture.schema,'persistent-url-host-boundaries-20261101-v1');
 assert.equal(fixture.upstream,'url2.5.8');
 assert.equal(fixture.rows.length,18);
 const seen=new Set();
 for(const row of fixture.rows){
  assert.equal(typeof row.input,'string');assert.equal(seen.has(row.input),false);seen.add(row.input);
  for(const [lane,redact]of [['launcher',redactLauncherUrls],['operational',redactOperationalUrls]]){
   if(row[lane]===null)assert.throws(()=>redact(row.input),PersistentTextDomainError,lane+': '+row.input);
   else assert.equal(redact(row.input),row[lane],lane+': '+row.input);
  }
 }
});

test('URL text boundaries preserve trailing messages and unchanged candidate spelling',{timeout:60000},()=>{
 assert.equal(redactLauncherUrls('before (https://EXAMPLE.com:443/path), after'),'before (https://EXAMPLE.com:443/path), after');
 assert.equal(redactOperationalUrls('before (https://user:sentinel@EXAMPLE.com:443/path?secret=sentinel), after'),'before (https://example.com/path), after');
 assert.equal(redactLauncherUrls('https://example.com/?cookie=sentinel https://example.com/?key=sentinel'),'https://example.com/?cookie=%5Bredacted%5D https://example.com/?key=%5Bredacted%5D');
});
