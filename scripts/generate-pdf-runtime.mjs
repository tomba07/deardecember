import {build} from 'esbuild';
await build({stdin:{contents:"export {jsPDF} from 'jspdf';",resolveDir:process.cwd(),sourcefile:'pdf-runtime.mjs'},bundle:true,format:'esm',minify:true,external:['canvg','html2canvas','dompurify'],outfile:'src/pdf-runtime.js',legalComments:'eof',banner:{js:'// Generated from jsPDF by scripts/generate-pdf-runtime.mjs. Do not edit.'}});
