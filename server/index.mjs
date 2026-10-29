import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,rm,statfs} from 'node:fs/promises';
import {resolve,extname,sep,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {toNodeHandler,fromNodeHeaders} from 'better-auth/node';
import sharp from 'sharp';
import {openDatabase} from './database.mjs';
import {createAuth,sendProductionEmail} from './auth.mjs';
import {validateDocument} from './validation.mjs';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.ttf':'font/ttf'};
const imageTypes={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
sharp.cache({memory:16});sharp.concurrency(1);
const fail=(status,message)=>Object.assign(Error(message),{status});
async function body(req,limit){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw fail(413,'Request is too large.');chunks.push(chunk)}return Buffer.concat(chunks)}
export async function createApp({baseURL=process.env.BETTER_AUTH_URL,secret=process.env.BETTER_AUTH_SECRET,dataDir=process.env.DATA_DIR||'.data',root=resolve(fileURLToPath(new URL('../dist/',import.meta.url))),sendEmail=sendProductionEmail}={}){
 if(!baseURL)throw Error('BETTER_AUTH_URL is required.');
 const origin=new URL(baseURL).origin,db=openDatabase(join(dataDir,'dear-december.sqlite')),mediaDir=resolve(dataDir,'media');await mkdir(mediaDir,{recursive:true});
 const auth=createAuth({db,baseURL,secret,sendEmail,afterDelete:async id=>{if(/^[A-Za-z0-9_-]+$/.test(id))await rm(join(mediaDir,id),{recursive:true,force:true})}}),authHandler=toNodeHandler(auth);
 const requests=new Map();let decoding=0;
 const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
  try{
   const url=new URL(req.url,origin);
   if(req.headers.host!==new URL(origin).host)throw fail(403,'Invalid request host.');
   if(!['GET','HEAD','POST','PUT','DELETE'].includes(req.method))throw fail(405,'Method not allowed.');
   if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==origin)throw fail(403,'Invalid request origin.');
   if(url.pathname==='/api/health'&&req.method==='GET'){db.prepare('SELECT 1').get();return json(200,{ok:true})}
   if(url.pathname==='/api/account/config'&&req.method==='GET')return json(200,{accounts:true});
   if(url.pathname.startsWith('/api/auth/'))return await authHandler(req,res);
   if(url.pathname==='/api/generation'&&req.method==='GET')return json(200,{available:false,provider:'OpenAI',model:'',reason:'Use your preferred AI with the downloadable prompt.'});
   if(url.pathname.startsWith('/api/')){
    const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});if(!session?.user.emailVerified)throw fail(401,'Please sign in with a verified email first.');const user=session.user.id;
    if(url.pathname.startsWith('/api/journal')&&req.headers['x-journal-account']!==user)throw fail(401,'Your account changed. Reload before continuing.');
    const now=Date.now(),rate=requests.get(user)||{since:now,count:0};if(now-rate.since>60000){rate.since=now;rate.count=0}if(++rate.count>180)throw fail(429,'Too many requests. Please wait.');requests.set(user,rate);if(requests.size>10000)for(const [id,entry]of requests)if(now-entry.since>60000)requests.delete(id);
    if(url.pathname==='/api/journal'&&req.method==='GET'){
     const row=db.prepare('SELECT revision,document FROM journals WHERE user_id=?').get(user);
     const document=row?JSON.parse(row.document):{collection:{formatVersion:1,language:'en',entries:[]},generatedDraft:null,keepsakeRevealed:false,openedDoors:[]};
     return json(200,{revision:row?.revision||0,document,assets:db.prepare('SELECT id,path,digest FROM assets WHERE user_id=?').all(user)})
    }
    if(url.pathname==='/api/journal'&&req.method==='PUT'){
     if(req.headers['content-type']!=='application/json')throw fail(415,'JSON is required.');let input;try{input=JSON.parse((await body(req,2e6)).toString())}catch(error){if(error.status)throw error;throw fail(400,'Invalid JSON.')}
     if(!Number.isSafeInteger(input?.revision)||input.revision<0)throw fail(400,'A valid revision is required.');const document=validateDocument(input.document);
     const paths=new Set(document.collection.entries.filter(entry=>entry.filePath).map(entry=>entry.filePath));
     if([...paths].some(path=>!db.prepare('SELECT id FROM assets WHERE user_id=? AND path=?').get(user,path)))throw fail(400,'Upload all referenced photos before saving.');
     db.transaction(()=>{
      const row=db.prepare('SELECT revision FROM journals WHERE user_id=?').get(user);
      if((row?.revision||0)!==input.revision)throw fail(409,'This journal changed on another device. Your edits have been kept.');
      if(row){if(!db.prepare('UPDATE journals SET document=?, revision=revision+1, updated_at=? WHERE user_id=? AND revision=?').run(JSON.stringify(document),new Date().toISOString(),user,input.revision).changes)throw fail(409,'This journal changed on another device.')}
      else db.prepare('INSERT INTO journals VALUES (?,1,?,?)').run(user,JSON.stringify(document),new Date().toISOString());
     })();return json(200,{revision:input.revision+1})
    }
    if(url.pathname==='/api/journal/assets'&&req.method==='POST'){
     const path=url.searchParams.get('path');if(!/^media\/[A-Za-z0-9][A-Za-z0-9_-]*\.(jpg|jpeg|png|webp)$/.test(path||''))throw fail(400,'Invalid photo path.');const type=imageTypes[path.split('.').at(-1)];if(req.headers['content-type']!==type)throw fail(415,'Invalid photo content type.');
     const disk=await statfs(dataDir);if(disk.bavail*disk.bsize<200e6)throw fail(503,'Photo storage is temporarily unavailable. Please retry later.');
     const bytes=await body(req,3e6),digest=createHash('sha256').update(bytes).digest('hex'),existing=db.prepare('SELECT id,digest FROM assets WHERE user_id=? AND path=?').get(user,path);
     if(existing){if(existing.digest!==digest)throw fail(409,'A different photo already uses this filename.');return json(200,{id:existing.id,path,digest})}
     if(db.prepare('SELECT COUNT(*) count FROM assets WHERE user_id=?').get(user).count>=2000)throw fail(413,'Your journal has reached its photo limit.');
     if(db.prepare('SELECT COALESCE(SUM(size),0) total FROM assets WHERE user_id=?').get(user).total+bytes.length>30e6)throw fail(413,'Your photo storage exceeds 30 MB.');
     if(decoding>=1)throw fail(429,'Please retry the photo upload shortly.');decoding++;
     try{const image=sharp(bytes,{limitInputPixels:40e6,animated:false});const metadata=await image.metadata();if(!['png','jpeg','webp'].includes(metadata.format)||imageTypes[path.split('.').at(-1)]!==`image/${metadata.format}`)throw Error();await image.resize(1,1).raw().toBuffer()}catch{throw fail(400,'The photo could not be decoded or exceeds 40 megapixels.')}finally{decoding--}
     const id=randomUUID(),key=user+'/'+id;await mkdir(join(mediaDir,user),{recursive:true});await writeFile(join(mediaDir,key),bytes,{flag:'wx',mode:0o600});
     try{db.transaction(()=>{if(db.prepare('SELECT COALESCE(SUM(size),0) total FROM assets WHERE user_id=?').get(user).total+bytes.length>30e6)throw fail(413,'Your photo storage exceeds 30 MB.');db.prepare('INSERT INTO assets VALUES (?,?,?,?,?,?,?,?)').run(id,user,path,key,type,bytes.length,digest,new Date().toISOString())})()}catch(error){await rm(join(mediaDir,key),{force:true});throw error.status?error:fail(409,'Photo upload conflicted. Please retry.')}
     return json(201,{id,path,digest})
    }
    const match=url.pathname.match(/^\/api\/journal\/assets\/([a-f0-9-]{36})$/);
    if(match&&req.method==='GET'){
     const asset=db.prepare('SELECT storage_key,content_type FROM assets WHERE id=? AND user_id=?').get(match[1],user);if(!asset)throw fail(404,'Photo not found.');const bytes=await readFile(join(mediaDir,asset.storage_key));res.writeHead(200,{'Content-Type':asset.content_type,'Cache-Control':'private, no-store'});return res.end(bytes)
    }
    throw fail(404,'Not found.');
   }
   if(!['GET','HEAD'].includes(req.method))throw fail(405,'Method not allowed.');
   const path=decodeURIComponent(url.pathname);const filename=resolve(root,'.'+(path==='/'?'/index.html':path));if(!filename.startsWith(root+sep)||!types[extname(filename)])throw fail(404,'Not found.');
   let bytes;try{bytes=await readFile(filename)}catch{throw fail(404,'Not found.')}
   res.writeHead(200,{'Content-Type':types[extname(filename)],'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch(error){if(!res.headersSent)json(error.status||500,{error:error.status?error.message:'The request failed. Please try again.'});else res.end()}
 });
 server.requestTimeout=30000;server.headersTimeout=15000;
 // Remove only old, unreferenced uploads. Live document photos are never garbage-collected.
 async function cleanUploads(){for(const asset of db.prepare("SELECT * FROM assets WHERE created_at < ?").all(new Date(Date.now()-86400000).toISOString())){const row=db.prepare('SELECT document FROM journals WHERE user_id=?').get(asset.user_id);if(row&&JSON.parse(row.document).collection.entries.some(entry=>entry.filePath===asset.path))continue;db.prepare('DELETE FROM assets WHERE id=?').run(asset.id);await rm(join(mediaDir,asset.storage_key),{force:true})}}
 const timer=setInterval(()=>cleanUploads().catch(()=>{}),3600000);timer.unref();server.on('close',()=>{clearInterval(timer);db.close()});
 return {server,db,auth};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.env.NODE_ENV==='production'&&(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM))throw Error('Production email must be configured.');
 const {server}=await createApp();server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('Dear December account server ready.'));
}
