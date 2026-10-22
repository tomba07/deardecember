import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = new URL('../', import.meta.url);
const schema = JSON.parse(await readFile(new URL('schemas/dear-december-v1.schema.json', root), 'utf8'));
const example = JSON.parse(await readFile(new URL('examples/format-v1/journal.json', root), 'utf8'));
const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true });
addFormats(ajv);
assert(ajv.validateSchema(schema), JSON.stringify(ajv.errors));
const validate = ajv.compile(schema);
let checked = 0;
function check(name, mutate, expected) {
  const manifest = structuredClone(example);
  mutate(manifest);
  assert.equal(validate(manifest), expected, `${name}: ${JSON.stringify(validate.errors)}`);
  checked++;
}

check('example manifest', () => {}, true);
check('real collection without sample marker', doc => { delete doc.isSample; }, true);
check('optional places lived', doc => { delete doc.profile.placesLived; }, true);
check('empty places lived', doc => { doc.profile.placesLived = ''; }, true);
check('sample collection marker', doc => { doc.isSample = true; }, true);
check('sample marker must be boolean', doc => { doc.isSample = 'yes'; }, false);
check('empty collection', doc => { doc.entries = []; }, true);
check('photo with no written context or caption', doc => {
  doc.entries[1].description = ''; delete doc.entries[1].caption;
}, true);
check('known capture date', doc => { doc.entries[1].takenAt = '1997-08-17'; }, true);
check('known capture timestamp', doc => { doc.entries[1].takenAt = '1997-08-17T12:00:00Z'; }, true);
check('fractional timestamp', doc => { doc.entries[0].createdAt = '2026-10-22T18:30:00.123Z'; }, true);
check('unsupported version', doc => { doc.formatVersion = 2; }, false);
check('prototype shape does not satisfy the schema', doc => {
  delete doc.formatVersion; doc.version = 1;
}, false);
check('missing profile fact', doc => { delete doc.profile.dateOfBirth; }, false);
check('impossible birthday', doc => { doc.profile.dateOfBirth = '1992-02-30'; }, false);
check('invalid timestamp', doc => { doc.entries[0].createdAt = '2026-13-22T18:30:00Z'; }, false);
check('UTC required', doc => { doc.entries[1].createdAt = '2026-10-22T18:35:00-07:00'; }, false);
check('photo timestamp required', doc => { delete doc.entries[1].createdAt; }, false);
check('duplicate edit dates', doc => {
  doc.entries[0].modificationDates.push(doc.entries[0].modificationDates[0]);
}, false);
check('edit history must be an array', doc => { doc.entries[0].modificationDates = '2026-10-22T18:40:00Z'; }, false);
check('unknown entry type', doc => { doc.entries[0].type = 'video'; }, false);
check('misspelled field', doc => { doc.entries[1].captian = 'A caption'; }, false);
check('mixed text/photo fields', doc => { doc.entries[0].filePath = 'media/image.jpg'; }, false);
check('blank answer', doc => { doc.entries[0].text = ' \n\t'; }, false);
check('no invented precision for capture dates', doc => { doc.entries[1].takenAt = 'summer 1997'; }, false);
for (const filePath of ['../image.jpg', 'media/../image.jpg', '/media/image.jpg', 'media\\image.jpg', 'https://example.com/image.jpg', 'media/image.svg']) {
  check(`invalid media path ${filePath}`, doc => { doc.entries[1].filePath = filePath; }, false);
}
console.log(`Schema and example validated; ${checked} manifest cases passed. ZIP contents and timestamp ordering require separate application checks.`);
