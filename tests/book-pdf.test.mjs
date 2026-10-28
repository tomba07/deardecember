import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {jsPDF} from 'jspdf';
import {composeBook} from '../src/book-layout.js';
let browser,server,url;
before(async()=>{
 const root=new URL('../src/',import.meta.url);
 server=createServer(async(req,res)=>{try{
  const path=new URL(req.url,'http://localhost').pathname,file=new URL(path==='/'?'index.html':'.'+path,root);if(!file.href.startsWith(root.href))throw Error();
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader('Content-Type',file.pathname.endsWith('.js')?'text/javascript':file.pathname.endsWith('.css')?'text/css':file.pathname.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404).end()}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${server.address().port}`;browser=await chromium.launch();
});
after(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve))});
async function page(){const context=await browser.newContext({reducedMotion:'reduce'});const p=await context.newPage();p.errors=[];p.on('pageerror',e=>p.errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>typeof window.refreshSavedGeneration==='function');await p.evaluate(()=>dismissIntro());return p}

test('A5 composition paginates long chapters without clipping or forced pages per paragraph',async()=>{
 const pdf=new jsPDF({unit:'mm',format:[148,210],compress:true,putOnlyUsedFonts:true});
 for(const [style,file]of [['normal','SourceSerif4-Regular.ttf'],['italic','SourceSerif4-It.ttf']]){pdf.addFileToVFS(file,(await readFile(new URL('../src/fonts/'+file,import.meta.url))).toString('base64'));pdf.addFont(file,'Book',style)}
 const drawn=[],text=pdf.text.bind(pdf);pdf.text=(value,x,y,options)=>{drawn.push({value,x,y,width:pdf.getTextWidth(value),page:pdf.getCurrentPageInfo().pageNumber});return text(value,x,y,options)};
 composeBook(pdf,{name:'Änne Oakridge',sample:true,facts:['Born in Brookfield.'],sections:[{title:'An ordinary day',blocks:Array.from({length:30},()=>({text:'The morning starts with coffee and a walk through familiar streets. After that, there is time for a project or a book.'})),photos:[]},{title:'A short memory',blocks:[{text:'I remember the beach.'}],photos:[]}]});
 assert.equal(pdf.internal.pageSize.getWidth(),148);assert.equal(pdf.internal.pageSize.getHeight(),210);
 assert(drawn.some(line=>line.value==='SAMPLE EDITION'&&line.page===1));
 assert(pdf.getNumberOfPages()>5);assert(pdf.getNumberOfPages()<20);
 for(const line of drawn){assert(line.y<=198&&line.y>0);if(line.value.match(/^\d+$/))continue;assert(line.x>=18);assert(line.x+line.width<=131.1,`Clipped line: ${line.value}`)}
});

test('browser PDF retains headings and captions, matches contextual photos, and downloads without printing or uploads',async()=>{
 const p=await page();try{
  const requests=[];p.on('request',r=>requests.push({url:r.url(),method:r.method()}));
  await p.evaluate(()=>{
   document.getElementById('preview').checked=true;
   state.profile={name:'Alex Morgan',dateOfBirth:'1988-04-12',placeOfBirth:'Brookfield',placesLived:'Seabrook · 1991–1994\nOakridge · from 1994'};
   for(let day=0;day<23;day++)addTextEntry('A small memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});
   const canvas=document.createElement('canvas');canvas.width=100;canvas.height=60;const context=canvas.getContext('2d');context.fillStyle='#b3b1a8';context.fillRect(0,0,100,60);
   state.entries.push({type:'photo',filePath:'media/beach.png',caption:'Seabrook beach',description:'The Seabrook beaches by the sea, photographed on a visit.'});media['media/beach.png']=canvas.toDataURL();
   generatedDraft={markdown:'## Seabrook\n\nI remember the beaches in Seabrook. We lived there from 1991 to 1994.\n\n## Oakridge\n\nI remember sledding on the hill in Oakridge.',model:'Test',generatedAt:new Date().toISOString()};keepsakeRevealed=true;story();window.print=()=>{throw Error('Browser print should not be called')};
  });
  const placement=await p.evaluate(async()=>{const {bookSections,photoSection}=await import('./book-pdf.js');const sections=bookSections(generatedDraft.markdown);return {title:photoSection(state.entries.at(-1),state.entries,sections)?.title,sections:sections.length}});
  assert.deepEqual(placement,{title:'Seabrook',sections:2});
  await p.locator('#revealGenerate').click();const download=p.waitForEvent('download');await p.locator('#generationPrint').click();const result=await download;
  assert.equal(result.suggestedFilename(),'my-mini-biography.pdf');const bytes=await readFile(await result.path());assert(bytes.subarray(0,5).toString()==='%PDF-');assert(bytes.length>30000);
  assert.equal(await p.locator('#miniographyDialog').isVisible(),true);assert.equal(await p.locator('#generationPrint').isEnabled(),true);
  assert(!requests.some(r=>r.method!=='GET'));assert(requests.every(r=>r.url.startsWith(url)));
  assert(!bytes.includes(Buffer.from('localhost')));assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('PDF preserves hard breaks, avoids guessing photo matches and reports unreadable photos',async()=>{
 const p=await page();try{
  const result=await p.evaluate(async()=>{
   const {bookSections,photoSection,createBookPdf}=await import('./book-pdf.js');
   const sections=bookSections('## Places\n\nFirst line  \nSecond line\n\n## Days\n\nSome other text.');
   let error='';try{await createBookPdf({markdown:'## A memory\n\nA short paragraph.',collection:{language:'de',profile:{},entries:[{type:'photo',filePath:'media/missing.jpg'}]},media:{}})}catch(e){error=e.message}
   return {text:sections[0].blocks[0].text,match:photoSection({description:'Unrelated photograph'},[],sections),error};
  });
  assert.equal(result.text,'First line\nSecond line');assert.equal(result.match,null);assert(result.error.includes('photo is missing'));
 }finally{await p.context().close()}
});


test('biography reminder appears after door 24, survives hiding, and remains available through the door',async()=>{
 const p=await page();try{
  assert.equal(await p.locator('#biographyCard').isVisible(),false);
  await p.evaluate(()=>{document.getElementById('preview').checked=true;for(let day=0;day<23;day++)addTextEntry('A short memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});save()});
  assert.equal(await p.locator('#biographyCard').isVisible(),false);
  await p.evaluate(()=>openDoor(23));await p.locator('#revealDialog .close').click();
  assert.equal(await p.locator('#biographyCard').isVisible(),true);
  assert.equal(await p.locator('#biographyCardPdf').isVisible(),false);
  await p.locator('#biographyCardOpen').click();assert.equal(await p.locator('#biographyDetailsDialog').isVisible(),true);
  await p.locator('#biographyDetailsBack').click();assert.equal(await p.locator('dialog[open]').count(),0);
  await p.locator('#biographyCardHide').click();assert.equal(await p.locator('#biographyCard').isVisible(),false);
  await p.reload();await p.waitForFunction(()=>typeof window.refreshBiographyCard==='function');
  assert.equal(await p.locator('#biographyCard').isVisible(),false);
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(DOCUMENT_KEY)).biographyCardHidden),true);
  await p.evaluate(()=>{document.getElementById('preview').checked=true;openDoor(23)});assert.equal(await p.locator('#revealGenerate').isEnabled(),true);
  await p.locator('#revealGenerate').click();assert.equal(await p.locator('#biographyDetailsDialog').isVisible(),true);
  await p.locator('#biographyDetailsBack').click();assert.equal(await p.locator('#revealDialog').isVisible(),true);
 }finally{await p.context().close()}
});

test('saved biography reminder downloads a PDF directly and simulation does not overwrite its hide preference',async()=>{
 const p=await page();try{
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(()=>{document.getElementById('preview').checked=true;for(let day=0;day<23;day++)addTextEntry('A memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});generatedDraft={markdown:'## A small memory\n\nI remember the beach.',model:'Test',generatedAt:new Date().toISOString()};keepsakeRevealed=true;save();window.refreshSavedGeneration()});
  assert.equal(await p.locator('#biographyCardOpen').textContent(),'Open & edit');
  const download=p.waitForEvent('download');await p.locator('#biographyCardPdf').click();assert.equal((await download).suggestedFilename(),'my-mini-biography.pdf');
  assert.equal(await p.locator('dialog[open]').count(),0);
  await p.locator('#biographyCardOpen').click();assert.equal(await p.locator('#miniographyDialog').isVisible(),true);
  await p.locator('#savedTextBack').click();assert.equal(await p.locator('dialog[open]').count(),0);
  const bounds=await p.locator('#biographyCard').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=390);
  await p.evaluate(()=>toggleLang());assert.equal(await p.locator('#biographyCardHide').textContent(),'Ausblenden');
  await p.locator('#biographyCardHide').click();
  await p.evaluate(()=>{startSimulation();endSimulation()});assert.equal(await p.evaluate(()=>biographyCardHidden),true);
  assert.equal(await p.locator('#biographyCard').isVisible(),false);
  assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});


test('sample journal includes an editable draft and downloads its PDF without any generation request',async()=>{
 const p=await page();try{
  let generationRequests=0;p.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/generate'))generationRequests++});
  await p.evaluate(()=>startSimulation());
  assert.equal(await p.evaluate(()=>generatedDraft.model),'Simulated sample draft');
  await p.evaluate(()=>openDoor(23));await p.locator('#revealGenerate').click();
  assert.equal(await p.locator('#miniographyDialog').isVisible(),true);
  assert.equal(await p.locator('#generationStale').isVisible(),false);
  assert((await p.locator('#generationMarkdown').inputValue()).includes('## Growing up'));
  const download=p.waitForEvent('download');await p.locator('#generationPrint').click();
  assert.equal((await download).suggestedFilename(),'my-mini-biography.pdf');assert.equal(generationRequests,0);
  await p.evaluate(()=>endSimulation());assert.equal(await p.evaluate(()=>generatedDraft),null);
  assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});
