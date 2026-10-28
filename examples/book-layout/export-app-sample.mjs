// Reproduce the sample through the actual browser Download PDF button.
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const root=new URL('../../src/',import.meta.url);
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname,file=new URL(path==='/'?'index.html':'.'+path,root);
 if(!file.href.startsWith(root.href))throw Error();
 res.setHeader('Content-Type',file.pathname.endsWith('.js')?'text/javascript':file.pathname.endsWith('.css')?'text/css':file.pathname.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404).end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch();
try{
 const page=await browser.newPage({reducedMotion:'reduce'});
 const photo=(await readFile(new URL('./assets/seabrook-beach.jpg',import.meta.url))).toString('base64');
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.waitForFunction(()=>typeof window.refreshSavedGeneration==='function');
 await page.evaluate(photo=>{
  dismissIntro();startSimulation();
  generatedDraft={markdown:[
   '## The places I grew up\n\nI was born in Brookfield in 1988. From 1991 to 1994, we lived in Seabrook. After that, we moved to Oakridge.',
   '## The beaches in Seabrook\n\nI have fond memories of the beaches in Seabrook. We lived there for three years, before moving to Oakridge.',
   '## The hill in Oakridge\n\nOne of my fond memories from Oakridge is sledding on the hill. The beaches in Seabrook and that hill are two places I remember from growing up.',
   '## An ordinary weekday\n\nThis part of the sample is imagined. A weekday starts with coffee, followed by work at a computer. At lunchtime there is usually time for a walk or an errand.\n\nIn the evening I might cook, read or work on a small personal project. Sometimes a project takes longer than expected, and the rest of the evening is spent trying to work out one small detail.',
   '## When the weekend comes\n\nThis is also an imagined sample answer. An ideal Saturday starts with a slow breakfast. If the weather is good, I go outside before deciding what to do next.\n\nThe afternoon might involve making something, meeting a friend or cooking a meal that takes a little more time than usual. It is nice to leave some of the day unplanned.',
   '## Still to come\n\nI would like to return to the beaches in Seabrook and see what I recognise.'
  ].join('\n\n'),model:'Design preview',generatedAt:new Date().toISOString()};
  // An illustrative image, never presented as a personal childhood photograph.
  const anchor=state.entries.findIndex(entry=>entryBinding(entry).day===11);
  state.entries.splice(anchor,0,{type:'photo',filePath:'media/seabrook-sample.jpg',description:'The beaches in Seabrook by the sea, where I lived for three years.',caption:'Seabrook. Illustrative photograph by Mike Coates (CC0), not a family photo.'});
  media['media/seabrook-sample.jpg']='data:image/jpeg;base64,'+photo;
  keepsakeRevealed=true;story();
 },photo);
 await page.locator('#revealGenerate').click();
 const promise=page.waitForEvent('download');await page.locator('#generationPrint').click();
 const download=await promise;const output=new URL('../../output/pdf/dear-december-a5-export.pdf',import.meta.url);
 await mkdir(new URL('.',output),{recursive:true});await download.saveAs(output.pathname);console.log(output.pathname);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
