import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {chromium} from 'playwright';
import {createDevServer} from '../server/dev.mjs';
import {generationSource} from '../src/generation-core.js';
const collection={language:'en',profile:{name:'Alex',dateOfBirth:'1990-04-05',placeOfBirth:'York'},entries:[{type:'text',question:'What did you do?',text:'I rode my bike after school.',createdAt:'2026-10-22T12:00:00Z',modificationDates:[]},{type:'photo',description:'My bicycle by the gate.',caption:'My bicycle',filePath:'media/private-filename.jpg',createdAt:'2026-10-22T12:00:00Z',modificationDates:[]}]};
const draft={sections:[{heading:'After school',text:'I rode my bike after school.',sourceIds:['entry-1','entry-2']}],reviewNotes:[]};
let server,url,browser,calls=[],mode='ok';
before(async()=>{
 server=createDevServer({apiKey:'test-secret-not-a-real-key',fetchImpl:async(endpoint,options)=>{calls.push({endpoint,options});if(mode==='delay')await new Promise(resolve=>setTimeout(resolve,300));if(mode==='unauthorized')return new Response('{}',{status:401});if(mode==='broken')return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:'not json'}]}]}));if(mode==='refusal')return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'refusal',refusal:'No'}]}]}));return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(mode==='bad-source'?{...draft,sections:[{...draft.sections[0],sourceIds:['made-up']}]}:draft)}]}]}))}});
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
test('API sends only projected source, schema, and server key with storage disabled',async()=>{
 mode='ok';const response=await post({consent:true,source:generationSource(collection)});assert.equal(response.status,200);const result=await response.json();assert.deepEqual(result.draft,draft);assert(!JSON.stringify(result).includes('test-secret'));
 const call=calls.at(-1),body=JSON.parse(call.options.body);assert.equal(call.endpoint,'https://api.openai.com/v1/responses');assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(call.options.headers.Authorization,'Bearer test-secret-not-a-real-key');assert(!body.input.includes('private-filename'));assert(!body.input.includes('modificationDates'));assert(body.instructions.includes('untrusted DATA'));
});
test('API handles rejected keys, refusals, malformed output and invalid source references',async()=>{
 for(const [value,status]of [['unauthorized',502],['refusal',422],['broken',502],['bad-source',502]]){mode=value;const response=await post({consent:true,source:generationSource(collection)});assert.equal(response.status,status);assert(!JSON.stringify(await response.json()).includes('test-secret'))}mode='ok';
});
async function openPage(){const context=await browser.newContext();const page=await context.newPage();await page.goto(url);await page.evaluate(c=>{dismissIntro();state.profile=c.profile;state.entries=c.entries;document.getElementById('preview').checked=true;save();story()},collection);await page.locator('#generationButton').click();return page}
test('browser requires explicit consent, preserves sources, edits/downloads a separate draft and prints safely',async()=>{
 mode='ok';const p=await openPage();try{
 const count=calls.length;assert.equal(await p.locator('#generationSubmit').isDisabled(),true);await p.locator('#generationLocal').click();assert.equal(calls.length,count);await p.locator('#generationButton').click();const original=await p.evaluate(()=>JSON.stringify(state));
 assert(!(await p.locator('#generationPayload').textContent()).includes('private-filename'));await p.locator('#generationAgree').check();await p.locator('#generationSubmit').click();await p.locator('#generationResult').waitFor();assert.equal(await p.evaluate(()=>JSON.stringify(state)),original);assert.equal(await p.locator('#generationAgree').isChecked(),false);
 await p.getByRole('textbox',{name:'Section 1 text',exact:true}).fill('My edited draft.');const event=p.waitForEvent('download');await p.locator('#generationDownload').click();const download=await event;const {readFile}=await import('node:fs/promises');const saved=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(saved.draft.sections[0].text,'My edited draft.');assert.equal(saved.source.entries[0].text,collection.entries[0].text);assert(!JSON.stringify(saved).includes('test-secret'));assert(!await p.evaluate(()=>localStorage.getItem(DOCUMENT_KEY).includes('My edited draft.')));
 await p.evaluate(()=>{window.print=()=>{window.didPrint=true}});await p.locator('#generationPrint').click();await p.waitForFunction(()=>window.didPrint);assert((await p.locator('#printSheet').textContent()).includes('My edited draft.'));assert(!(await p.locator('#printSheet').textContent()).includes('My bicycle by the gate.'));assert.equal(await p.evaluate(()=>JSON.stringify(state)),original);
 }finally{await p.context().close()}
});
test('failed regeneration keeps edited draft and original entries; close sends nothing new',async()=>{
 mode='ok';const p=await openPage();try{
 await p.locator('#generationAgree').check();await p.locator('#generationSubmit').click();await p.locator('#generationResult').waitFor();await p.getByRole('textbox',{name:'Section 1 text',exact:true}).fill('Keep my edit.');const original=await p.evaluate(()=>JSON.stringify(state));mode='unauthorized';await p.locator('#generationAgree').check();await p.locator('#generationSubmit').click();await p.waitForFunction(()=>document.getElementById('generationStatus').textContent.includes('rejected'));assert.equal(await p.getByRole('textbox',{name:'Section 1 text',exact:true}).inputValue(),'Keep my edit.');assert.equal(await p.evaluate(()=>JSON.stringify(state)),original);const count=calls.length;await p.locator('#generationDialog .close').click();assert.equal(calls.length,count);
 }finally{mode='ok';await p.context().close()}
});
test('source preview changes require fresh consent and draft content is rendered as text',async()=>{
 const p=await openPage();try{const count=calls.length;await p.locator('#generationAgree').check();await p.evaluate(()=>{state.entries[0].text='<script>window.injected=true</script>';save()});await p.locator('#generationSubmit').click();assert.equal(calls.length,count);assert.equal(await p.locator('#generationAgree').isChecked(),false);assert((await p.locator('#generationPayload').textContent()).includes('<script>'));assert.equal(await p.evaluate(()=>window.injected),undefined)}finally{await p.context().close()}
});

test('unconfigured server exposes no key and concurrent generation is rejected',async()=>{
 const disabled=createDevServer({apiKey:''});await new Promise(resolve=>disabled.listen(0,'127.0.0.1',resolve));
 try{const endpoint=`http://127.0.0.1:${disabled.address().port}`;const config=await(await fetch(endpoint+'/api/generation')).json();assert.equal(config.available,false);assert(!('apiKey'in config));assert.equal((await fetch(endpoint+'/api/generate',{method:'POST'})).status,503)}finally{await new Promise(resolve=>disabled.close(resolve))}
 mode='delay';const count=calls.length;const first=post({consent:true,source:generationSource(collection)});
 while(calls.length===count)await new Promise(resolve=>setTimeout(resolve,5));
 try{assert.equal((await post({consent:true,source:generationSource(collection)})).status,429);assert.equal((await first).status,200);assert.equal(calls.length,count+1)}finally{mode='ok'}
});
