import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
let server,browser,url;
before(async()=>{
 const root=new URL('../src/',import.meta.url);
 server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;const file=new URL(path==='/'?'index.html':'.'+path,root);if(!file.href.startsWith(root.href)){res.writeHead(403).end();return}const bytes=await readFile(file);res.setHeader('Content-Type',file.pathname.endsWith('.js')?'text/javascript':file.pathname.endsWith('.css')?'text/css':'text/html');res.end(bytes)}catch{res.writeHead(404).end()}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${server.address().port}`;browser=await chromium.launch();
});
after(async()=>{await browser?.close();await new Promise(resolve=>server?.close(resolve))});
async function page(){const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();page.errors=[];page.on('pageerror',error=>page.errors.push(error.message));await page.goto(url);await page.evaluate(()=>dismissIntro());await page.evaluate(()=>{state.profile={name:'Alex Morgan',dateOfBirth:'1988-04-12',placeOfBirth:'Brookfield, Germany'};document.getElementById('preview').checked=true;save()});return page}
async function answer(page,choice,text){await page.locator(`#questionChoices button[data-choice="${choice}"]`).click();await page.locator('#answer').fill(text);await page.evaluate(()=>commitAndSave())}
async function collection(page){return page.evaluate(()=>structuredClone(state))}
async function png(page){return Buffer.from(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=64;canvas.height=40;const c=canvas.getContext('2d');c.fillStyle='#294f3d';c.fillRect(0,0,64,40);return canvas.toDataURL().split(',')[1]}),'base64')}

test('canonical entries, one edit date per commit, reload, profile and original prompt snapshots',async()=>{
 const p=await page();try{
  const birthdays=await p.evaluate(()=>{const original=state.profile.dateOfBirth;const results=['2015-01-01','2015-02-30','2999-01-01'].map(date=>{state.profile.dateOfBirth=date;return validBirthday()});state.profile.dateOfBirth=original;return results});assert.deepEqual(birthdays,[true,false,false]);
  await p.evaluate(()=>openDoor(2));assert.equal(await p.locator('#answer').isVisible(),false);
  await answer(p,1,'A wooden train.');let doc=await collection(p);assert.equal(doc.entries.length,1);assert.equal(doc.entries[0].question,'Did you collect anything?');assert.deepEqual(doc.entries[0].modificationDates,[]);const created=doc.entries[0].createdAt;
  await p.locator('#answer').fill('A wooden train from my grandfather.');await p.locator('#answer').press('End');assert.equal((await collection(p)).entries[0].modificationDates.length,0);await p.getByRole('button',{name:'Save & close',exact:true}).click();doc=await collection(p);assert.equal(doc.entries[0].createdAt,created);assert.equal(doc.entries[0].modificationDates.length,1);assert(Date.parse(doc.entries[0].modificationDates[0])>Date.parse(created));
  await p.reload();doc=await collection(p);assert.equal(doc.entries[0].modificationDates.length,1);assert.equal(doc.entries[0].text,'A wooden train from my grandfather.');await p.evaluate(()=>{toggleLang();document.getElementById('preview').checked=true;openDoor(2)});assert((await p.locator('#question').textContent()).includes('Did you collect anything?'));assert.equal(await p.locator('#questionChoices button[data-choice="1"]').count(),0);assert.equal((await collection(p)).entries[0].question,'Did you collect anything?');assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('text/photo ZIP round trip preserves metadata, media bytes, profile and exact reading order',async()=>{
 const p=await page();try{
  await p.evaluate(()=>openDoor(2));await p.locator('#questionChoices button').nth(1).click();await p.locator('#answer').fill('A wooden train.');const original=await png(p);await p.locator('#photo').setInputFiles({name:'memory.png',mimeType:'image/png',buffer:original});await p.locator('.photo-card').waitFor();await p.locator('.photo-card textarea').nth(0).fill('My train on the carpet, around 1994.');await p.locator('.photo-card textarea').nth(1).fill('A favourite toy');await p.evaluate(()=>{commitAndSave();editor.close();openDoor(3)});await answer(p,2,'I collected stones.');
  const snapshot=await collection(p);assert.deepEqual(snapshot.entries.map(e=>e.type),['text','photo','text']);
  const roundtrip=await p.evaluate(async()=>{commitAndSave();const original=JSON.stringify(state);const blob=await createArchive(state,media);const incoming=await readArchive(await blob.arrayBuffer());const zip=await JSZip.loadAsync(await blob.arrayBuffer());const photo=state.entries.find(e=>e.type==='photo');return {before:JSON.parse(original),after:incoming.collection,bytes:[...await zip.file(photo.filePath).async('uint8array')],paths:Object.keys(zip.files),mediaMatches:incoming.media[photo.filePath]===media[photo.filePath]}});
  assert.deepEqual(roundtrip.after,roundtrip.before);assert.deepEqual(Buffer.from(roundtrip.bytes),original);assert(roundtrip.mediaMatches);assert(roundtrip.paths.includes('miniography.json'));assert(!JSON.stringify(roundtrip.after).includes('data:image'));
  await p.evaluate(()=>preparePrintStory());assert.equal(await p.locator('#printSheet figcaption').textContent(),'A favourite toy');const order=await p.locator('#printSheet').textContent();assert(order.indexOf('A wooden train.')<order.indexOf('A favourite toy'));assert(order.indexOf('A favourite toy')<order.indexOf('I collected stones.'));assert(!order.includes('My train on the carpet'));
  await p.evaluate(()=>{moveEntry(1,1);preparePrintStory()});const moved=await p.locator('#printSheet').textContent();assert(moved.indexOf('I collected stones.')<moved.indexOf('A favourite toy'));assert.deepEqual((await collection(p)).entries[2].modificationDates,roundtrip.after.entries[1].modificationDates);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('actual export/import UI preserves the collection and allows repeated arbitrary journal entries',async()=>{
 const p=await page();try{
  await p.evaluate(()=>{addTextEntry('A journal reflection.',{question:null,topic:'A personal topic'});addTextEntry('Another reflection.',{question:null,topic:'A personal topic'});commitAndSave();state.language='en-GB'});const before=await collection(p);
  const downloaded=p.waitForEvent('download');await p.evaluate(()=>exportArchive());const exported=await downloaded;assert.equal(exported.suggestedFilename(),'my-journal.deardecember');const file=await exported.path();p.once('dialog',dialog=>dialog.accept());await p.locator('#importFile').setInputFiles(file);await p.waitForFunction(()=>document.getElementById('toast').textContent==='Your collection has been imported.');assert.deepEqual(await collection(p),before);
  await p.evaluate(()=>showAbout());await p.locator('#aboutDialog .entry-management summary').click();await p.getByRole('button',{name:'Edit entry 2',exact:true}).click();await p.locator('#entryText').fill('An edited second reflection.');await p.locator('#entryDialog .primary').click();assert.equal((await collection(p)).entries[1].text,'An edited second reflection.');assert.equal((await collection(p)).entries[1].modificationDates.length,1);assert.equal((await collection(p)).entries[0].text,'A journal reflection.');assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('invalid manifests, missing media, invalid images and chronology are rejected without replacement',async()=>{
 const p=await page();try{
  const failures=await p.evaluate(async()=>{
   addTextEntry('Keep this memory.',{question:null});commitAndSave();const before=JSON.stringify(state),results=[];
   for(const kind of ['version','unknown','missing','image','chronology','date']){
    const doc=structuredClone(state),zip=new JSZip();
    if(kind==='version')doc.formatVersion=2;
    if(kind==='unknown')doc.entries[0].answer='typo';
    if(kind==='chronology')doc.entries[0].modificationDates=['2000-01-01T00:00:00Z'];
    if(kind==='date')doc.profile.dateOfBirth='1988-02-30';
    if(kind==='missing'||kind==='image'){doc.entries.push({type:'photo',description:'',filePath:'media/photo.png',createdAt:new Date().toISOString(),modificationDates:[]});if(kind==='image')zip.file('media/photo.png','not a PNG')}
    zip.file('miniography.json',JSON.stringify(doc));try{await readArchive(await zip.generateAsync({type:'arraybuffer'}));results.push({kind,rejected:false})}catch(error){results.push({kind,rejected:true,message:error.message})}
   }
   return {results,unchanged:before===JSON.stringify(state)};
  });for(const result of failures.results)assert(result.rejected,JSON.stringify(result));assert(failures.unchanged);
  const snapshot=await collection(p);await p.locator('#importFile').setInputFiles({name:'bad.miniography',mimeType:'application/zip',buffer:Buffer.from('not a ZIP')});await p.waitForFunction(()=>document.getElementById('toast').textContent.startsWith('Import failed:'));assert.deepEqual(await collection(p),snapshot);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('ZIP paths, duplicate manifests, symlinks, integrity and expansion limits are checked before import',async()=>{
 const p=await page();try{
  const results=await p.evaluate(async()=>{
   const results=[];
   for(const kind of ['traversal','duplicate','symlink','integrity','limit','truncated']){
    const zip=new JSZip();zip.file('miniography.json',JSON.stringify(state));
    if(kind==='traversal')zip.file('../outside.png','x');
    if(kind==='duplicate')zip.file('xxxxxxxxxxx.json','x');
    if(kind==='symlink')zip.file('media/link.png','x',{unixPermissions:0xa1ff});
    let bytes=new Uint8Array(await zip.generateAsync({type:'uint8array',platform:'UNIX'}));let view=new DataView(bytes.buffer);
    if(kind==='duplicate'){
     const source=new TextEncoder().encode('xxxxxxxxxxx.json'),target=new TextEncoder().encode('miniography.json');
     for(let i=0;i<=bytes.length-source.length;i++)if(source.every((value,index)=>bytes[i+index]===value))bytes.set(target,i);
    }
    if(kind==='integrity')bytes[30+'miniography.json'.length]^=1;
    if(kind==='limit')for(let i=0;i<bytes.length-46;i++)if(view.getUint32(i,true)===0x02014b50){view.setUint32(i+24,30000000,true);break}
    if(kind==='truncated')bytes=bytes.subarray(0,bytes.length-5);
    try{await readArchive(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));results.push({kind,rejected:false})}catch(error){results.push({kind,rejected:true,message:error.message})}
   }
   return results;
  });for(const result of results)assert(result.rejected,JSON.stringify(result));assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('storage failure during import preserves the active collection and persisted data',async()=>{
 const p=await page();try{
  const original=await collection(p);const saved=await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY));
  const bytes=await p.evaluate(async()=>{const other=structuredClone(state);other.profile.name='Incoming person';const zip=new JSZip();zip.file('miniography.json',JSON.stringify(other));return [...await zip.generateAsync({type:'uint8array'})]});
  await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError')}});p.once('dialog',dialog=>dialog.accept());await p.locator('#importFile').setInputFiles({name:'valid.miniography',mimeType:'application/zip',buffer:Buffer.from(bytes)});await p.waitForFunction(()=>document.getElementById('toast').textContent.startsWith('Import failed:'));assert.deepEqual(await collection(p),original);assert.equal(await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY)),saved);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('simulation does not replace saved data and its archive is marked as sample content',async()=>{
 const p=await page();try{
  const saved=await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY));await p.evaluate(()=>startSimulation());assert.equal((await collection(p)).isSample,true);assert.equal((await collection(p)).entries.length,69);await p.evaluate(async()=>{const blob=await createArchive(state,media);const incoming=await readArchive(await blob.arrayBuffer());if(!incoming.collection.isSample)throw Error('Missing sample marker')});assert.equal(await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY)),saved);await p.evaluate(()=>endSimulation());assert.equal((await collection(p)).entries.length,0);assert.equal(await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY)),saved);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('ZIP backup and import restore unfinished entries, image files and generated text',async()=>{
 const p=await page();try{
 await p.evaluate(()=>{state.profile={name:'',dateOfBirth:'',placeOfBirth:''};openDoor(2)});
 await answer(p,1,'My wooden train.');const image=await png(p);
 await p.locator('#photo').setInputFiles({name:'train.png',mimeType:'image/png',buffer:image});await p.locator('.photo-card').waitFor();
 await p.locator('.photo-card textarea').nth(0).fill('The train on the carpet.');
 await p.locator('.photo-card textarea').nth(1).fill('My train');
 await p.evaluate(()=>{generatedDraft={markdown:'## Childhood\n\nMy wooden train.',model:'External AI'};commitAndSave()});
 const original=await collection(p);const download=p.waitForEvent('download');await p.evaluate(()=>exportDraftBackup());const file=await download;
 assert.equal(file.suggestedFilename(),'dear-december-backup.zip');const bytes=await readFile(await file.path());
 const contents=await p.evaluate(async bytes=>{const zip=await JSZip.loadAsync(new Uint8Array(bytes));const document=JSON.parse(await zip.file('draft-backup.json').async('string'));return {document,image:[...await zip.file(document.collection.entries.find(e=>e.filePath).filePath).async('uint8array')]}},[...bytes]);
 assert.deepEqual(Buffer.from(contents.image),image);assert.equal(contents.document.media,undefined);assert(contents.document.generatedDraft.markdown.includes('My wooden train.'));
 await p.evaluate(()=>{editor.close();state=emptyCollection();media={};generatedDraft=null;save()});
 p.once('dialog',dialog=>dialog.accept());await p.locator('#importFile').setInputFiles({name:file.suggestedFilename(),mimeType:'application/zip',buffer:bytes});
 await p.waitForFunction(()=>document.getElementById('toast').textContent==='Your collection has been imported.');
 assert.deepEqual(await collection(p),original);assert.equal(await p.evaluate(()=>generatedDraft.markdown),contents.document.generatedDraft.markdown);
 const restored=await p.evaluate(()=>Object.values(media)[0]);assert.deepEqual(Buffer.from(restored.split(',')[1],'base64'),image);
 await p.evaluate(()=>{document.getElementById('preview').checked=true;openDoor(2)});assert.equal(await p.locator('.photo-card img').count(),1);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('unfinished draft recovery restores entries without inventing profile facts',async()=>{
 const p=await page();try{
  await p.evaluate(()=>{state.profile={name:'',dateOfBirth:'',placeOfBirth:'',placesLived:'Seabrook, then Oakridge'};addTextEntry('An unfinished journal draft.',{question:null});commitAndSave()});const original=await collection(p);
  const download=p.waitForEvent('download');await p.evaluate(()=>exportDraftBackup());const file=await(await download).path();p.once('dialog',dialog=>dialog.accept());await p.locator('#importFile').setInputFiles({name:'dear-december-backup.zip',mimeType:'application/zip',buffer:await readFile(file)});await p.waitForFunction(()=>document.getElementById('toast').textContent==='Your collection has been imported.');assert.deepEqual(await collection(p),original);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('repeated prompt entries and shared image originals remain separate in exact array order',async()=>{
 const p=await page();try{
  const data=(await png(p)).toString('base64');const result=await p.evaluate(async data=>{
   const date='2026-10-22T18:30:00Z';const text={type:'text',topic:themes[2],question:questionChoices.en[2][0],text:'First answer.',createdAt:date,modificationDates:[]};const photo={type:'photo',description:'Context',filePath:'media/shared.png',createdAt:date,modificationDates:[]};
   state.entries=[photo,text,{...photo,caption:'Beside the first answer'},{...text,text:'Second answer.'}];media['media/shared.png']='data:image/png;base64,'+data;
   const blob=await createArchive(state,media),incoming=await readArchive(await blob.arrayBuffer());state=incoming.collection;media=incoming.media;inferBindings();
   const first=entryForChoice(2,1),second=dayEntries(2).find(entry=>entry!==first);updateEntry(second,{text:'Edited second answer.'});commitEdits();
   return {first:first.text,second:second.text,secondEditCount:second.modificationDates.length,types:state.entries.map(entry=>entry.type),imageCount:Object.keys(media).length};
  },data);assert.equal(result.first,'First answer.');assert.equal(result.second,'Edited second answer.');assert.equal(result.secondEditCount,1);assert.deepEqual(result.types,['photo','text','photo','text']);assert.equal(result.imageCount,1);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('welcome leads with reflection and reserves the keepsake reveal for the final door',async()=>{
 const p=await page();try{
  assert((await p.locator('#welcomeIntro').textContent()).includes('reflect'));assert((await p.locator('#welcomePurpose').textContent()).includes('generations'));assert.equal(await p.locator('.welcome-example,.welcome-guide').count(),0);
  assert(!(await p.locator('body').innerText()).includes('PDF'));assert(!(await p.locator('body').innerText()).includes('beautiful book'));
  assert.equal(await p.locator('#journalNav').isVisible(),false);assert.equal(await p.locator('#miniographyReturn').isVisible(),false);assert.equal(await p.locator('#printButton').isVisible(),false);
  await p.evaluate(()=>startSimulation());assert.equal(await p.locator('#printButton').isVisible(),false);await p.evaluate(()=>{document.getElementById('revealDialog').close();for(let day=0;day<23;day++)if(!doorComplete(day))addTextEntry('A small everyday memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});openDoor(23)});await p.locator('#printButton').waitFor();assert.equal(await p.locator('#printButton').isVisible(),true);assert((await p.locator('#revealGenerateTitle').textContent()).includes('mini biography'));assert.equal(await p.locator('#storyDialog').count(),0);
  await p.evaluate(()=>endSimulation());assert.equal(await p.evaluate(()=>keepsakeRevealed),false);await p.evaluate(()=>{for(let day=0;day<23;day++)if(!doorComplete(day))addTextEntry('A small everyday memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});openDoor(23)});await p.locator('#printButton').waitFor();assert.equal(await p.locator('#printButton').isVisible(),true);await p.reload();await p.evaluate(()=>story());await p.locator('#printButton').waitFor();assert.equal(await p.locator('#printButton').isVisible(),true);
  await p.evaluate(()=>{document.getElementById('revealDialog').close();toggleLang()});assert((await p.locator('#welcomeIntro').textContent()).includes('nachzudenken'));assert((await p.locator('#intro').textContent()).includes('Adventskalender'));assert.equal(await p.locator('#journalNav').count(),0);await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('the unlock-all control is localhost-only and cannot unlock the hosted calendar',async()=>{
 const context=await browser.newContext({reducedMotion:'reduce'});const p=await context.newPage();try{
  await p.clock.install({time:new Date('2026-10-22T12:00:00Z')});
  await context.route('https://dear-december.test/**',async route=>{const response=await route.fetch({url:url+new URL(route.request().url()).pathname});await route.fulfill({response})});
  await p.goto('https://dear-december.test/');await p.evaluate(()=>dismissIntro());assert.equal(await p.locator('#devPreview').isVisible(),false);assert(!(await p.locator('body').innerText()).includes('Not December?'));
  assert.equal(await p.evaluate(()=>{document.getElementById('preview').checked=true;return unlocked(0)}),false);
  assert.equal(await p.locator('#devSample').isVisible(),false);assert.equal(await p.locator('#devReset').isVisible(),false);await p.evaluate(()=>{localStorage.setItem('reset-test','keep');resetDevelopmentData()});assert.equal(await p.evaluate(()=>localStorage.getItem('reset-test')),'keep');await p.evaluate(()=>startSimulation());assert.equal(await p.evaluate(()=>isSimulation),false);assert.equal(await p.evaluate(()=>unlocked(23)),false);
 }finally{await context.close()}
});

test('hosted users get the miniography reveal on December 24, not an early journal preview',async()=>{
 const context=await browser.newContext({timezoneId:'UTC',reducedMotion:'reduce'});const p=await context.newPage();try{
  await p.clock.install({time:new Date('2026-12-23T12:00:00Z')});await context.route('https://dear-december.test/**',async route=>{await route.fulfill({response:await route.fetch({url:url+new URL(route.request().url()).pathname})})});await p.goto('https://dear-december.test/');await p.evaluate(()=>dismissIntro());
  await p.evaluate(()=>{state.profile={name:'Alex',dateOfBirth:'1988-04-12',placeOfBirth:'Brookfield'};addTextEntry('Riding my bike after school.',{topic:themes[2],question:questions[2],binding:{day:2,choice:0}});commitAndSave()});
  assert.equal(await p.locator('#journalNav').isVisible(),false);assert.equal(await p.locator('#miniographyReturn').isVisible(),false);await p.evaluate(()=>{story();story(true);for(let day=0;day<23;day++)if(!doorComplete(day))addTextEntry('A small everyday memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});openDoor(23)});assert.equal(await p.locator('#storyDialog').isVisible(),false);assert.equal(await p.locator('#revealDialog').isVisible(),false);assert.equal(await p.evaluate(()=>keepsakeRevealed),false);
  await p.clock.setSystemTime(new Date('2026-12-24T00:00:01Z'));await p.evaluate(()=>render());await p.getByRole('button',{name:'Door 24',exact:true}).click();assert.equal(await p.locator('#revealDialog').isVisible(),true);assert.equal(await p.locator('#storyDialog').isVisible(),false);assert.equal(await p.locator('#revealName').textContent(),'Alex');await p.setViewportSize({width:390,height:844});const box=await p.locator('#revealDialog').boundingBox();assert(box.x>=0&&box.x+box.width<=390);await p.locator('#printButton').waitFor();assert.equal(await p.locator('#printButton').isVisible(),true);assert.equal(await p.locator('#biography').count(),0);
  await p.reload();assert.equal(await p.locator('#journalNav').count(),0);assert.equal(await p.locator('#miniographyReturn').count(),0);await p.locator('#grid .door').nth(23).click();assert.equal(await p.locator('#revealDialog').isVisible(),true);await p.locator('#printButton').waitFor();assert.equal(await p.locator('#printButton').isVisible(),true);
  await p.clock.setSystemTime(new Date('2027-01-15T12:00:00Z'));assert.equal(await p.evaluate(()=>unlocked(23)),true);
 }finally{await context.close()}
});

test('first visit intro explains local files, supports skip/close/Escape and can be reopened',async()=>{
 const context=await browser.newContext({reducedMotion:'reduce'});const p=await context.newPage();try{
  await p.goto(url);assert.equal(await p.title(),'Dear December — A little time for you');assert(!/miniography/i.test(await p.locator('body').innerText()));assert.equal(await p.locator('#introDialog').isVisible(),true);assert((await p.locator('#introTransfer').textContent()).includes('journal file'));assert((await p.locator('#introStorage').textContent()).includes('this browser'));assert(!(await p.locator('#introDialog').innerText()).includes('PDF'));
  await p.locator('#introLanguage').click();assert((await p.locator('#introStorage').textContent()).includes('diesem Browser'));await p.locator('#introStart').click();assert.equal(await p.locator('#introDialog').isVisible(),false);await p.reload();assert.equal(await p.locator('#introDialog').isVisible(),false);
  await p.locator('#aboutNav').click();assert.equal(await p.locator('#aboutDialog').isVisible(),true);await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.getElementById('aboutDialog').open);await p.reload();assert.equal(await p.locator('#introDialog').isVisible(),false);
  await p.evaluate(()=>showIntro());await p.locator('#introDialog .close').click();assert.equal(await p.locator('#introDialog').isVisible(),false);await p.evaluate(()=>showIntro());await p.locator('#introStart').click();assert.equal(await p.locator('#introDialog').isVisible(),false);
  await p.setViewportSize({width:390,height:844});await p.locator('#aboutNav').click();const box=await p.locator('#aboutDialog').boundingBox();assert(box.x>=0&&box.x+box.width<=390);
 }finally{await context.close()}
});

test('unopened doors conceal topic names until clicked, including accessible labels',async()=>{
 const p=await page();try{
  assert.equal(await p.locator('#grid small').allTextContents().then(labels=>labels.every(label=>label==='')),true);assert.equal(await p.locator('#grid button').last().getAttribute('aria-label'),'Door 24');
  await p.getByRole('button',{name:'Door 3',exact:true}).click();assert.equal(await p.locator('#title').textContent(),'Childhood treasures');await p.locator('#saveClose').click();assert.equal(await p.locator('#grid small').nth(2).textContent(),'Childhood treasures');assert.equal(await p.locator('#grid small').nth(1).textContent(),'');await p.reload();assert.equal(await p.locator('#grid small').nth(2).textContent(),'Childhood treasures');assert.equal(await p.locator('#grid button').last().getAttribute('aria-label'),'Door 24');assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('basic facts belong to door one, save normally and do not block other doors',async()=>{
 const context=await browser.newContext({reducedMotion:'reduce'});const p=await context.newPage();try{
  await p.goto(url);await p.evaluate(()=>{dismissIntro();document.getElementById('preview').checked=true;openDoor(2)});await p.locator('#questionChoices').waitFor();assert.equal(await p.locator('#questionChoices').isVisible(),true);assert.equal(await p.locator('#calendarFacts').isVisible(),false);assert.equal(await p.locator('#profileDialog').count(),0);assert.equal(await p.getByRole('button',{name:'Your profile',exact:true}).count(),0);
  await answer(p,1,'A toy train.');await p.locator('#saveClose').click();await p.getByRole('button',{name:'Door 1',exact:true}).click();await p.locator('#calendarFacts').waitFor();assert.equal(await p.locator('#calendarFacts').isVisible(),true);await p.locator('#name').fill('Example Person');await p.locator('#birthday').fill('2015-04-12');await p.locator('#birthplace').fill('Example town');await p.locator('#residences').fill('A few different towns');await p.locator('#saveClose').click();await p.reload();await p.evaluate(()=>{document.getElementById('preview').checked=true;openDoor(0)});assert.equal(await p.locator('#name').inputValue(),'Example Person');assert.equal(await p.locator('#birthday').inputValue(),'2015-04-12');assert.equal(await p.locator('#residences').inputValue(),'A few different towns');assert.equal(await p.evaluate(()=>factsComplete()),true);assert.equal(await p.locator('#count').textContent(),'2 of 23 memories collected');assert.equal(await p.evaluate(()=>state.entries[0].text),'A toy train.');
 }finally{await context.close()}
});

test('main action counts down to Advent, unlocks at midnight and returns to the current door',async()=>{
 const context=await browser.newContext({timezoneId:'UTC',reducedMotion:'reduce'});const p=await context.newPage();try{
  await p.clock.install({time:new Date('2026-11-30T23:59:58Z')});await p.goto(url);await p.evaluate(()=>dismissIntro());assert.equal(await p.locator('#begin').isDisabled(),true);assert.equal(await p.locator('#doorCountdown').isVisible(),true);assert((await p.locator('#doorCountdown').textContent()).includes('02s'));
  await p.clock.runFor(2000);assert.equal(await p.locator('#begin').isEnabled(),true);assert.equal(await p.locator('#doorCountdown').isVisible(),false);await p.locator('#begin').click();assert.equal(await p.evaluate(()=>current),0);await p.locator('#name').fill('Example Person');await p.locator('#birthday').fill('1990-04-12');await p.locator('#birthplace').fill('Example town');await p.locator('#saveClose').click();
  await p.clock.setSystemTime(new Date('2026-12-05T12:00:00Z'));await p.evaluate(()=>render());assert((await p.locator('#begin').textContent()).includes('5'));await p.locator('#begin').click();assert.equal(await p.evaluate(()=>current),4);await p.locator('#saveClose').click();await p.reload();await p.locator('#begin').click();assert.equal(await p.evaluate(()=>current),4);await p.locator('#saveClose').click();
  await p.evaluate(()=>{for(let day=0;day<23;day++)if(!doorComplete(day))addTextEntry('A small memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});save()});await p.clock.setSystemTime(new Date('2026-12-23T23:59:59Z'));await p.evaluate(()=>render());await p.clock.runFor(2000);assert((await p.locator('#begin').textContent()).includes('24'));assert.equal(await p.evaluate(()=>suggestedDoor()),23);await p.evaluate(()=>toggleLang());assert((await p.locator('#begin').textContent()).includes('heutige Türchen'));await p.locator('#begin').click();assert.equal(await p.locator('#revealDialog').isVisible(),true);
 }finally{await context.close()}
});

test('the homepage stays focused on the calendar while About retains purpose and storage guidance',async()=>{
 const p=await page();try{
  assert.equal(await p.locator('main .welcome').count(),0);assert.equal(await p.locator('#welcomeTitle').isVisible(),false);assert.equal(await p.locator('#calendar').isVisible(),true);await p.locator('#aboutNav').click();assert.equal(await p.locator('#welcomeTitle').isVisible(),true);assert.equal(await p.locator('#welcomePrivacy').isVisible(),true);await p.locator('#storageTitle').click();assert.equal(await p.locator('#storageText').isVisible(),true);assert.equal(await p.locator('#downloadJournal').isVisible(),true);await p.locator('#aboutDialog .close').click();assert.equal(await p.locator('#aboutDialog').isVisible(),false);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

 test('German birthdays use day/month/year independent of the browser locale and preserve ISO archive dates',async()=>{
 const p=await page();try{
 await p.evaluate(()=>{toggleLang();openDoor(0)});assert.equal(await p.locator('#birthday').inputValue(),'12/04/1988');assert.equal(await p.locator('#birthday').getAttribute('placeholder'),'TT/MM/JJJJ');
 await p.locator('#birthday').fill('29/02/2000');await p.locator('#birthday').blur();assert.equal((await collection(p)).profile.dateOfBirth,'2000-02-29');assert.equal(await p.evaluate(()=>factsComplete()),true);
 await p.evaluate(()=>preparePrintStory());assert((await p.locator('#printSheet .print-subtitle').textContent()).includes('29/02/2000'));
 await p.evaluate(()=>openDoor(0));await p.locator('#birthday').fill('31/02/2000');assert.equal(await p.evaluate(()=>factsComplete()),false);assert((await p.locator('#factsError').textContent()).includes('gültiges'));
 await p.locator('#birthday').fill('5/4/1990');await p.locator('#birthday').blur();assert.equal(await p.locator('#birthday').inputValue(),'05/04/1990');await p.evaluate(()=>toggleLang());assert.equal(await p.locator('#birthday').inputValue(),'1990-04-05');await p.evaluate(()=>toggleLang());assert.equal(await p.locator('#birthday').inputValue(),'05/04/1990');assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
 });

test('each door keeps one editable reflection when revisited',async()=>{
 const p=await page();try{
 await p.evaluate(()=>openDoor(2));await answer(p,1,'A wooden train.');
 assert.equal(await p.locator('#questionPicker').isVisible(),false);
 assert.equal(await p.locator('#moreQuestions').count(),0);
 await p.locator('#saveClose').click();await p.reload();
 await p.evaluate(()=>{document.getElementById('preview').checked=true;openDoor(2)});
 assert.equal(await p.locator('#answer').inputValue(),'A wooden train.');
 assert.equal(await p.locator('#questionPicker').isVisible(),false);
 await p.locator('#answer').fill('A red wooden train.');await p.locator('#saveClose').click();
 assert.equal((await collection(p)).entries.length,1);
 assert.equal((await collection(p)).entries[0].text,'A red wooden train.');assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('calendar distinguishes locked, unopened, pending and completed without requiring every prompt',async()=>{
 const p=await page();try{
 await p.clock.install({time:new Date('2026-12-03T12:00:00Z')});await p.evaluate(()=>{document.getElementById('preview').checked=false;state.profile={name:'',dateOfBirth:'',placeOfBirth:'',placesLived:''};render()});
 const doors=p.locator('#grid .door');assert.equal(await doors.nth(0).getAttribute('data-status'),'unopened');assert.equal(await doors.nth(3).getAttribute('data-status'),'locked');assert.equal(await doors.nth(3).isDisabled(),true);
 await doors.nth(1).click();await p.locator('#saveClose').click();assert.equal(await doors.nth(1).getAttribute('data-status'),'pending');await doors.nth(1).click();await p.locator('#questionChoices button').first().click();await p.locator('#answer').fill('The kitchen window.');await p.locator('#saveClose').click();assert.equal(await doors.nth(1).getAttribute('data-status'),'completed');
 await doors.nth(0).click();await p.locator('#name').fill('Alex');await p.locator('#saveClose').click();assert.equal(await doors.nth(0).getAttribute('data-status'),'completed');await doors.nth(0).click();await p.locator('#birthday').fill('1990-04-05');await p.locator('#birthplace').fill('York');await p.locator('#saveClose').click();assert.equal(await doors.nth(0).getAttribute('data-status'),'completed');
 await p.reload();assert.equal(await doors.nth(1).getAttribute('data-status'),'completed');assert.equal(await doors.nth(2).getAttribute('data-status'),'unopened');await p.evaluate(()=>toggleLang());assert.equal(await doors.nth(3).locator('.door-status').textContent(),'Gesperrt');assert.equal(await doors.nth(1).getAttribute('aria-describedby'),'door-status-1');assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('saving partial first-door facts or just a memory marks it completed and survives reload',async()=>{
 const p=await page();try{
 await p.evaluate(()=>{state.profile={name:'',dateOfBirth:'',placeOfBirth:'',placesLived:''};openDoor(0)});await p.locator('#saveClose').click();assert.equal(await p.locator('#grid .door').first().getAttribute('data-status'),'pending');
 await p.evaluate(()=>openDoor(0));await p.locator('#name').fill('Alex');await p.locator('#saveClose').click();assert.equal(await p.locator('#grid .door').first().getAttribute('data-status'),'completed');assert.equal(await p.evaluate(()=>factsComplete()),false);
 await p.reload();await p.evaluate(()=>{document.getElementById('preview').checked=true;render()});assert.equal(await p.locator('#grid .door').first().getAttribute('data-status'),'completed');
 await p.evaluate(()=>openDoor(0));await p.locator('#name').fill('');await answer(p,0,'The view from our kitchen window.');await p.locator('#saveClose').click();assert.equal(await p.locator('#grid .door').first().getAttribute('data-status'),'completed');assert.equal(await p.locator('#grid .door').first().locator('.lock svg').count(),1);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('older multiple reflections remain stored and accessible in entry management',async()=>{
 const p=await page();try{
 await p.evaluate(()=>{openDoor(2);for(const choice of [1,2]){selectedQuestion=choice;writeQuestionAnswer(`Earlier memory ${choice}`)}commitAndSave();editor.close()});
 await p.reload();await p.evaluate(()=>{document.getElementById('preview').checked=true;openDoor(2)});
 assert.equal(await p.locator('#answer').inputValue(),'Earlier memory 1');
 assert.equal(await p.locator('#questionPicker').isVisible(),false);
 assert.equal((await collection(p)).entries.length,2);
 await p.locator('#answer').fill('Updated first memory');await p.locator('#saveClose').click();
 assert.equal((await collection(p)).entries[1].text,'Earlier memory 2');
 await p.evaluate(()=>{showAbout();renderCollectionEntries()});
 await p.locator('#aboutDialog details').filter({has:p.locator('#collectionEntries')}).evaluate(element=>element.open=true);
 await p.getByRole('button',{name:'Edit entry 2',exact:true}).click();
 assert.equal(await p.locator('#entryText').inputValue(),'Earlier memory 2');await p.locator('#entryText').fill('Edited earlier memory');await p.locator('#entryBack').click();assert.equal(await p.locator('#aboutDialog').isVisible(),true);assert.equal((await collection(p)).entries[1].text,'Edited earlier memory');assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('Christmas reveal adapts to late visits and offers a local backup even with unfinished facts',async()=>{
 const p=await page();try{
 await p.clock.install({time:new Date('2026-12-24T12:00:00Z')});await p.evaluate(()=>{state.profile={name:'Alex',dateOfBirth:'',placeOfBirth:'',placesLived:''};addTextEntry('Tea by the kitchen window.',{question:null});save();for(let day=0;day<23;day++)if(!doorComplete(day))addTextEntry('A small everyday memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});openDoor(23)});
 assert.equal(await p.locator('#grandTitle').textContent(),'Merry Christmas!');assert.equal(await p.locator('.reveal-options>section').count(),3);assert((await p.locator('#revealSaveTitle').textContent()).includes('Keep it safe'));assert.equal(await p.locator('#revealGenerate').isDisabled(),true);
 const event=p.waitForEvent('download');await p.locator('#revealDownload').click();const backup=await event;assert.equal(backup.suggestedFilename(),'dear-december-backup.zip');const bytes=await readFile(await backup.path());const data=await p.evaluate(async bytes=>JSON.parse(await(await JSZip.loadAsync(new Uint8Array(bytes))).file('draft-backup.json').async('string')),[...bytes]);assert.equal(data.collection.entries.find(entry=>entry.tags.includes('reflection')).text,'Tea by the kitchen window.');assert.equal(await p.locator('#revealDialog').isVisible(),true);
 for(const [date,text]of [['2026-12-26T12:00:00Z','Merry Christmas!'],['2026-12-29T12:00:00Z','A belated merry Christmas!'],['2027-01-03T12:00:00Z','A belated merry Christmas!'],['2027-03-01T12:00:00Z','A little Christmas warmth, whenever you arrive.']]){await p.clock.setSystemTime(new Date(date));await p.evaluate(()=>{document.getElementById('revealDialog').close();for(let day=0;day<23;day++)if(!doorComplete(day))addTextEntry('A small everyday memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});openDoor(23)});assert.equal(await p.locator('#grandTitle').textContent(),text)}
 await p.evaluate(()=>toggleLang());assert.equal(await p.locator('#grandTitle').textContent(),'Ein wenig Weihnachtswärme für dich.');assert((await p.locator('#revealFutureText').textContent()).includes('entscheidest du selbst'));await p.setViewportSize({width:390,height:844});const box=await p.locator('#revealDialog').boundingBox();assert(box.x>=0&&box.x+box.width<=390);assert.equal(await p.locator('#revealDialog').evaluate(element=>element.scrollWidth>element.clientWidth),false);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('every door introduces its topic and saving shows a fitting nonmodal message',async()=>{
 const p=await page();try{
 for(let day=0;day<23;day++){
  await p.evaluate(day=>openDoor(day),day);assert.equal(await p.locator('#title').textContent(),await p.evaluate(day=>themes[day],day));assert((await p.locator('#doorDescription').textContent()).length>25);assert.equal(await p.locator('#editor').evaluate(el=>el.classList.contains('door-opening')),true);await p.evaluate(()=>editor.close());
 }
 await p.evaluate(()=>openDoor(14));await p.locator('#questionChoices button').first().click();await p.locator('#answer').fill('Coffee by the window.');await p.locator('#saveClose').click();assert.equal(await p.locator('#doorMoment').isVisible(),true);assert((await p.locator('#doorMomentText').textContent()).includes('everyday joy'));assert.equal(await p.locator('dialog[open]').count(),0);
 await p.evaluate(()=>{toggleLang();openDoor(14)});assert((await p.locator('#doorDescription').textContent()).includes('Kaffee'));assert.equal(await p.locator('#doorMoment').isVisible(),false);await p.locator('#saveClose').click();assert((await p.locator('#doorMomentText').textContent()).includes('Alltagsfreude'));await p.locator('#doorMoment button').click();assert.equal(await p.locator('#doorMoment').isVisible(),false);
 await p.evaluate(()=>{for(let day=0;day<23;day++)if(!doorComplete(day))addTextEntry('A small everyday memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});openDoor(23);closeDoorReveal()});assert.equal(await p.locator('#doorMoment').isVisible(),true);assert((await p.locator('#doorMomentText').textContent()).includes('Weihnachtsmomente'));assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});
test('door effects respect reduced motion and do not celebrate failed saves',async()=>{
 const p=await page();try{
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>openDoor(2));assert.equal(await p.locator('.door-opening-overlay').count(),0);await p.locator('#saveClose').click();assert((await p.locator('#doorMomentText').textContent()).includes('pause counts'));
 await p.evaluate(()=>openDoor(2));await p.locator('#questionChoices button').first().click();await p.locator('#answer').fill('Building sandcastles.');await p.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('quota')}});await p.locator('#saveClose').click();assert.equal(await p.locator('#doorMoment').isVisible(),false);assert((await p.locator('#toast').textContent()).includes('storage is full'));assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('door content waits for the title reveal, including Christmas actions',async()=>{
 const p=await page();try{
 await p.emulateMedia({reducedMotion:'no-preference'});
 await p.evaluate(()=>{openDoor(2);for(const animation of editor.getAnimations({subtree:true})){animation.pause();animation.currentTime=300}});
 assert.equal(await p.locator('#questionPicker').evaluate(el=>el.inert),true);assert.equal(await p.locator('#editor .opening-title').textContent(),'Childhood treasures');assert.equal(await p.locator('#title').isVisible(),true);assert.equal(await p.locator('#doorDescription').isVisible(),true);assert.equal(await p.locator('#editor .actions').evaluate(el=>el.inert),true);
 await p.evaluate(()=>{for(const animation of editor.getAnimations({subtree:true}))animation.finish()});assert.equal(await p.locator('#editor .door-opening-overlay').count(),1);await p.locator('#editor .opening-continue').click();await p.waitForFunction(()=>!document.querySelector('#editor .door-opening-overlay'));await p.locator('#questionPicker').waitFor();assert.equal(await p.locator('#saveClose').isVisible(),true);await p.locator('#questionChoices button').first().click();await p.locator('#answer').waitFor();assert.equal(await p.locator('#editor').evaluate(el=>el.classList.contains('door-introducing')),false);
 await p.evaluate(()=>{editor.close();for(let day=0;day<23;day++)if(!doorComplete(day))addTextEntry('A small everyday memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});openDoor(23);for(const animation of document.getElementById('revealDialog').getAnimations({subtree:true})){animation.pause();animation.currentTime=300}});assert.equal(await p.locator('#grandTitle').isVisible(),true);assert.equal(await p.locator('#revealDialog .reveal-options').evaluate(el=>el.inert),true);
 await p.evaluate(()=>{for(const animation of document.getElementById('revealDialog').getAnimations({subtree:true}))animation.finish()});assert.equal(await p.locator('#revealDialog .door-opening-overlay').count(),1);await p.locator('#revealDialog .opening-continue').click();await p.waitForFunction(()=>!document.querySelector('#revealDialog .door-opening-overlay'));assert.equal(await p.locator('#revealDownload').isVisible(),true);
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>{document.getElementById('revealDialog').close();openDoor(2)});assert.equal(await p.locator('#questionResponse').isVisible(),true);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('frosted title overlay sweeps left to right and cleans up after closing or reduced-motion changes',async()=>{
 const p=await page();try{
 await p.emulateMedia({reducedMotion:'no-preference'});
 await p.evaluate(()=>{openDoor(14);for(const animation of editor.getAnimations({subtree:true})){animation.pause();animation.currentTime=350}});
 assert.equal(await p.locator('#editor .opening-title').textContent(),'Everyday joy');assert((await p.locator('#editor .door-opening-overlay').evaluate(el=>getComputedStyle(el).backdropFilter)).includes('blur'));const midway=await p.locator('#editor .opening-title').evaluate(el=>getComputedStyle(el).maskPosition);assert.notEqual(midway,'0% 0px');assert.equal(await p.locator('#questionPicker').evaluate(el=>el.inert),true);
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>!document.querySelector('#editor .door-opening-overlay'));assert.equal(await p.locator('#questionPicker').evaluate(el=>el.inert),false);
 await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>{editor.close();openDoor(2);for(const animation of editor.getAnimations({subtree:true})){animation.pause();animation.currentTime=350}});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await p.locator('#editor .door-opening-overlay').count(),1);await p.locator('#editor .close').click();await p.waitForFunction(()=>!document.querySelector('#editor .door-opening-overlay'));assert.equal(await p.locator('#questionPicker').evaluate(el=>el.inert),false);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('opening introduction stays until Continue and supports keyboard continuation',async()=>{
 const p=await page();try{
 await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>{openDoor(2);for(const animation of editor.getAnimations({subtree:true}))animation.finish()});assert.equal(await p.locator('#editor .door-opening-overlay').isVisible(),true);assert.equal(await p.locator('#questionPicker').evaluate(el=>el.inert),true);assert.equal(await p.locator('#editor .opening-continue').evaluate(el=>el===document.activeElement),true);
 await p.locator('#editor .opening-continue').press('Enter');await p.waitForFunction(()=>!document.querySelector('#editor .door-opening-overlay'));assert.equal(await p.locator('#questionPicker').evaluate(el=>el.inert),false);assert.equal(await p.locator('#questionChoices button').first().evaluate(el=>el===document.activeElement),true);await p.setViewportSize({width:320,height:480});await p.evaluate(()=>{editor.close();toggleLang();for(let day=0;day<23;day++)if(!doorComplete(day))addTextEntry('A small everyday memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});openDoor(23);for(const animation of document.getElementById('revealDialog').getAnimations({subtree:true}))animation.finish()});await p.locator('#revealDialog .opening-continue').click();await p.waitForFunction(()=>!document.querySelector('#revealDialog .door-opening-overlay'));assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('Christmas gift is the original reflections, with three clearly separated next steps',async()=>{
 const p=await page();try{
 await p.evaluate(()=>{for(let day=0;day<23;day++)if(!doorComplete(day))addTextEntry('A small everyday memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});openDoor(23)});assert.equal(await p.locator('#revealGiftTitle').textContent(),'A gift from yourself.');assert((await p.locator('#revealGiftText').textContent()).includes('Your own words'));assert.equal(await p.locator('#revealUsesTitle').textContent(),'What can I do with it?');assert.equal(await p.locator('.reveal-options>section').count(),3);assert.equal(await p.locator('#revealGenerateTitle').textContent(),'Create a mini biography.');assert.equal(await p.evaluate(()=>generatedDraft),null);assert((await p.locator('#grandText').textContent()).includes('a gift you’ve made for yourself'));
 await p.evaluate(()=>toggleLang());assert.equal(await p.locator('#revealGiftTitle').textContent(),'Ein Geschenk von dir selbst.');assert.equal(await p.locator('#revealUsesTitle').textContent(),'Was kann ich damit machen?');assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('Continue waits until the opening title and description have finished',async()=>{
 const p=await page();try{
 await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>{openDoor(2);for(const animation of editor.getAnimations({subtree:true})){animation.pause();animation.currentTime=700}});assert.equal(await p.locator('#editor .opening-continue').isVisible(),false);assert.equal(await p.locator('#editor .opening-continue').isDisabled(),true);
 await p.evaluate(()=>{for(const animation of editor.getAnimations({subtree:true}))animation.finish()});await p.locator('#editor .opening-continue').waitFor();assert.equal(await p.locator('#editor .opening-continue').isEnabled(),true);const opacity=await p.locator('#editor .opening-continue').evaluate(el=>{const animation=el.getAnimations().find(animation=>animation.animationName==='opening-continue-arrive');animation.pause();animation.currentTime=250;return Number(getComputedStyle(el).opacity)});assert(opacity>0&&opacity<1);await p.locator('#editor .opening-continue').evaluate(el=>el.getAnimations().forEach(animation=>animation.finish()));await p.locator('#editor .opening-continue').click();await p.waitForFunction(()=>!document.querySelector('#editor .door-opening-overlay'));assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('developer reset confirms, clears personal data during simulation and returns to a fresh visit',async()=>{
 const p=await page();try{
 await p.evaluate(()=>{openDoor(2)});await answer(p,1,'A memory to reset.');
 const image=await png(p);await p.locator('#photo').setInputFiles({name:'reset.png',mimeType:'image/png',buffer:image});await p.locator('.photo-card').waitFor();
 await p.locator('#saveClose').click();
 await p.evaluate(()=>{generatedDraft={markdown:'A saved generated text.'};save();localStorage.setItem('unrelated-data','keep')});
 const original=await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY));
 assert.equal(await p.locator('#devReset').isVisible(),true);
 p.once('dialog',dialog=>dialog.dismiss());await p.locator('#devReset').click();
 assert.equal(await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY)),original);
 await p.evaluate(()=>startSimulation());assert.equal(await p.evaluate(()=>isSimulation),true);
 p.once('dialog',dialog=>dialog.accept());await p.locator('#devReset').click();await p.waitForFunction(()=>document.getElementById('introDialog')?.open);
 assert.equal(await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY)),null);
 assert.equal(await p.evaluate(()=>localStorage.getItem(INTRO_SEEN_KEY)),null);
 assert.deepEqual(await p.evaluate(()=>({entries:state.entries,media:Object.keys(media),draft:generatedDraft,simulation:isSimulation,backup:simulationBackup})),{entries:[],media:[],draft:null,simulation:false,backup:null});
 assert.equal(await p.evaluate(()=>localStorage.getItem('unrelated-data')),'keep');assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('door 24 requires all earlier doors, explains the lock, and guards direct opening',async()=>{
 const p=await page();try{
 await p.clock.install({time:new Date('2026-12-24T12:00:00Z')});await p.evaluate(()=>render());
 const last=p.locator('#grid .door').nth(23);assert.equal(await last.isDisabled(),true);assert.equal(await last.getAttribute('title'),'Complete all other 23 doors first.');
 await p.evaluate(()=>{openDoor(23);story(true)});assert.equal(await p.locator('#revealDialog').isVisible(),false);assert.equal(await p.evaluate(()=>keepsakeRevealed),false);
 await p.evaluate(()=>{for(let day=1;day<22;day++)addTextEntry('A small memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});save()});assert.equal(await last.isDisabled(),true);
 await p.evaluate(()=>toggleLang());assert.equal(await last.getAttribute('title'),'Schließe zuerst alle anderen 23 Türchen ab.');
 await p.evaluate(()=>{addTextEntry('The last reflection.',{topic:themes[22],question:questions[22],binding:{day:22,choice:0}});save()});assert.equal(await last.isDisabled(),false);
 await last.click();assert.equal(await p.locator('#revealDialog').isVisible(),true);
 await p.evaluate(()=>{document.getElementById('revealDialog').close();state.entries=state.entries.filter(entry=>entryBinding(entry).day!==22);save();story()});
 assert.equal(await last.isDisabled(),true);assert.equal(await p.locator('#revealDialog').isVisible(),false);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('generic tagged records preserve labels, IDs and linked context through editing and reload',async()=>{
 const p=await page();try{
 const manifest={formatVersion:1,language:'en',entries:[
  {id:'name',tags:['person:name','private'],text:'Alex'},
  {id:'reflection',tags:['reflection','childhood','other-app:custom','dear-december:door:3'],text:'A wooden train.',createdAt:'2026-10-22T12:00:00Z',modificationDates:[]},
  {id:'prompt',tags:['question','other-app:prompt'],text:'Which toy do you remember?',relatedTo:['reflection']},
  {id:'note',tags:['another-app:research'],text:'A separate observation.'},
  {id:'context',tags:['topic','external:preserve'],text:'Additional topic context',relatedTo:['name']}
 ]};
 await p.evaluate(manifest=>{validateCollection(manifest);state=calendarCollection(manifest);inferBindings();save();openDoor(2)},manifest);
 assert.equal(await p.locator('#answer').inputValue(),'A wooden train.');assert.equal(await p.locator('#question').textContent(),'Which toy do you remember?');
 await p.locator('#answer').fill('A red wooden train.');await p.locator('#saveClose').click();await p.reload();
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem(DOCUMENT_KEY)).collection);
 assert.equal(saved.profile,undefined);assert(saved.entries.every(entry=>Array.isArray(entry.tags)&&!('type'in entry)&&!('question'in entry)));
 assert.equal(saved.entries.find(entry=>entry.id==='reflection').text,'A red wooden train.');
 assert.deepEqual(saved.entries.find(entry=>entry.id==='reflection').tags,[...manifest.entries[1].tags,'dear-december:catalog:timeline-v1']);
 assert.deepEqual(saved.entries.find(entry=>entry.id==='prompt'),manifest.entries[2]);assert.deepEqual(saved.entries.find(entry=>entry.id==='context'),manifest.entries[4]);
 const roundtrip=await p.evaluate(async()=>{const before=taggedManifest(state);const blob=await createArchive(before,media);const result=await readArchive(await blob.arrayBuffer());return {before,after:taggedManifest(result.collection)}});
 assert.deepEqual(roundtrip.after,roundtrip.before);assert.equal(roundtrip.before.entries.find(entry=>entry.id==='name').createdAt,undefined);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('generic manifests reject duplicate IDs, invalid links and bad edit chronology',async()=>{
 const p=await page();try{
 const failures=await p.evaluate(()=>{
  const entry={id:'one',tags:['anything'],text:'A record.'},base={formatVersion:1,language:'en',entries:[entry]};
  const cases=[{...base,entries:[entry,{...entry}]},{...base,entries:[{...entry,relatedTo:['missing']}]},{...base,entries:[{...entry,relatedTo:['one']}]},{...base,entries:[{...entry,modificationDates:['2026-10-22T12:00:00Z']}]},{...base,entries:[{...entry,createdAt:'2026-10-22T12:00:00Z',modificationDates:['2026-10-21T12:00:00Z']}]}];
  return cases.map(manifest=>{try{validateCollection(manifest);return false}catch{return true}});
 });assert(failures.every(Boolean));assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('legacy browser data migrates to plain tagged records without invented fact timestamps',async()=>{
 const p=await page();try{
 const before=await p.evaluate(()=>{addTextEntry('An existing memory.',{question:'An old prompt',topic:'An old topic'});commitAndSave();const legacy=structuredClone(state);localStorage.setItem(DOCUMENT_KEY,JSON.stringify({collection:legacy,media:{}}));return legacy});
 await p.reload();assert.deepEqual(await collection(p),before);
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem(DOCUMENT_KEY)).collection);
 assert.equal(saved.profile,undefined);assert.equal(saved.entries.find(entry=>entry.tags.includes('person:name')).createdAt,undefined);
 const record=saved.entries.find(entry=>entry.tags.includes('reflection'));assert.equal(record.createdAt,before.entries[0].createdAt);
 const ids=saved.entries.map(entry=>entry.id);await p.evaluate(()=>save());assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem(DOCUMENT_KEY)).collection.entries.map(entry=>entry.id)),ids);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('file content stays a file regardless of its plain labels',async()=>{
 const p=await page();try{
 const bytes=await png(p);
 const result=await p.evaluate(async bytes=>{
  const manifest={formatVersion:1,language:'en',entries:[{id:'file',tags:['question','person:name','custom'],filePath:'media/photo.png'}]};
  const blob=new Blob([new Uint8Array(bytes)],{type:'image/png'}),source=await blobDataUrl(blob);
  const archive=await createArchive(manifest,{'media/photo.png':source});const incoming=await readArchive(await archive.arrayBuffer());
  return {restored:incoming.media['media/photo.png'],manifest:taggedManifest(incoming.collection),photo:incoming.collection.entries[0].type};
 },[...bytes]);
 assert.equal(result.photo,'photo');assert.deepEqual(Buffer.from(result.restored.split(',')[1],'base64'),bytes);assert.deepEqual(result.manifest.entries[0].tags,['question','person:name','custom']);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});


test('tapping a door introduction reveals Continue early without opening the content',async()=>{
 const p=await page();try{
  await p.emulateMedia({reducedMotion:'no-preference'});
  await p.evaluate(()=>{openDoor(2);for(const animation of editor.getAnimations({subtree:true})){animation.pause();animation.currentTime=100}});
  assert.equal(await p.locator('#editor .opening-continue').isVisible(),false);
  await p.locator('#editor .door-opening-overlay').click({position:{x:20,y:20}});
  assert.equal(await p.locator('#editor .opening-continue').isVisible(),true);
  assert.equal(await p.locator('#editor .opening-continue').isEnabled(),true);
  assert.equal(await p.locator('#editor .opening-continue').evaluate(el=>Number(getComputedStyle(el).opacity)),1);
  assert.equal(await p.locator('#questionPicker').evaluate(el=>el.inert),true);
  assert.equal(await p.locator('#editor .door-opening-overlay').count(),1);
  await p.locator('#editor .opening-continue').click();
  await p.waitForFunction(()=>!document.querySelector('#editor .door-opening-overlay'));
  assert.equal(await p.locator('#questionPicker').evaluate(el=>el.inert),false);
  assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});


test('modal dialogs lock background scrolling and keep their own content scrollable',async()=>{
 const p=await page();try{
  await p.setViewportSize({width:390,height:600});
  await p.evaluate(()=>window.scrollTo(0,300));
  const original=await p.evaluate(()=>window.scrollY);
  await p.evaluate(()=>showAbout());
  assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'hidden');
  await p.mouse.move(5,300);await p.mouse.wheel(0,500);await p.waitForTimeout(150);
  assert.equal(await p.evaluate(()=>window.scrollY),original);
  const bounds=await p.locator('#aboutDialog').boundingBox();
  await p.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await p.mouse.wheel(0,400);await p.waitForTimeout(150);
  assert((await p.locator('#aboutDialog').evaluate(el=>el.scrollTop))>0);
  await p.evaluate(()=>{document.getElementById('introDialog').showModal();document.getElementById('aboutDialog').close()});
  assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'hidden');
  await p.evaluate(()=>dismissIntro());
  assert.notEqual(await p.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'hidden');
  assert.equal(await p.evaluate(()=>window.scrollY),original);
  await p.mouse.move(5,300);await p.mouse.wheel(0,400);await p.waitForTimeout(150);
  assert((await p.evaluate(()=>window.scrollY))>original);
  assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('approachable catalog preserves earlier questions and renamed door associations',async()=>{
 const p=await page();try{
  const originalQuestion='What has helped you through a difficult time?';
  await p.evaluate(question=>{
   state.entries=[{type:'text',topic:'Through difficult times',question,text:'An earlier answer.',createdAt:'2026-10-01T12:00:00Z',modificationDates:[]}];
   inferBindings();save();openDoor(17);
  },originalQuestion);
  assert.equal(await p.locator('#title').textContent(),'When the weekend comes');
  assert.equal(await p.locator('#question').textContent(),originalQuestion);
  assert.equal(await p.locator('#answer').inputValue(),'An earlier answer.');
  await p.reload();await p.evaluate(()=>{document.getElementById('preview').checked=true;openDoor(17)});
  assert.equal(await p.locator('#question').textContent(),originalQuestion);
  assert.equal(await p.locator('#answer').inputValue(),'An earlier answer.');
  const prompts=await p.evaluate(()=>({en:question(17,'en'),de:question(17,'de'),meaning:questionChoices.en[21].includes('What gives your life meaning?'),count:questions.length,deCount:deQuestions.length}));
  assert.equal(prompts.en,'How do you usually spend your weekends?');
  assert.equal(prompts.de,'Wie verbringst du meistens deine Wochenenden?');
  assert.equal(prompts.meaning,true);assert.equal(prompts.count,23);assert.equal(prompts.deCount,23);
  assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});


test('timeline migrates legacy numbered records once while retaining content and linked photos',async()=>{
 const p=await page();try{
  const result=await p.evaluate(()=>{
   const entries=[];
   for(let day=0;day<23;day++){
    entries.push({id:`r${day}`,tags:['reflection','external:keep',`dear-december:door:${day+1}`],text:`Earlier answer ${day}`,createdAt:'2026-10-01T12:00:00Z',modificationDates:[]});
    entries.push({id:`q${day}`,tags:['question'],text:`Earlier question ${day}?`,relatedTo:[`r${day}`]});
    entries.push({id:`t${day}`,tags:['topic'],text:legacyThemes[day],relatedTo:[`r${day}`]});
   }
   entries.push({id:'photo',tags:['photo','external:photo'],filePath:'media/old.png',relatedTo:['r4'],createdAt:'2026-10-01T12:00:00Z',modificationDates:[]});
   entries.push({id:'caption',tags:['photo:caption'],text:'An original caption.',relatedTo:['photo']});
   const collection={formatVersion:1,language:'en',entries};
   restoreDocument({collection,openedDoors:[4,6,18],media:{}});inferBindings();
   const days=state.entries.filter(entry=>entry.type==='text').map(entry=>entryBinding(entry).day);
   const snapshot=storedDocument();validateCollection(snapshot.collection);
   const opened=[...openedDoors];restoreDocument(snapshot);inferBindings();
   const again=storedDocument();
   return {before:collection,after:snapshot.collection,again:again.collection,days,map:legacyDoorMap.slice(0,23),opened,openedAgain:openedDoors,marker:snapshot.calendarCatalog};
  });
  assert.deepEqual(result.days,result.map);assert.equal(result.marker,'timeline-v1');
  assert.deepEqual(result.opened,[6,8,21]);assert.deepEqual(result.openedAgain,result.opened);
  for(const before of result.before.entries){const after=result.after.entries.find(item=>item.id===before.id);assert(after);
   assert.deepEqual({...after,tags:before.tags},before);
   if(before.id.startsWith('r')){assert(after.tags.includes('external:keep'));assert(after.tags.includes('dear-december:catalog:timeline-v1'));}
  }
  assert.deepEqual(result.again,result.after);
  await p.reload();assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('timeline catalog offers all doors in both languages and sample answers use current questions',async()=>{
 const p=await page();try{
  const catalog=await p.evaluate(()=>({themes:themes.length,deThemes:deThemes.length,questions:questions.length,deQuestions:deQuestions.length,choices:questionChoices.en.map(a=>a.length),deChoices:questionChoices.de.map(a=>a.length),descriptions:doorDescriptions.en.length,deDescriptions:doorDescriptions.de.length}));
  assert.deepEqual(catalog,{themes:24,deThemes:24,questions:23,deQuestions:23,choices:Array(23).fill(2),deChoices:Array(23).fill(2),descriptions:24,deDescriptions:24});
  await p.evaluate(()=>{openDoor(4)});assert.equal(await p.locator('#title').textContent(),'Things that seemed scary');
  assert((await p.locator('#questionChoices').textContent()).includes('What made your room feel cosy at bedtime?'));
  await p.evaluate(()=>{editor.close();startSimulation()});
  const sample=await p.evaluate(()=>({count:state.entries.length,complete:earlierDoorsComplete(),matches:state.entries.every((e,i)=>e.question===questions[i])}));
  assert.deepEqual(sample,{count:23,complete:true,matches:true});assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});


test('progress includes door 24 only after the Christmas reveal is opened',async()=>{
 const p=await page();try{
  await p.evaluate(()=>{keepsakeRevealed=false;startSimulation()});
  assert.equal(await p.locator('#count').textContent(),'23 of 24 memories collected');
  assert((await p.locator('#bar').evaluate(el=>parseFloat(el.style.width)))<100);
  await p.evaluate(()=>openDoor(23));
  assert.equal(await p.locator('#count').textContent(),'24 of 24 memories collected');
  assert.equal(await p.locator('#bar').evaluate(el=>el.style.width),'100%');
  await p.evaluate(()=>{closeDoorReveal();toggleLang()});
  assert.equal(await p.locator('#count').textContent(),'24 von 24 Erinnerungen gesammelt');
  assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});
