import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { build } from 'esbuild';
const schema = JSON.parse(await readFile(new URL('../schemas/miniography-v1.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true, code: { source: true } });
addFormats(ajv);
await build({ stdin: { contents: standaloneCode(ajv, ajv.compile(schema)), resolveDir: process.cwd(), sourcefile: 'manifest-validator.cjs' }, bundle: true, format: 'iife', globalName: 'validateManifest', minify: true, outfile: 'src/manifest-validator.js', banner: { js: '// Generated from schemas/miniography-v1.schema.json by npm run generate:validator. Do not edit.' } });
