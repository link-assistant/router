// Receiving regression only: load the exact committed project predecessor at
// its canonical URL, preserving all other real compiler module identities.
import {readFileSync} from 'node:fs';
import {register} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../../ci-logs/issue-784-restart-2/current-893de-project-before.mjs.txt',import.meta.url),'utf8');
const expected=readFileSync(new URL('../../ci-logs/issue-784-restart-2/current-893de-project-before.sha256',import.meta.url),'utf8').trim();
assert.equal(createHash('sha256').update(source).digest('hex'),expected);
register(new URL('../../tools/translation/test/fixtures/project-facade-engine-loader.mjs',import.meta.url),{
 data:{url:new URL('../../tools/translation/project.mjs',import.meta.url).href,source}
});
