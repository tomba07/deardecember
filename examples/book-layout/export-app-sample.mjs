// Reproduce the sample through the actual browser Download PDF button.
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
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
 const photo=(await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#eeede8"/><text x="600" y="420" text-anchor="middle" font-family="serif" font-size="48" fill="#73716b">Your photograph</text></svg>')).jpeg().toBuffer()).toString('base64');
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.waitForFunction(()=>typeof window.refreshSavedGeneration==='function');
 await page.evaluate(photo=>{
  dismissIntro();startSimulation();
  // A neutral, generated placeholder contains no personal photograph or location.
  const anchor=state.entries.findIndex(entry=>entryBinding(entry).day===12)+1;
  state.entries.splice(anchor,0,{type:'photo',filePath:'media/sample-placeholder.jpg',description:'Riverside canal, near the flat and the favourite walking route.',caption:'Illustrative placeholder, not a personal photograph.'});
  media['media/sample-placeholder.jpg']='data:image/jpeg;base64,'+photo;
  keepsakeRevealed=true;story();
 },photo);
 await page.locator('#revealGenerate').click();
 const promise=page.waitForEvent('download');await page.locator('#generationPrint').click();
 const download=await promise;const output=new URL('../../output/pdf/dear-december-a5-export.pdf',import.meta.url);
 await mkdir(new URL('.',output),{recursive:true});await download.saveAs(output.pathname);console.log(output.pathname);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
