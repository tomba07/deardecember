import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import sharp from 'sharp';
import {chromium} from 'playwright';
import {createApp} from '../server/index.mjs';
let app,url,dir,browser;const emails=[];
before(async()=>{
 dir=await mkdtemp(tmpdir()+'/december-backend-');
 // Bind a port first so the auth origin matches its actual address.
 const {createServer}=await import('node:http');const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));url=`http://127.0.0.1:${port}`;
 app=await createApp({baseURL:url,secret:'backend-test-secret-at-least-32-characters-long',dataDir:dir,sendEmail:async(to,subject,text)=>emails.push({to,subject,text})});await new Promise(r=>app.server.listen(port,'127.0.0.1',r));browser=await chromium.launch();
});
after(async()=>{await browser?.close();await new Promise(r=>app.server.close(r));await rm(dir,{recursive:true,force:true})});
async function json(path,body,cookie='',method='POST',account=''){
 return fetch(url+path,{method,headers:{Origin:url,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(account?{'X-Journal-Account':account}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
}
async function signup(email){
 const response=await json('/api/auth/sign-up/email',{name:'Test Reader',email,password:'a-test-password-123',callbackURL:url+'/'});assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
 const id=app.db.prepare('SELECT id FROM user WHERE email=?').get(email).id;
 return {id,email};
}
async function login(account){const response=await json('/api/auth/sign-in/email',{email:account.email,password:'a-test-password-123'});assert.equal(response.status,200);return response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ')}
async function verify(account){const email=emails.find(email=>email.to===account.email&&email.subject.includes('Verify'));assert(email);const link=email.text.match(/https?:\/\/\S+/)[0];assert.equal((await fetch(link,{redirect:'manual'})).status,302);return login(account)}
const document=()=>({collection:{formatVersion:1,language:'en',entries:[{id:'name',tags:['person:name'],text:'Alex'},{id:'memory',tags:['reflection','dear-december:door:3'],text:'Walking by the river.',createdAt:'2026-10-24T12:00:00Z',modificationDates:[]}]},generatedDraft:{markdown:'## Small moments\n\nWalking by the river.'},openedDoors:[2],keepsakeRevealed:false});

test('verified login, private ownership, revision conflicts and persistent photo bytes',async()=>{
 const a=await signup('reader-a@example.test');assert.equal((await json('/api/auth/sign-in/email',{email:a.email,password:'a-test-password-123'})).status,403);
 const cookieA=await verify(a),b=await signup('reader-b@example.test'),cookieB=await verify(b);
 assert.equal((await json('/api/journal',undefined,'','GET')).status,401);
 assert.equal((await json('/api/journal',undefined,cookieA,'GET',b.id)).status,401);
 const bytes=await sharp({create:{width:32,height:20,channels:3,background:'#294f3d'}}).png().toBuffer();
 const upload=await fetch(url+'/api/journal/assets?path=media/photo.png',{method:'POST',headers:{Origin:url,Cookie:cookieA,'Content-Type':'image/png','X-Journal-Account':a.id},body:bytes});assert.equal(upload.status,201);const asset=await upload.json();
 assert.equal((await fetch(url+'/api/journal/assets/'+asset.id,{headers:{Cookie:cookieB,'X-Journal-Account':b.id}})).status,404);
 assert.deepEqual(Buffer.from(await(await fetch(url+'/api/journal/assets/'+asset.id,{headers:{Cookie:cookieA,'X-Journal-Account':a.id}})).arrayBuffer()),bytes);
 const doc=document();doc.calendarCatalog='timeline-v1';doc.collection.entries.push({id:'photo',tags:['photo'],filePath:'media/photo.png',relatedTo:['memory']});
 const save=await json('/api/journal',{revision:0,document:doc},cookieA,'PUT',a.id);assert.equal(save.status,200);assert.equal((await save.json()).revision,1);
 assert.equal((await json('/api/journal',{revision:0,document:document()},cookieA,'PUT',a.id)).status,409);
 const mine=await(await json('/api/journal',undefined,cookieA,'GET',a.id)).json();assert.equal(mine.document.calendarCatalog,'timeline-v1');assert.equal(mine.document.generatedDraft.markdown,doc.generatedDraft.markdown);assert.equal(mine.document.collection.entries[1].text,'Walking by the river.');
 assert.equal((await(await json('/api/journal',undefined,cookieB,'GET',b.id)).json()).document.collection.entries.length,0);
 assert.equal((await json('/api/journal',{revision:0,document:doc},cookieB,'PUT',b.id)).status,400);
 const bad={...doc,collection:{...doc.collection,entries:[...doc.collection.entries,{...doc.collection.entries[0]}]}};assert.equal((await json('/api/journal',{revision:1,document:bad},cookieA,'PUT',a.id)).status,400);
 const foreign=await fetch(url+'/api/journal',{method:'PUT',headers:{Origin:'https://evil.example',Cookie:cookieA,'Content-Type':'application/json','X-Journal-Account':a.id},body:JSON.stringify({revision:1,document:doc})});assert.equal(foreign.status,403);
 const malformed=await fetch(url+'/api/journal/assets?path=media/bad.png',{method:'POST',headers:{Origin:url,Cookie:cookieA,'Content-Type':'image/png','X-Journal-Account':a.id},body:'not an image'});assert.equal(malformed.status,400);
 assert.equal((await json('/api/generate',{consent:true,source:doc},cookieA)).status,404);
 assert.equal((await json('/api/auth/delete-user',{password:'wrong-password'},cookieA)).status,400);
 assert.equal((await json('/api/auth/delete-user',{password:'a-test-password-123'},cookieA)).status,200);
 assert.equal(app.db.prepare('SELECT * FROM journals WHERE user_id=?').get(a.id),undefined);assert.equal(app.db.prepare('SELECT COUNT(*) n FROM assets WHERE user_id=?').get(a.id).n,0);
 assert.equal((await json('/api/journal',undefined,cookieA,'GET',a.id)).status,401);
});

test('password reset revokes old sessions and uses emailed reset links',async()=>{
 app.db.prepare('DELETE FROM rateLimit').run();
 const a=await signup('reader-reset@example.test'),cookie=await verify(a);
 assert.equal((await json('/api/auth/request-password-reset',{email:a.email,redirectTo:url+'/'})).status,200);
 const mail=emails.find(email=>email.to===a.email&&email.subject.includes('Reset'));const link=mail.text.match(/https?:\/\/\S+/)[0];
 const redirect=await fetch(link,{redirect:'manual'}),target=new URL(redirect.headers.get('location'),url),token=target.searchParams.get('token');assert(token);
 assert.equal((await json('/api/auth/reset-password',{token,newPassword:'new-test-password-123'})).status,200);
 assert.equal((await json('/api/journal',undefined,cookie,'GET',a.id)).status,401);
 assert.equal((await json('/api/auth/sign-in/email',{email:a.email,password:'new-test-password-123'})).status,200);
});

test('browser signs in, saves across devices, restores images and clears the page on sign out',async()=>{
 app.db.prepare('DELETE FROM rateLimit').run();
 const account=await signup('browser-reader@example.test');await verify(account);
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url);await page.waitForFunction(()=>document.getElementById('accountSaveStatus').textContent.includes('Sign in to save'));assert.equal(await page.locator('#introDialog').isVisible(),true);await page.evaluate(()=>dismissIntro());await page.setViewportSize({width:390,height:844});await page.locator('#accountNav').click();const bounds=await page.locator('#accountDialog').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=390);assert.equal(await page.locator('#accountNameLabel').isVisible(),false);await page.locator('#accountEmail').fill(account.email);await page.locator('#accountPassword').fill('a-test-password-123');await page.locator('#accountSubmit').click();await page.waitForFunction(()=>document.getElementById('accountSaveStatus').textContent==='Saved to your account');
  await page.evaluate(()=>{document.getElementById('preview').checked=true;openDoor(2)});await page.locator('#questionChoices button').first().click();await page.locator('#answer').fill('A memory saved to my account.');
  const bytes=await sharp({create:{width:20,height:20,channels:3,background:'red'}}).png().toBuffer();await page.locator('#photo').setInputFiles({name:'test.png',mimeType:'image/png',buffer:bytes});await page.locator('.photo-card').waitFor();await page.locator('#saveClose').click();await page.waitForFunction(()=>document.getElementById('accountSaveStatus').textContent==='Saved to your account');
  assert.equal(await page.evaluate(()=>localStorage.getItem(DOCUMENT_KEY)),null);
  const second=await browser.newContext({reducedMotion:'reduce'});try{const device=await second.newPage();await device.goto(url);await device.evaluate(()=>dismissIntro());await device.locator('#accountNav').click();await device.locator('#accountEmail').fill(account.email);await device.locator('#accountPassword').fill('a-test-password-123');await device.locator('#accountSubmit').click();await device.waitForFunction(()=>document.getElementById('accountSaveStatus').textContent==='Saved to your account');assert.equal(await device.evaluate(()=>state.entries[0].text),'A memory saved to my account.');assert.equal(await device.evaluate(()=>Object.keys(media).length),1)}finally{await second.close()}
  const backup=page.waitForEvent('download');await page.evaluate(()=>exportDraftBackup());const file=await backup;
  await page.reload();await page.waitForFunction(()=>document.getElementById('accountSaveStatus').textContent==='Saved to your account');assert.equal(await page.evaluate(()=>state.entries.find(entry=>entry.type==='text').text),'A memory saved to my account.');assert.equal(await page.evaluate(()=>Object.keys(media).length),1);
  await page.locator('#accountNav').click();await page.locator('#accountRestore').click();page.once('dialog',dialog=>dialog.accept());await page.locator('#importFile').setInputFiles({name:file.suggestedFilename(),mimeType:'application/zip',buffer:await readFile(await file.path())});await page.waitForFunction(()=>document.getElementById('toast').textContent==='Your collection has been imported.');
  await page.locator('#accountNav').click();await page.locator('#accountSignOut').click();await page.waitForFunction(()=>document.getElementById('accountSaveStatus').textContent==='Signed out.');assert.equal(await page.evaluate(()=>state.entries.length),0);assert.equal(await page.evaluate(()=>Object.keys(media).length),0);assert.equal(await page.evaluate(()=>generatedDraft),null);assert.equal(await page.locator('#answer').inputValue(),'');assert.equal(await page.locator('#photos').textContent(),'');assert.equal(await page.locator('#generationPayload').inputValue(),'');assert.deepEqual(errors,[]);
 }catch(error){console.log('Browser diagnostics:',await page.locator('#accountSaveStatus').textContent(),errors);throw error}finally{await context.close()}
});

test('explicit local migration verifies the remote copy before removing legacy browser data',async()=>{
 app.db.prepare('DELETE FROM rateLimit').run();const account=await signup('migration-reader@example.test');await verify(account);
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
 const bytes=await sharp({create:{width:20,height:20,channels:3,background:'blue'}}).png().toBuffer();
 const local={collection:{formatVersion:1,language:'en',profile:{name:'Migrating Reader',dateOfBirth:'1990-04-05',placeOfBirth:'York'},entries:[{type:'text',question:null,text:'A legacy reflection.',createdAt:'2026-10-22T12:00:00Z',modificationDates:[]},{type:'photo',filePath:'media/legacy.png',description:'Old photo context.',createdAt:'2026-10-22T12:00:00Z',modificationDates:[]}]},media:{'media/legacy.png':'data:image/png;base64,'+bytes.toString('base64')}};
 try{
  await page.goto(url);await page.evaluate(local=>localStorage.setItem(DOCUMENT_KEY,JSON.stringify(local)),local);await page.reload();await page.evaluate(()=>dismissIntro());await page.locator('#accountNav').click();await page.locator('#accountEmail').fill(account.email);await page.locator('#accountPassword').fill('a-test-password-123');await page.locator('#accountSubmit').click();await page.waitForFunction(()=>document.getElementById('accountSaveStatus').textContent==='Saved to your account');
  assert.equal(await page.evaluate(()=>state.entries.length),0);assert(await page.evaluate(()=>localStorage.getItem(DOCUMENT_KEY)));
  await page.locator('#accountNav').click();page.once('dialog',dialog=>dialog.accept());await page.locator('#accountMigrate').click();await page.waitForFunction(()=>localStorage.getItem(DOCUMENT_KEY)===null);
  assert.equal(await page.evaluate(()=>state.entries[0].text),'A legacy reflection.');assert.deepEqual(Buffer.from((await page.evaluate(()=>media['media/legacy.png'])).split(',')[1],'base64'),bytes);
 }finally{await context.close()}
});

test('a newer server revision never silently overwrites unsaved browser edits',async()=>{
 app.db.prepare('DELETE FROM rateLimit').run();const account=await signup('conflict-reader@example.test'),cookie=await verify(account);
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
 try{
  await page.goto(url);await page.evaluate(()=>dismissIntro());await page.locator('#accountNav').click();await page.locator('#accountEmail').fill(account.email);await page.locator('#accountPassword').fill('a-test-password-123');await page.locator('#accountSubmit').click();await page.waitForFunction(()=>document.getElementById('accountSaveStatus').textContent==='Saved to your account');
  assert.equal((await json('/api/journal',{revision:0,document:document()},cookie,'PUT',account.id)).status,200);
  await page.evaluate(()=>{document.getElementById('preview').checked=true;openDoor(2)});await page.locator('#questionChoices button').first().click();await page.locator('#answer').fill('My unsaved conflicting text.');await page.locator('#saveClose').click();await page.waitForFunction(()=>document.getElementById('accountSaveStatus').textContent.includes('Changed on another device'));
  assert.equal(await page.evaluate(()=>state.entries[0].text),'My unsaved conflicting text.');const remote=await(await json('/api/journal',undefined,cookie,'GET',account.id)).json();assert.equal(remote.document.collection.entries[1].text,'Walking by the river.');
  await page.locator('#accountNav').click();page.once('dialog',dialog=>dialog.accept());await page.locator('#accountReload').click();await page.waitForFunction(()=>document.getElementById('accountSaveStatus').textContent==='Saved to your account');assert.equal(await page.evaluate(()=>state.entries[0].text),'Walking by the river.');
 }finally{await context.close()}
});
