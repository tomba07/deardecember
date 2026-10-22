import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generationInstructions,validateGenerationSource,draftSchema,validateGeneratedDraft} from '../src/generation-core.js';

// This is a loopback-only development server, not a public proxy.
export function createDevServer({apiKey=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL||'gpt-4.1-mini',fetchImpl=fetch}={}) {
 const root=resolve(fileURLToPath(new URL('../src/',import.meta.url))); let busy=false;
 return createServer(async(req,res)=>{
  const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value))};
  const allowedHosts=['127.0.0.1','localhost'];
  let url;try{url=new URL(req.url,`http://${req.headers.host}`)}catch{return json(400,{error:'Invalid request.'})}
  if(!allowedHosts.includes(url.hostname)||url.port!==String(req.socket.localPort))return json(403,{error:'Local requests only.'});
  if(url.pathname.startsWith('/api/')){
   if(req.headers.origin&&req.headers.origin!==url.origin)return json(403,{error:'Cross-origin requests are not allowed.'});
   if(req.method==='GET'&&url.pathname==='/api/generation')return json(200,{available:Boolean(apiKey),provider:'OpenAI',model});
   if(req.method!=='POST'||url.pathname!=='/api/generate')return json(404,{error:'Not found.'});
   if(!apiKey)return json(503,{error:'Set OPENAI_API_KEY on the local server, then restart it.'});
   if(req.headers['content-type']!=='application/json')return json(415,{error:'JSON is required.'});
   if(busy)return json(429,{error:'A draft is already being generated. Please wait.'});
   let body;try{
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>512000)return json(413,{error:'This journal is too large for this generation preview (500 KB of text).'});chunks.push(chunk)}
    body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(body.consent!==true)return json(400,{error:'Explicit consent is required before sending data to OpenAI.'});
    validateGenerationSource(body.source);
   }catch{return json(400,{error:'Invalid generation request. Include at least one written memory and valid source data.'})}
   busy=true;
   try{
    const response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},signal:AbortSignal.timeout(120000),body:JSON.stringify({model,store:false,instructions:generationInstructions,input:JSON.stringify(body.source),max_output_tokens:10000,text:{format:{type:'json_schema',name:'miniography_draft',strict:true,schema:draftSchema(body.source)}}})});
    if(!response.ok){const message=response.status===401?'The server’s OpenAI API key was rejected.':response.status===429?'OpenAI’s rate or usage limit was reached. Check your API billing and try again.':'OpenAI could not generate a draft. Please try again later.';return json(502,{error:message})}
    const result=await response.json();
    if(result.status!=='completed')return json(502,{error:'Generation did not finish. Try a shorter journal or another model.'});
    const content=(result.output||[]).flatMap(item=>item.content||[]);
    if(content.some(item=>item.type==='refusal'))return json(422,{error:'OpenAI declined this generation request. Your entries are unchanged.'});
    const text=content.filter(item=>item.type==='output_text').map(item=>item.text).join('');
    const draft=validateGeneratedDraft(JSON.parse(text),body.source);
    return json(200,{draft,model,generatedAt:new Date().toISOString()});
   }catch{return json(502,{error:'Generation failed or timed out. Your entries and any previous draft are unchanged.'})}
   finally{busy=false}
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return}
  try{
   const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
   if(!path.startsWith(root+sep)){res.writeHead(403).end();return}
   const bytes=await readFile(path);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404).end()}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||8123);
 createDevServer().listen(port,'127.0.0.1',()=>console.log(`Dear December: http://127.0.0.1:${port}\nAPI generation ${process.env.OPENAI_API_KEY?'configured':'disabled — set OPENAI_API_KEY to enable'}.`));
}
