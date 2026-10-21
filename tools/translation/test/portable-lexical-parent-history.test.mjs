import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {materializeLexicalParentOriginalGit,readLexicalParentOriginalGit,captureLexicalParentOriginalGit,LEXICAL_PARENT_ORIGINAL_REVISION,LEXICAL_PARENT_ORIGINAL_PATHS} from './portable-lexical-parent-history.mjs';
import {portableGit} from '../prepare-portable-git-fixtures.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');

test('portable lexical parent history keeps all five complete original Git source bodies and Rust CSTs',{timeout:60000},t=>{
 const fixture=materializeLexicalParentOriginalGit(t),record=readLexicalParentOriginalGit(),ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');assert.equal(fixture.revision,LEXICAL_PARENT_ORIGINAL_REVISION);assert.equal(record.objects.size,9);assert.equal(portableGit(fixture.root,['remote']).toString(),'');assert.equal(fs.existsSync(join(fixture.root,'.git/objects/info/alternates')),false);
 const attributes=portableGit(fixture.root,['rev-parse',fixture.revision+':.gitattributes']).toString('ascii').trim(),originalAttributes=record.objects.get(attributes);assert.equal(originalAttributes.kind,'blob');assert.ok(portableGit(fixture.root,['cat-file','blob',attributes]).equals(originalAttributes.raw));
 assert.deepEqual(record.data.files.map(row=>row.path),LEXICAL_PARENT_ORIGINAL_PATHS);
 for(const row of record.data.files){const raw=portableGit(fixture.root,['show',fixture.revision+':'+row.path]),source=raw.toString('utf8');assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.sha256);assert.ok(Buffer.from(source).equals(raw));assert.equal(transportConcreteSyntaxMeta(row.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.meta).document.language,'Rust');}
});

test('portable lexical parent fixture reproduces every original object path and complete CST without parent ancestry',{timeout:60000},t=>{
 const fixture=materializeLexicalParentOriginalGit(t),record=readLexicalParentOriginalGit(),again=captureLexicalParentOriginalGit({root:fixture.root});assert.deepEqual(again.value,record.data);assert.deepEqual(again.trace.map(row=>row.phase),['language','repository']);
 const raw=portableGit(fixture.root,['cat-file','commit',fixture.revision]).toString('utf8'),parent=/^parent ([a-f0-9]{40})$/mu.exec(raw)?.[1];assert.ok(parent);assert.throws(()=>portableGit(fixture.root,['cat-file','-e',parent]));assert.equal(record.data.parentAncestryRequired,false);assert.equal(record.data.sourceAuthority,false);assert.equal(record.data.runtimeParity,false);
});

test('missing original blob in a materialized lexical parent tree cannot be replaced by source spelling or partial data',{timeout:60000},t=>{
 const fixture=materializeLexicalParentOriginalGit(t),record=readLexicalParentOriginalGit(),selected=record.data.files[0],path=join(fixture.root,'.git/objects',selected.gitBlob.slice(0,2),selected.gitBlob.slice(2));assert.ok(fs.existsSync(path));fs.unlinkSync(path);
 assert.throws(()=>portableGit(fixture.root,['show',fixture.revision+':'+selected.path]));assert.throws(()=>captureLexicalParentOriginalGit({root:fixture.root}));
});
