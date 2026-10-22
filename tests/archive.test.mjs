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
async function page(){const context=await browser.newContext();const page=await context.newPage();page.errors=[];page.on('pageerror',error=>page.errors.push(error.message));await page.goto(url);await page.evaluate(()=>dismissIntro());await page.evaluate(()=>{state.profile={name:'Alex Morgan',dateOfBirth:'1988-04-12',placeOfBirth:'Brookfield, Germany'};document.getElementById('preview').checked=true;save()});return page}
async function answer(page,choice,text){await page.locator('#questionChoices button').nth(choice).click();await page.locator('#answer').fill(text);await page.locator('#moreQuestions').click()}
async function collection(page){return page.evaluate(()=>structuredClone(state))}
async function png(page){return Buffer.from(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=64;canvas.height=40;const c=canvas.getContext('2d');c.fillStyle='#294f3d';c.fillRect(0,0,64,40);return canvas.toDataURL().split(',')[1]}),'base64')}

test('canonical entries, one edit date per commit, reload, profile and original prompt snapshots',async()=>{
 const p=await page();try{
  const birthdays=await p.evaluate(()=>{const original=state.profile.dateOfBirth;const results=['2015-01-01','2015-02-30','2999-01-01'].map(date=>{state.profile.dateOfBirth=date;return validBirthday()});state.profile.dateOfBirth=original;return results});assert.deepEqual(birthdays,[true,false,false]);
  await p.evaluate(()=>openDoor(2));assert.equal(await p.locator('#answer').isVisible(),false);
  await answer(p,1,'A wooden train.');let doc=await collection(p);assert.equal(doc.entries.length,1);assert.equal(doc.entries[0].question,'What was your favourite toy?');assert.deepEqual(doc.entries[0].modificationDates,[]);const created=doc.entries[0].createdAt;
  await p.locator('#questionChoices button').nth(1).click();await p.locator('#answer').fill('A wooden train from my grandfather.');await p.locator('#answer').press('End');assert.equal((await collection(p)).entries[0].modificationDates.length,0);await p.getByRole('button',{name:'Save & close',exact:true}).click();doc=await collection(p);assert.equal(doc.entries[0].createdAt,created);assert.equal(doc.entries[0].modificationDates.length,1);assert(Date.parse(doc.entries[0].modificationDates[0])>Date.parse(created));
  await p.reload();doc=await collection(p);assert.equal(doc.entries[0].modificationDates.length,1);assert.equal(doc.entries[0].text,'A wooden train from my grandfather.');await p.evaluate(()=>{toggleLang();document.getElementById('preview').checked=true;openDoor(2)});assert((await p.locator('#questionChoices button').nth(1).textContent()).includes('What was your favourite toy?'));assert.equal((await collection(p)).entries[0].question,'What was your favourite toy?');assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('text/photo ZIP round trip preserves metadata, media bytes, profile and exact reading order',async()=>{
 const p=await page();try{
  await p.evaluate(()=>openDoor(2));await p.locator('#questionChoices button').nth(1).click();await p.locator('#answer').fill('A wooden train.');const original=await png(p);await p.locator('#photo').setInputFiles({name:'memory.png',mimeType:'image/png',buffer:original});await p.locator('.photo-card').waitFor();await p.locator('.photo-card textarea').nth(0).fill('My train on the carpet, around 1994.');await p.locator('.photo-card textarea').nth(1).fill('A favourite toy');await p.locator('#moreQuestions').click();await answer(p,2,'I collected stones.');
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
  const downloaded=p.waitForEvent('download');await p.evaluate(()=>exportArchive());const file=await(await downloaded).path();p.once('dialog',dialog=>dialog.accept());await p.locator('#importFile').setInputFiles(file);await p.waitForFunction(()=>document.getElementById('toast').textContent==='Your collection has been imported.');assert.deepEqual(await collection(p),before);
  await p.evaluate(()=>story());await p.locator('#storyDialog summary').click();await p.getByRole('button',{name:'Edit entry 2',exact:true}).click();await p.locator('#entryText').fill('An edited second reflection.');await p.locator('#entryDialog .primary').click();assert.equal((await collection(p)).entries[1].text,'An edited second reflection.');assert.equal((await collection(p)).entries[1].modificationDates.length,1);assert.equal((await collection(p)).entries[0].text,'A journal reflection.');assert.deepEqual(p.errors,[]);
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

test('unfinished draft recovery restores entries without inventing profile facts',async()=>{
 const p=await page();try{
  await p.evaluate(()=>{state.profile={name:'',dateOfBirth:'',placeOfBirth:'',placesLived:'Seabrook, then Oakridge'};addTextEntry('An unfinished journal draft.',{question:null});commitAndSave()});const original=await collection(p);
  const download=p.waitForEvent('download');await p.evaluate(()=>exportDraftBackup());const file=await(await download).path();p.once('dialog',dialog=>dialog.accept());await p.locator('#importFile').setInputFiles({name:'miniography-draft-backup.json',mimeType:'application/json',buffer:await readFile(file)});await p.waitForFunction(()=>document.getElementById('toast').textContent==='Your collection has been imported.');assert.deepEqual(await collection(p),original);assert.deepEqual(p.errors,[]);
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
  assert((await p.locator('#welcomeIntro').textContent()).includes('ordinary Sunday'));assert((await p.locator('#welcomePurpose').textContent()).includes('generations'));assert.equal(await p.locator('.welcome-example,.welcome-guide').count(),0);
  assert(!(await p.locator('body').innerText()).includes('PDF'));assert(!(await p.locator('body').innerText()).includes('beautiful book'));
  assert.equal(await p.locator('#journalNav').isVisible(),false);assert.equal(await p.locator('#miniographyReturn').isVisible(),false);assert.equal(await p.locator('#printButton').isVisible(),false);
  await p.evaluate(()=>startSimulation());assert.equal(await p.locator('#printButton').isVisible(),false);await p.evaluate(()=>{storyDialog.close();openDoor(23)});await p.locator('#openMiniography').click();assert.equal(await p.locator('#printButton').isVisible(),true);assert((await p.locator('#revealText').textContent()).includes('little book'));
  await p.evaluate(()=>endSimulation());assert.equal(await p.evaluate(()=>keepsakeRevealed),false);await p.evaluate(()=>openDoor(23));await p.locator('#openMiniography').click();assert.equal(await p.locator('#printButton').isVisible(),true);await p.reload();await p.evaluate(()=>story());assert.equal(await p.locator('#printButton').isVisible(),true);
  await p.evaluate(()=>{storyDialog.close();toggleLang()});assert((await p.locator('#welcomeIntro').textContent()).includes('Großeltern'));assert((await p.locator('#intro').textContent()).includes('Adventskalender'));assert.equal(await p.locator('#journalNav').textContent(),'Deine Miniography ↗');await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});

test('the unlock-all control is localhost-only and cannot unlock the hosted calendar',async()=>{
 const context=await browser.newContext();const p=await context.newPage();try{
  await p.clock.install({time:new Date('2026-10-22T12:00:00Z')});
  await context.route('https://miniography.test/**',async route=>{const response=await route.fetch({url:url+new URL(route.request().url()).pathname});await route.fulfill({response})});
  await p.goto('https://miniography.test/');await p.evaluate(()=>dismissIntro());assert.equal(await p.locator('#devPreview').isVisible(),false);assert(!(await p.locator('body').innerText()).includes('Not December?'));
  assert.equal(await p.evaluate(()=>{document.getElementById('preview').checked=true;return unlocked(0)}),false);
  assert.equal(await p.locator('#devSample').isVisible(),false);await p.evaluate(()=>startSimulation());assert.equal(await p.evaluate(()=>isSimulation),false);assert.equal(await p.evaluate(()=>unlocked(23)),false);
 }finally{await context.close()}
});

test('hosted users get the miniography reveal on December 24, not an early journal preview',async()=>{
 const context=await browser.newContext({timezoneId:'UTC'});const p=await context.newPage();try{
  await p.clock.install({time:new Date('2026-12-23T12:00:00Z')});await context.route('https://miniography.test/**',async route=>{await route.fulfill({response:await route.fetch({url:url+new URL(route.request().url()).pathname})})});await p.goto('https://miniography.test/');await p.evaluate(()=>dismissIntro());
  await p.evaluate(()=>{state.profile={name:'Alex',dateOfBirth:'1988-04-12',placeOfBirth:'Brookfield'};addTextEntry('Riding my bike after school.',{topic:themes[2],question:questions[2],binding:{day:2,choice:0}});commitAndSave()});
  assert.equal(await p.locator('#journalNav').isVisible(),false);assert.equal(await p.locator('#miniographyReturn').isVisible(),false);await p.evaluate(()=>{story();story(true);openDoor(23)});assert.equal(await p.locator('#storyDialog').isVisible(),false);assert.equal(await p.locator('#revealDialog').isVisible(),false);assert.equal(await p.evaluate(()=>keepsakeRevealed),false);
  await p.clock.setSystemTime(new Date('2026-12-24T00:00:01Z'));await p.evaluate(()=>render());await p.getByRole('button',{name:'Door 24',exact:true}).click();assert.equal(await p.locator('#revealDialog').isVisible(),true);assert.equal(await p.locator('#storyDialog').isVisible(),false);assert.equal(await p.locator('#revealName').textContent(),'Alex');await p.setViewportSize({width:390,height:844});const box=await p.locator('#revealDialog').boundingBox();assert(box.x>=0&&box.x+box.width<=390);await p.locator('#openMiniography').click();assert.equal(await p.locator('#printButton').isVisible(),true);assert((await p.locator('#biography').inputValue()).includes('Riding my bike'));
  await p.reload();assert.equal(await p.locator('#journalNav').isVisible(),true);assert.equal(await p.locator('#miniographyReturn').isVisible(),true);await p.getByRole('button',{name:'Your miniography ↗',exact:true}).click();assert.equal(await p.locator('#revealDialog').isVisible(),false);assert.equal(await p.locator('#printButton').isVisible(),true);
  await p.clock.setSystemTime(new Date('2027-01-15T12:00:00Z'));assert.equal(await p.evaluate(()=>unlocked(23)),true);
 }finally{await context.close()}
});

test('first visit intro explains local files, supports skip/close/Escape and can be reopened',async()=>{
 const context=await browser.newContext();const p=await context.newPage();try{
  await p.goto(url);assert.equal(await p.locator('#introDialog').isVisible(),true);assert((await p.locator('#introTransfer').textContent()).includes('.miniography'));assert((await p.locator('#introStorage').textContent()).includes('this browser'));assert(!(await p.locator('#introDialog').innerText()).includes('PDF'));
  await p.locator('#introLanguage').click();assert((await p.locator('#introStorage').textContent()).includes('diesem Browser'));await p.locator('#introSkip').click();assert.equal(await p.locator('#introDialog').isVisible(),false);await p.reload();assert.equal(await p.locator('#introDialog').isVisible(),false);
  await p.locator('#aboutIntro').click();assert.equal(await p.locator('#introDialog').isVisible(),true);await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.getElementById('introDialog').open);await p.reload();assert.equal(await p.locator('#introDialog').isVisible(),false);
  await p.locator('#aboutIntro').click();await p.locator('#introDialog .close').click();assert.equal(await p.locator('#introDialog').isVisible(),false);await p.locator('#aboutIntro').click();await p.locator('#introStart').click();assert.equal(await p.locator('#introDialog').isVisible(),false);
  await p.setViewportSize({width:390,height:844});await p.locator('#aboutIntro').click();const box=await p.locator('#introDialog').boundingBox();assert(box.x>=0&&box.x+box.width<=390);
 }finally{await context.close()}
});

test('unopened doors conceal topic names until clicked, including accessible labels',async()=>{
 const p=await page();try{
  assert.equal(await p.locator('#grid small').allTextContents().then(labels=>labels.every(label=>label==='')),true);assert.equal(await p.locator('#grid button').last().getAttribute('aria-label'),'Door 24');
  await p.getByRole('button',{name:'Door 3',exact:true}).click();assert.equal(await p.locator('#title').textContent(),'Childhood treasures');await p.locator('#saveClose').click();assert.equal(await p.locator('#grid small').nth(2).textContent(),'Childhood treasures');assert.equal(await p.locator('#grid small').nth(1).textContent(),'');await p.reload();assert.equal(await p.locator('#grid small').nth(2).textContent(),'Childhood treasures');assert.equal(await p.locator('#grid button').last().getAttribute('aria-label'),'Door 24');assert.deepEqual(p.errors,[]);
 }finally{await p.context().close()}
});
