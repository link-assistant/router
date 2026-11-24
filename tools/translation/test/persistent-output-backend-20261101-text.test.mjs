// Independently authored expected text behavior. SOURCE ONLY; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {redactLauncherUrls,redactOperationalUrls,PersistentTextDomainError} from '../persistent-output-backend-20261101-url.mjs';
import {launcherSanitize,operationalSanitize,rustTrim,normalizeSecretName,redactFields,jsonAggregateEnd} from '../persistent-output-backend-20261101-text.mjs';
import {chronoUtcRfc3339,nativeExitCodeDebug} from '../persistent-output-backend-20261101-time.mjs';
for(const host of ['example.0xff','x.0xBAD','example.0x','example.0X.'])test('terminal hex-number host refuses before persistence: '+host,()=>{for(const redact of [redactLauncherUrls,redactOperationalUrls])assert.throws(()=>redact('https://'+host+'/path?token=credential#fragment'),PersistentTextDomainError);});
test('literal credentials, UTF8 scalar boundaries and actual different URL policies have independent expectations',()=>{
 assert.equal(redactLauncherUrls('https://user:password@router.example/a?token=secret&name=ok#fragment'),'https://redacted@router.example/a?token=%5Bredacted%5D&name=ok#redacted');
 assert.equal(redactOperationalUrls('https://user:password@router.example/a?token=secret#fragment'),'https://router.example/a');
 assert.equal(launcherSanitize('Bearer abc.def.ghi token=credential',[]),'Bearer [redacted] token=[redacted]');
 assert.equal(operationalSanitize('la_sk_credential.',[]),'la_sk_[redacted].');
 assert.equal(normalizeSecretName('customAccessToken'),'custom_access_token');assert.equal(rustTrim('\u0085value\u0085'),'value');assert.equal(rustTrim('\ufeffvalue\ufeff'),'\ufeffvalue\ufeff');
 assert.equal(redactFields('cookie\u000b=sentinel'),'cookie\u000b=sentinel');
});
test('all duplicate JSON values and string escapes are validated before aggregate replacement',()=>{assert.equal(jsonAggregateEnd('{"token":1,"token":"x"}tail',0),23);assert.equal(jsonAggregateEnd('{"token":"\\ud800","token":"x"}',0),null);assert.equal(redactFields('secret={"nested":"credential"} tail'),'secret="[redacted]" tail');});
test('system UTC formats full nanoseconds and chrono AutoSi precision without JS Date',()=>{assert.equal(chronoUtcRfc3339(0n,0),'1970-01-01T00:00:00+00:00');assert.equal(chronoUtcRfc3339(-1n,1),'1969-12-31T23:59:59.000000001+00:00');assert.equal(chronoUtcRfc3339(0n,1000000),'1970-01-01T00:00:00.001+00:00');assert.equal(chronoUtcRfc3339(0n,1000),'1970-01-01T00:00:00.000001+00:00');assert.equal(nativeExitCodeDebug(7),process.platform==='win32'?'ExitCode(ExitCode(7))':'ExitCode(unix_exit_status(7))');});

test('malformed secret aggregate never takes a potentially raw credential fallback',()=>{for(const value of ['secret=["credential",invalid]','token={"value":"credential",}'])assert.throws(()=>redactFields(value),PersistentTextDomainError);});
