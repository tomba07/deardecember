import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {chromium} from 'playwright';
import {createDevServer} from '../server/dev.mjs';
import {generationSource} from '../src/generation-core.js';
const collection={language:'en',profile:{name:'Alex',dateOfBirth:'1990-04-05',placeOfBirth:'York'},entries:[{type:'text',question:'What did you do?',text:'I rode my bike after school.',createdAt:'2026-10-22T12:00:00Z',modificationDates:[]},{type:'photo',description:'My bicycle by the gate.',caption:'My bicycle',filePath:'media/private-filename.jpg',createdAt:'2026-10-22T12:00:00Z',modificationDates:[]}]};
const draft='## After school\n\nI rode my **bike** after school.';
let server,url,browser,calls=[],mode='ok';
before(async()=>{
 server=createDevServer({apiKey:'test-secret-not-a-real-key',fetchImpl:async(endpoint,options)=>{calls.push({endpoint,options});if(mode==='delay')await new Promise(resolve=>setTimeout(resolve,300));if(mode==='unauthorized')return new Response('{}',{status:401});if(mode==='broken')return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:''}]}]}));if(mode==='refusal')return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'refusal',refusal:'No'}]}]}));return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:mode==='oversized'?'x'.repeat(100001):draft}]}]}))}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${server.address().port}`;browser=await chromium.launch();
});
after(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve))});
const post=(body,headers={})=>fetch(url+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('API proxy requires consent, valid source, same origin, and bounded requests',async()=>{
 const count=calls.length;const source=generationSource(collection);
 for(const body of [{source},{consent:false,source},{consent:true,source:{...source,media:'private'}},{consent:true,source:{...source,entries:[]}}])assert.equal((await post(body)).status,400);
 assert.equal((await post({consent:true,source},{Origin:'https://untrusted.example'})).status,403);
 assert.equal(await new Promise(resolve=>{const req=request(url+'/api/generation',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode)});req.end()}),403);
 assert.equal((await post({consent:true,source,extra:'x'.repeat(512001)})).status,413);
 assert.equal(calls.length,count);
});
test('API requests one Markdown text with projected source and server key, with storage disabled',async()=>{
 mode='ok';const response=await post({consent:true,source:generationSource(collection)});assert.equal(response.status,200);const result=await response.json();assert.deepEqual(result.markdown,draft);assert(!JSON.stringify(result).includes('test-secret'));
 const call=calls.at(-1),body=JSON.parse(call.options.body);assert.equal(call.endpoint,'https://api.openai.com/v1/responses');assert.equal(body.store,false);assert.deepEqual(body.text.format,{type:'text'});assert(!JSON.stringify(body).includes('json_schema'));assert.equal(call.options.headers.Authorization,'Bearer test-secret-not-a-real-key');assert(!body.input.includes('private-filename'));assert(!body.input.includes('modificationDates'));assert(body.instructions.includes('untrusted DATA'));assert(body.instructions.includes('Markdown level-2 heading (## Heading)'));assert(body.instructions.includes('single headed section for sparse material'));
});
test('API handles rejected keys, refusals, empty and oversized output',async()=>{
 for(const [value,status]of [['unauthorized',502],['refusal',422],['broken',502],['oversized',502]]){mode=value;const response=await post({consent:true,source:generationSource(collection)});assert.equal(response.status,status);assert(!JSON.stringify(await response.json()).includes('test-secret'))}mode='ok';
});
async function openPage(){const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();await page.goto(url);await page.evaluate(c=>{dismissIntro();state.profile=c.profile;state.entries=c.entries;document.getElementById('preview').checked=true;for(let day=0;day<23;day++)if(!doorComplete(day))addTextEntry('A small everyday memory.',{topic:themes[day],question:questions[day],binding:{day,choice:0}});save();story()},collection);await page.locator('#revealGenerate').click();return page}
test('browser requires explicit consent, preserves sources, edits/downloads a separate draft and prints safely',async()=>{
 mode='ok';const p=await openPage();try{
 const count=calls.length;assert.equal(await p.locator('#generationSubmit').isDisabled(),true);await p.locator('#generationLocal').click();assert.equal(calls.length,count);await p.locator('#revealGenerate').click();const original=await p.evaluate(()=>JSON.stringify(state));
 assert(!(await p.locator('#generationPayload').inputValue()).includes('private-filename'));await p.locator('#generationAgree').check();await p.locator('#generationSubmit').click();await p.locator('#generationResult').waitFor();assert.equal(await p.locator('#generationDialog').isVisible(),false);assert.equal(await p.locator('#miniographyDialog').isVisible(),true);assert(!(await p.locator('#miniographyDialog').innerText()).includes('I agree to send'));assert.equal(await p.evaluate(()=>JSON.stringify(state)),original);assert.equal(await p.locator('#generationAgree').isChecked(),false);
 await p.locator('#generationMarkdown').fill('My edited draft.');const event=p.waitForEvent('download');await p.locator('#generationDownload').click();const download=await event;const {readFile}=await import('node:fs/promises');const saved=await readFile(await download.path(),'utf8');assert.equal(download.suggestedFilename(),'my-mini-biography.md');assert.equal(saved,'My edited draft.');assert(!saved.includes('test-secret'));assert.equal(await p.locator('#generationSections').count(),0);assert(!(await p.locator('#generationResult').textContent()).includes('Compare with original'));assert(await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY).includes('My edited draft.')));
 await p.evaluate(()=>{window.print=()=>{window.didPrint=true}});await p.locator('#generationPrint').click();await p.waitForFunction(()=>window.didPrint);assert((await p.locator('#printSheet').textContent()).includes('My edited draft.'));assert(!(await p.locator('#printSheet').textContent()).includes('My bicycle by the gate.'));assert.equal(await p.evaluate(()=>JSON.stringify(state)),original);
 }finally{await p.context().close()}
});
test('failed regeneration keeps edited draft and original entries; close sends nothing new',async()=>{
 mode='ok';const p=await openPage();try{
 await p.locator('#generationAgree').check();await p.locator('#generationSubmit').click();await p.locator('#generationResult').waitFor();await p.locator('#generationMarkdown').fill('Keep my edit.');const original=await p.evaluate(()=>JSON.stringify(state));mode='unauthorized';await p.locator('#generationRegenerate').click();assert.equal(await p.locator('#miniographyDialog').isVisible(),false);assert.equal(await p.locator('#generationReplace').isVisible(),true);await p.locator('#generationAgree').check();await p.locator('#generationSubmit').click();await p.waitForFunction(()=>document.getElementById('generationStatus').textContent.includes('rejected'));assert.equal(await p.locator('#generationMarkdown').inputValue(),'Keep my edit.');assert.equal(await p.evaluate(()=>JSON.stringify(state)),original);const count=calls.length;await p.locator('#generationDialog .close').click();assert.equal(calls.length,count);
 }finally{mode='ok';await p.context().close()}
});
test('source preview changes require fresh consent and draft content is rendered as text',async()=>{
 const p=await openPage();try{const count=calls.length;await p.locator('#generationAgree').check();await p.evaluate(()=>{state.entries[0].text='<script>window.injected=true</script>';save()});await p.locator('#generationSubmit').click();assert.equal(calls.length,count);assert.equal(await p.locator('#generationAgree').isChecked(),false);assert((await p.locator('#generationPayload').inputValue()).includes('<script>'));assert.equal(await p.evaluate(()=>window.injected),undefined)}finally{await p.context().close()}
});

test('unconfigured server exposes no key and concurrent generation is rejected',async()=>{
 const disabled=createDevServer({apiKey:''});await new Promise(resolve=>disabled.listen(0,'127.0.0.1',resolve));
 try{const endpoint=`http://127.0.0.1:${disabled.address().port}`;const config=await(await fetch(endpoint+'/api/generation')).json();assert.equal(config.available,false);assert(!('apiKey'in config));assert.equal((await fetch(endpoint+'/api/generate',{method:'POST'})).status,503)}finally{await new Promise(resolve=>disabled.close(resolve))}
 mode='delay';const count=calls.length;const first=post({consent:true,source:generationSource(collection)});
 while(calls.length===count)await new Promise(resolve=>setTimeout(resolve,5));
 try{assert.equal((await post({consent:true,source:generationSource(collection)})).status,429);assert.equal((await first).status,200);assert.equal(calls.length,count+1)}finally{mode='ok'}
});

test('reveal generation opens consent without sending data; archive download stays local',async()=>{
 const p=await openPage();try{
 await p.locator('#generationLocal').click();await p.evaluate(()=>{state.entries=state.entries.filter(entry=>entry.type==='text');document.getElementById('revealDialog').close();openDoor(23)});const count=calls.length;assert.equal(await p.locator('#revealGenerate').isEnabled(),true);
 const event=p.waitForEvent('download');await p.locator('#revealDownload').click();const download=await event;assert.equal(download.suggestedFilename(),'my-journal.deardecember');assert.equal(calls.length,count);
 await p.locator('#revealGenerate').click();assert.equal(await p.locator('#generationDialog').isVisible(),true);assert.equal(await p.locator('#generationAgree').isChecked(),false);assert.equal(calls.length,count);
 }finally{await p.context().close()}
});

test('Markdown preview and PDF preserve formatting without executing HTML or loading remote images',async()=>{
 mode='ok';const p=await openPage();try{
 await p.locator('#generationAgree').check();await p.locator('#generationSubmit').click();await p.locator('#generationResult').waitFor();let remoteRequests=0;p.on('request',request=>{if(request.url().includes('malicious.example'))remoteRequests++});
 await p.locator('#generationMarkdown').fill('## Small moments\n\nA **favourite** routine with *tea*.\n\n## Everyday favourites\n\n- A walk\n- A book\n\n<script>window.injected=true</script>\n\n![test](https://malicious.example/track)\n\n[link](javascript:window.injected=true)');
 assert.deepEqual(await p.locator('#generationPreview h2').allTextContents(),['Small moments','Everyday favourites']);assert.equal(await p.locator('#generationPreview strong').textContent(),'favourite');assert.equal(await p.locator('#generationPreview li').count(),2);assert.equal(await p.locator('#generationPreview img, #generationPreview script, #generationPreview a').count(),0);assert.equal(await p.evaluate(()=>window.injected),undefined);const event=p.waitForEvent('download');await p.locator('#generationDownload').click();const download=await event;const {readFile}=await import('node:fs/promises');const markdown=await readFile(await download.path(),'utf8');assert(markdown.includes('## Small moments'));assert(markdown.includes('## Everyday favourites'));
 await p.evaluate(()=>{window.print=()=>{window.didPrint=true}});await p.locator('#generationPrint').click();await p.waitForFunction(()=>window.didPrint);assert.deepEqual(await p.locator('#printSheet .markdown-content h2').allTextContents(),['Small moments','Everyday favourites']);assert.equal(await p.locator('#printSheet .markdown-content strong').textContent(),'favourite');assert.equal(await p.locator('#printSheet .markdown-content img, #printSheet script').count(),0);assert.equal(remoteRequests,0);
 }finally{await p.context().close()}
});

async function createText(p,text='Saved local text.'){
 await p.locator('#generationAgree').check();await p.locator('#generationSubmit').click();await p.locator('#generationResult').waitFor();await p.locator('#generationMarkdown').fill(text);
}
test('generated Markdown and edits survive reload and can be downloaded without an API connection',async()=>{
 mode='ok';const p=await openPage();try{
 const original=await p.evaluate(()=>JSON.stringify(state));await createText(p,'## Kept locally\n\nMy edited text.');const count=calls.length;
 await p.route('**/api/generation',route=>route.abort());await p.reload();await p.evaluate(()=>{document.getElementById('preview').checked=true;story()});await p.locator('#revealGenerate').click();assert.equal(await p.locator('#generationMarkdown').inputValue(),'## Kept locally\n\nMy edited text.');assert.equal(await p.locator('#generationAgree').isChecked(),false);assert.equal(await p.locator('#generationSubmit').isDisabled(),true);assert.deepEqual(await p.evaluate(()=>structuredClone(state)),JSON.parse(original));assert.equal(calls.length,count);
 const event=p.waitForEvent('download');await p.locator('#generationDownload').click();const download=await event;const {readFile}=await import('node:fs/promises');assert.equal(await readFile(await download.path(),'utf8'),'## Kept locally\n\nMy edited text.');
 }finally{await p.context().close()}
});
test('simulation isolates generated text and restores the saved personal draft',async()=>{
 mode='ok';const p=await openPage();try{
 await createText(p,'Personal draft.');await p.locator('#miniographyDialog .close').click();await p.evaluate(()=>startSimulation());assert.equal(await p.evaluate(()=>generatedDraft),null);assert((await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY))).includes('Personal draft.'));
 await p.evaluate(()=>openDoor(23));await p.locator('#revealGenerate').click();await createText(p,'Sample draft.');assert((await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY))).includes('Personal draft.'));assert(!(await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY))).includes('Sample draft.'));await p.evaluate(()=>endSimulation());await p.evaluate(()=>story());await p.locator('#revealGenerate').click();assert.equal(await p.locator('#generationMarkdown').inputValue(),'Personal draft.');
 }finally{await p.context().close()}
});
test('generated text travels in recovery backups and a replacement journal clears the old draft',async()=>{
 mode='ok';const p=await openPage();try{
 await createText(p,'A recoverable draft.');const backup=await p.evaluate(()=>JSON.stringify(storedDocument()));
 const replacement=JSON.parse(backup);delete replacement.generatedDraft;replacement.collection.entries=[];replacement.media={};await p.locator('#miniographyDialog .close').click();p.once('dialog',dialog=>dialog.accept());await p.locator('#importFile').setInputFiles({name:'replacement.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(replacement))});await p.waitForFunction(()=>document.getElementById('toast').textContent==='Your collection has been imported.');assert.equal(await p.evaluate(()=>generatedDraft),null);
 // This fixture has no image bytes; remove its illustrative photo before recovery import.
 const recovery=JSON.parse(backup);recovery.collection.entries=recovery.collection.entries.filter(entry=>!entry.filePath&&!entry.tags.some(tag=>tag.startsWith('photo:')));recovery.media={};p.once('dialog',dialog=>dialog.accept());await p.locator('#importFile').setInputFiles({name:'recovery.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(recovery))});await p.waitForFunction(()=>generatedDraft?.markdown==='A recoverable draft.');await p.evaluate(()=>{document.getElementById('preview').checked=true;story()});await p.locator('#revealGenerate').click();assert.equal(await p.locator('#generationMarkdown').inputValue(),'A recoverable draft.');
 }finally{await p.context().close()}
});
test('storage failure keeps text editable and downloadable with a clear warning',async()=>{
 mode='ok';const p=await openPage();try{
 await createText(p,'Before storage failure.');await p.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('quota')}});await p.locator('#generationMarkdown').fill('Download this edit.');assert((await p.locator('#generationStorage').textContent()).includes('Could not save'));assert.equal(await p.locator('#generationDownload').isEnabled(),true);assert((await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY))).includes('Before storage failure.'));
 }finally{await p.context().close()}
});

test('saved-text dialog separates local actions from fresh regeneration consent',async()=>{
 mode='ok';const p=await openPage();try{
 await createText(p,'My saved edit.');const count=calls.length;assert.equal(await p.locator('#miniographyDialog').isVisible(),true);assert.equal(await p.locator('#generationDialog').isVisible(),false);assert.equal(await p.locator('#generationDownload').isVisible(),true);assert.equal(await p.locator('#generationPrint').isVisible(),true);assert.equal(await p.locator('#generationRegenerate').isVisible(),true);
 await p.locator('#generationRegenerate').click();assert.equal(await p.locator('#miniographyDialog').isVisible(),false);assert.equal(await p.locator('#generationDialog').isVisible(),true);assert.equal(await p.locator('#generationAgree').isChecked(),false);assert.equal(await p.locator('#generationSubmit').isDisabled(),true);assert.equal(calls.length,count);
 await p.locator('#generationLocal').click();assert.equal(await p.locator('#miniographyDialog').isVisible(),true);assert.equal(await p.locator('#generationMarkdown').inputValue(),'My saved edit.');assert.equal(calls.length,count);
 await p.locator('#miniographyDialog .close').click();await p.locator('#revealGenerate').click();assert.equal(await p.locator('#miniographyDialog').isVisible(),true);assert.equal(await p.locator('#generationDialog').isVisible(),false);assert.equal(calls.length,count);
 }finally{await p.context().close()}
});

async function showInputEditor(p){assert.equal(await p.locator('#generationInputDetails').evaluate(element=>element.parentElement.id),'generationDialog');await p.locator('#generationInputDetails>summary').click()}
test('generation input can be edited and redacted without changing the journal',async()=>{
 mode='ok';const p=await openPage();try{
 const original=await p.evaluate(()=>JSON.stringify(state));await showInputEditor(p);assert((await p.locator('#generationPayload').inputValue()).includes('Alex'));await p.locator('#generationAgree').check();await p.locator('#generationPayload').fill('I enjoyed quiet walks after school.');assert.equal(await p.locator('#generationAgree').isChecked(),false);assert.equal(await p.locator('#generationSubmit').isDisabled(),true);
 await p.locator('#generationAgree').check();await p.locator('#generationSubmit').click();await p.locator('#miniographyDialog').waitFor();const sent=JSON.parse(JSON.parse(calls.at(-1).options.body).input);assert.equal(sent.entries[0].text,'I enjoyed quiet walks after school.');assert.deepEqual(sent.profile,{});assert(!JSON.stringify(sent).includes('Alex'));assert(!JSON.stringify(sent).includes('bicycle'));assert.equal(await p.evaluate(()=>JSON.stringify(state)),original);assert.equal(await p.locator('#generationStale').isVisible(),false);
 }finally{await p.context().close()}
});
test('input reset restores the journal copy and empty edits cannot be submitted',async()=>{
 mode='ok';const p=await openPage();try{
 await showInputEditor(p);const original=await p.locator('#generationPayload').inputValue();const count=calls.length;await p.locator('#generationPayload').fill('');await p.locator('#generationAgree').check();await p.locator('#generationSubmit').click();assert.equal(calls.length,count);assert((await p.locator('#generationStatus').textContent()).includes('Add some text'));
 await p.locator('#generationResetInput').click();assert.equal(await p.locator('#generationPayload').inputValue(),original);assert.equal(await p.locator('#generationAgree').isChecked(),false);
 await p.locator('#generationPayload').fill('My deliberately redacted text.');await p.locator('#generationAgree').check();await p.evaluate(()=>{state.profile.name='Updated original';save()});await p.locator('#generationSubmit').click();assert.equal(calls.length,count);assert.equal(await p.locator('#generationPayload').inputValue(),'My deliberately redacted text.');assert.equal(await p.locator('#generationAgree').isChecked(),false);
 }finally{await p.context().close()}
});

test('generation and saved-text headings use the familiar mini biography name',async()=>{
 mode='ok';const p=await openPage();try{
 assert.equal(await p.locator('#generationTitle').textContent(),'Create your mini biography');await createText(p);assert.equal(await p.locator('#miniographyDialog h2').textContent(),'Your mini biography');assert(!(await p.locator('#miniographyDialog').innerText()).toLowerCase().includes('miniography'));
 }finally{await p.context().close()}
});

test('copyable prompt includes edited reflections and writing rules without sending them to an API',async()=>{
 const p=await openPage();try{
 const original=await p.evaluate(()=>JSON.stringify(state)),count=calls.length;await showInputEditor(p);await p.locator('#generationPayload').fill('Only share my love of afternoon walks.');await p.locator('#generationOwnLlm').click();assert.equal(await p.locator('#ownLlmDialog').isVisible(),true);const prompt=await p.locator('#ownLlmPrompt').inputValue();assert(prompt.includes('Do not invent'));assert(prompt.includes('Only share my love of afternoon walks.'));assert(!prompt.includes('Alex'));assert(!prompt.includes('private-filename'));assert(prompt.includes('Requested output language: English'));assert((await p.locator('#ownLlmLocalHint').textContent()).includes('Local LLMs'));
 const event=p.waitForEvent('download');await p.locator('#ownLlmDownload').click();const download=await event;const {readFile}=await import('node:fs/promises');assert.equal(download.suggestedFilename(),'mini-biography-prompt.txt');assert.equal(await readFile(await download.path(),'utf8'),prompt);assert.equal(calls.length,count);assert.equal(await p.evaluate(()=>JSON.stringify(state)),original);
 await p.locator('#ownLlmDialog .close').click();assert.equal(await p.locator('#generationDialog').isVisible(),true);assert.equal(await p.locator('#generationPayload').inputValue(),'Only share my love of afternoon walks.');assert.equal(await p.locator('#generationAgree').isChecked(),false);
 }finally{await p.context().close()}
});
test('own-model prompt works without an API and its Markdown result saves locally',async()=>{
 const p=await openPage();try{
 await p.locator('#generationLocal').click();await p.route('**/api/generation',route=>route.fulfill({json:{available:false,provider:'OpenAI',model:'gpt-4.1-mini'}}));await p.reload();await p.evaluate(()=>{document.getElementById('preview').checked=true;story();toggleLang()});await p.locator('#revealOwnLlm').click();assert((await p.locator('#ownLlmPrompt').inputValue()).includes('Requested output language: German'));const count=calls.length;
 await p.locator('#ownLlmReturnTitle').click();await p.locator('#ownLlmResult').fill('## Meine Erinnerungen\n\nEin Spaziergang am Nachmittag.');await p.locator('#ownLlmSave').click();assert.equal(await p.locator('#miniographyDialog').isVisible(),true);assert.equal(await p.locator('#generationMarkdown').inputValue(),'## Meine Erinnerungen\n\nEin Spaziergang am Nachmittag.');assert.equal(await p.evaluate(()=>generatedDraft.model),'External AI');assert((await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY))).includes('Ein Spaziergang'));assert.equal(calls.length,count);
 }finally{await p.context().close()}
});
test('clipboard copies the complete own-model prompt and has a manual fallback',async()=>{
 const p=await openPage();try{
 await p.locator('#generationOwnLlm').click();let copied='';await p.exposeFunction('capturePrompt',value=>{copied=value});await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.capturePrompt(value)}}));await p.locator('#ownLlmCopy').click();assert.equal(copied,await p.locator('#ownLlmPrompt').inputValue());
 await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}}));await p.locator('#ownLlmCopy').click();assert((await p.locator('#ownLlmStatus').textContent()).includes('manually'));assert.equal(await p.locator('#ownLlmPrompt').isVisible(),true);
 }finally{await p.context().close()}
});

test('nested dialogs offer Back and preserve edits while returning to their parent',async()=>{
 mode='ok';const p=await openPage();try{
 const count=calls.length;
 await p.locator('#generationInputDetails>summary').click();await p.locator('#generationPayload').fill('A reflection to keep while navigating.');
 await p.locator('#generationOwnLlm').click();await p.locator('#ownLlmBack').click();
 assert.equal(await p.locator('#generationDialog').isVisible(),true);
 assert.equal(await p.locator('#generationPayload').inputValue(),'A reflection to keep while navigating.');
 await p.locator('#generationBack').click();assert.equal(await p.locator('#revealDialog').isVisible(),true);assert.equal(calls.length,count);
 await p.locator('#revealOwnLlm').click();await p.locator('#ownLlmBack').click();assert.equal(await p.locator('#revealDialog').isVisible(),true);
 await p.locator('#revealGenerate').click();await createText(p,'A saved draft.');
 await p.locator('#generationMarkdown').fill('My edited saved draft.');await p.locator('#generationRegenerate').click();await p.locator('#generationBack').click();
 assert.equal(await p.locator('#generationMarkdown').inputValue(),'My edited saved draft.');
 await p.locator('#savedOwnLlm').click();await p.locator('#ownLlmBack').click();assert.equal(await p.locator('#miniographyDialog').isVisible(),true);
 await p.locator('#savedTextBack').click();assert.equal(await p.locator('#revealDialog').isVisible(),true);
 await p.evaluate(()=>toggleLang());await p.locator('#revealOwnLlm').click();assert.equal(await p.locator('#ownLlmBack').textContent(),'← Zurück');
 }finally{await p.context().close()}
});

test('generation shows an accessible loading indicator and clears it on success, error and cancellation',async()=>{
 const p=await openPage();let release;try{
 for(const outcome of ['success','error','cancel']){
  await p.route('**/api/generate',async route=>{await new Promise(resolve=>{release=resolve});await route.fulfill({status:outcome==='error'?502:200,contentType:'application/json',body:JSON.stringify(outcome==='error'?{error:'Test generation failed.'}:{markdown:'My finished text.',model:'test',generatedAt:new Date().toISOString()})}).catch(()=>{})});
  if(outcome!=='success')await p.locator('#generationRegenerate').click();
  await p.locator('#generationAgree').check();await p.locator('#generationSubmit').click();
  await p.locator('#generationLoading').waitFor();assert.equal(await p.locator('#generationSubmit').getAttribute('aria-busy'),'true');assert.equal(await p.locator('#generationSubmit').isDisabled(),true);assert((await p.locator('#generationLoading').textContent()).includes('Creating your text'));
  if(outcome==='cancel')await p.locator('#generationBack').click();
  release();await p.waitForFunction(()=>document.getElementById('generationLoading').hidden);
  assert.equal(await p.locator('#generationSubmit').getAttribute('aria-busy'),'false');
  if(outcome==='error'){assert((await p.locator('#generationStatus').textContent()).includes('Test generation failed'));await p.locator('#generationBack').click()}
  assert.equal(await p.locator('#miniographyDialog').isVisible(),true);
  await p.unroute('**/api/generate');
 }
 }finally{release?.();await p.context().close()}
});
