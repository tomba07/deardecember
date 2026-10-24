import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { build } from 'esbuild';
const schema = JSON.parse(await readFile(new URL('../schemas/dear-december-v1.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true, code: { source: true } });
addFormats(ajv);
await build({ stdin: { contents: standaloneCode(ajv, ajv.compile(schema)), resolveDir: process.cwd(), sourcefile: 'manifest-validator.cjs' }, bundle: true, format: 'iife', globalName: 'validateManifest', minify: true, outfile: 'src/manifest-validator.js', banner: { js: '// Generated from schemas/dear-december-v1.schema.json by npm run generate:validator. Do not edit.' } });

const legacySchema = JSON.parse(await readFile(new URL('../schemas/legacy-journal-v1.schema.json', import.meta.url), 'utf8'));
await build({ stdin: { contents: standaloneCode(ajv, ajv.compile(legacySchema)), resolveDir: process.cwd(), sourcefile: 'legacy-validator.cjs' }, bundle: true, format: 'iife', globalName: 'validateLegacyManifest', minify: true, outfile: 'src/legacy-validator.js', banner: { js: '// Generated legacy import validator. Do not edit.' } });

await build({ stdin: { contents: standaloneCode(ajv, ajv.compile(schema)), resolveDir: process.cwd(), sourcefile: 'server-validator.cjs' }, bundle: true, platform: 'node', format: 'cjs', minify: true, outfile: 'server/manifest-validator.cjs', banner: { js: '// Generated from schemas/dear-december-v1.schema.json. Do not edit.' } });
