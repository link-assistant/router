import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {captureOriginalCargoEdition,originalCargoEditionEvidence,configureRustEditionParser,requireParserEdition} from '../cargo-edition-context.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const manifest=edition=>`[package]\nname="fixture"\nversion="0.1.0"\nedition="${edition}"\n`;
const parserFor=source=>configureRustEditionParser({},captureOriginalCargoEdition(source));

test('the complete actual Router Cargo input supplies its explicit source edition',()=>{
  const source=readFileSync(new URL('../../../Cargo.toml',import.meta.url),'utf8'),token=captureOriginalCargoEdition(source),evidence=originalCargoEditionEvidence(token);
  assert.equal(evidence.status,'explicit-package-edition');assert.equal(evidence.edition,'2024');
  assert.equal(evidence.sourceSha256,hash(source));assert.equal(evidence.sourceBytes,Buffer.byteLength(source));assert.equal(evidence.sourceCoordinateUnit,'utf16');
  assert.equal(evidence.declaration.sha256,hash(source.slice(evidence.declaration.originalSpan.start,evidence.declaration.originalSpan.end)));
  assert.match(source.slice(evidence.declaration.originalSpan.start,evidence.declaration.originalSpan.end),/^edition\s*=\s*"2024"/u);
  assert.equal(requireParserEdition(configureRustEditionParser({},token),'2024',{start:0,end:1}),evidence);
  assert.equal(evidence.completeTomlValidation,false);assert.equal(evidence.workspaceInheritanceAdmitted,false);
});

test('Cargo strings comments arrays and other sections cannot fabricate a package edition',()=>{
  const source='[package]\nname="fixture"\nversion="0.1.0"\nedition = "2024" # original\nkeywords=["[package]", "edition=2021"]\n[package.metadata]\nquoted="""\n[package]\nedition="2021"\n"""\nliteral=\'\'\'\n[package]\nedition="2018"\n\'\'\'\n# [package]\n# edition="2015"\n[dependencies]\nedition="2021"\n';
  const evidence=originalCargoEditionEvidence(captureOriginalCargoEdition(source));
  assert.equal(evidence.status,'explicit-package-edition');assert.equal(evidence.edition,'2024');
  assert.equal(evidence.sourceSha256,hash(source));assert.equal(requireParserEdition(parserFor(source),'2024',{start:0,end:1}).edition,'2024');
  for(const key of ['edition','"edition"',"'edition'"]){
    const original="[package]\nname=\"fixture\"\n"+key+" = '2024' # original\n",pin=originalCargoEditionEvidence(captureOriginalCargoEdition(original));
    assert.equal(pin.edition,'2024');
    const raw=original.slice(pin.declaration.originalSpan.start,pin.declaration.originalSpan.end);
    assert.equal(raw.startsWith(key+' = '),true);assert.equal(pin.declaration.sha256,hash(raw));
  }
});

test('explicit different source editions cannot borrow the selected let-chain grammar profile',()=>{
  for(const edition of ['2015','2018','2021']){
    const source=manifest(edition),token=captureOriginalCargoEdition(source),evidence=originalCargoEditionEvidence(token);
    assert.equal(evidence.status,'explicit-package-edition');assert.equal(evidence.edition,edition);
    assert.throws(()=>requireParserEdition(configureRustEditionParser({},token),'2024',{start:11,end:29}),/source crate edition|actual original Cargo/u);
  }
  assert.throws(()=>requireParserEdition(configureRustEditionParser({},null),'2024',{start:11,end:29}),/source crate edition|actual original Cargo/u);
});

test('absent inherited duplicate malformed and over-budget original edition inputs stay unknown',()=>{
  for(const source of [
    '[package]\nname="fixture"\n',
    '[workspace.package]\nedition="2024"\n[package]\nname="fixture"\nedition.workspace=true\n',
    '[package]\nname="fixture"\nedition={workspace=true}\n',
    manifest('2024')+'edition="2021"\n',
    manifest('2024')+'[package]\nedition="2024"\n',
    manifest('2024')+'["package"]\nedition="2024"\n',
    manifest('2024')+'"\\u0065dition"="2021"\n',
    'package.edition="2021"\n'+manifest('2024'),
    '[package.edition]\nworkspace=true\n'+manifest('2024'),
    '["package"."edition"]\nworkspace=true\n'+manifest('2024'),
    '[package]\nedition="2024\n',
    '[package]\nedition=["2024"}\n',
    '[package]\nedition="2024"\n'+('#'.repeat(1_048_577)),
  ]){
    const token=captureOriginalCargoEdition(source),evidence=originalCargoEditionEvidence(token);
    assert.equal(evidence.status,'unknown');assert.equal(evidence.edition,null);
    assert.throws(()=>requireParserEdition(configureRustEditionParser({},token),'2024',{start:1,end:8}),/source crate edition|actual original Cargo/u);
  }
});

test('serialized or public edition metadata cannot mint original parser context or execute traps',()=>{
  const token=captureOriginalCargoEdition(manifest('2024')),evidence=originalCargoEditionEvidence(token);
  for(const fake of [structuredClone(token),structuredClone(evidence),{schema:evidence.schema,edition:'2024'},{}]){
    assert.equal(originalCargoEditionEvidence(fake),null);
    assert.throws(()=>configureRustEditionParser({},fake),/private original Cargo/u);
  }
  let calls=0;
  const fake=new Proxy(token,{get(){calls++;throw Error('get');},ownKeys(){calls++;throw Error('keys');},getPrototypeOf(){calls++;throw Error('prototype');},getOwnPropertyDescriptor(){calls++;throw Error('descriptor');}});
  assert.equal(originalCargoEditionEvidence(fake),null);assert.throws(()=>configureRustEditionParser({},fake),/private original Cargo/u);assert.equal(calls,0);
  assert.equal(Object.isFrozen(token),true);assert.equal(Object.isFrozen(evidence),true);assert.equal(Object.isFrozen(evidence.declaration),true);
});
