import {generationSource,validateGeneratedDraft} from './generation-core.js';
let generationConfig=null,preview=null,generated=null,generating=false,controller=null;
const dialog=document.createElement('dialog');dialog.id='generationDialog';
dialog.innerHTML=`<button class="close" aria-label="Close generation preview">×</button><h2>Create your miniography</h2>
<p>Turn your entries into a short, editable first-person draft. Review it for mistakes before keeping or printing it. Your original entries stay unchanged.</p>
<section id="generationConsent"><h3>Before anything leaves this device</h3>
<p>This optional step sends your basic facts, questions, answers, recording dates, and photo descriptions/captions to <strong>OpenAI</strong> through this local server. <strong>Image files stay on your device.</strong> API usage is billed to the configured key.</p>
<p>We request that the response is not stored (<code>store: false</code>). OpenAI does not train on API data by default unless you opt in. Abuse-monitoring logs may retain content for up to 30 days, with exceptions. This is not a promise of zero retention. <a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noopener noreferrer">Read OpenAI’s data policy</a>.</p>
<p id="generationModel" class="hint"></p><details><summary>Preview exactly which journal data will be sent</summary><pre id="generationPayload"></pre></details>
<p id="generationReplace" class="hint" hidden>A successful new generation will replace the draft below, including your edits. Download it first if you want to keep it.</p>
<label class="generation-check"><input type="checkbox" id="generationAgree"> I agree to send this journal data to OpenAI to generate a draft.</label>
<button class="primary" id="generationSubmit" disabled>Send to OpenAI & generate draft</button> <button id="generationLocal">Keep my entries local</button></section>
<p id="generationStatus" role="status" aria-live="polite"></p><section id="generationResult" hidden><h3>Review your draft</h3><p class="hint">Edited here only. This draft lasts until you reload or leave this page; it is not included in your journal archive. Download it to keep your draft and its sources.</p><p id="generationStale" class="hint" hidden>Your journal has changed since this draft was generated. The draft and its source links still refer to the earlier snapshot.</p><div id="generationNotes"></div><div id="generationSections"></div><button class="primary" id="generationPrint">Print draft / Save as PDF ↗</button> <button id="generationDownload">Download draft & sources ↓</button></section>`;
document.body.append(dialog);
const button=document.createElement('button');button.id='generationButton';button.hidden=true;button.textContent='Create an AI draft (optional)';button.onclick=openGeneration;
$('storyDialog').append(button);
async function loadGenerationConfig(){
 if(!isDevelopmentHost)return;
 try{const response=await fetch('/api/generation',{cache:'no-store'});if(!response.ok)return;const config=await response.json();if(config.provider!=='OpenAI')return;generationConfig=config;button.hidden=false}catch{}
}
function currentSource(){commitAndSave();return generationSource(state)}
function refreshPreview(){preview=currentSource();$('generationPayload').textContent=JSON.stringify(preview,null,2);$('generationAgree').checked=false;$('generationSubmit').disabled=true}
function openGeneration(){
 if(!keepsakeRevealed&&!developmentCalendar())return;
 refreshPreview();$('generationModel').textContent=`Provider: OpenAI · Model: ${generationConfig.model}${generationConfig.available?'':' · Not configured: set OPENAI_API_KEY and restart the local server.'}`;
 $('generationReplace').hidden=!generated;$('generationStale').hidden=!generated||JSON.stringify(currentSource())===JSON.stringify(generated.source);$('generationStatus').textContent='';
 storyDialog.close();dialog.showModal();
}
$('generationAgree').onchange=()=>{$('generationSubmit').disabled=!$('generationAgree').checked||!generationConfig?.available||generating};
function closeGeneration(){controller?.abort();dialog.close();story()}
dialog.querySelector('.close').onclick=closeGeneration;$('generationLocal').onclick=closeGeneration;
dialog.addEventListener('cancel',event=>{event.preventDefault();closeGeneration()});
$('generationSubmit').onclick=async()=>{
 if(generating||!$('generationAgree').checked||!generationConfig?.available)return;
 if(JSON.stringify(currentSource())!==JSON.stringify(preview)){refreshPreview();$('generationStatus').textContent='Your entries changed. Please review the updated data and consent again.';return}
 const collection=structuredClone(state),assets={...media},source=structuredClone(preview);
 generating=true;controller=new AbortController();$('generationSubmit').disabled=true;$('generationAgree').disabled=true;$('generationStatus').textContent='Creating your draft… You can close this window; the provider may still finish and charge for the request.';
 try{
  const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({consent:true,source})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Generation failed. Please try again.');
  validateGeneratedDraft(result.draft,source);
  generated={...result,source,collection,assets};renderDraft();$('generationStatus').textContent='Your draft is ready. Check the wording and sources; AI can make mistakes.';
 }catch(error){$('generationStatus').textContent=error.name==='AbortError'?'Stopped waiting for the draft. Your entries are unchanged.':error.message}
 finally{generating=false;controller=null;$('generationAgree').disabled=false;$('generationAgree').checked=false;$('generationSubmit').disabled=true}
};
function renderDraft(){
 $('generationResult').hidden=false;$('generationReplace').hidden=false;$('generationSections').replaceChildren();$('generationNotes').replaceChildren();
 if(generated.draft.reviewNotes.length){const title=document.createElement('h4');title.textContent='Things to check';$('generationNotes').append(title);for(const note of generated.draft.reviewNotes){const p=document.createElement('p');p.textContent=note;$('generationNotes').append(p)}}
 for(const [index,section]of generated.draft.sections.entries()){
  const row=document.createElement('section');row.className='generated-section';const heading=document.createElement('input');heading.value=section.heading;heading.setAttribute('aria-label',`Section ${index+1} heading`);heading.oninput=()=>{section.heading=heading.value};
  const text=document.createElement('textarea');text.rows=8;text.value=section.text;text.setAttribute('aria-label',`Section ${index+1} text`);text.oninput=()=>{section.text=text.value};
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Compare with original sources';details.append(summary);
  for(const id of section.sourceIds){const pre=document.createElement('pre');pre.textContent=id==='profile'?JSON.stringify(generated.source.profile,null,2):JSON.stringify(generated.source.entries.find(entry=>entry.id===id),null,2);details.append(pre)}
  row.append(heading,text,details);$('generationSections').append(row);
 }
}
$('generationDownload').onclick=()=>{
 if(!generated)return;
 // Includes the snapshot used for traceability, but no image bytes or credentials.
 const {draft,source,model,generatedAt}=generated;
 downloadBlob(new Blob([JSON.stringify({draftFormatVersion:1,provider:'OpenAI',model,generatedAt,draft,source},null,2)],{type:'application/json'}),'my-miniography-draft.json');
};
$('generationPrint').onclick=async()=>{
 if(!generated)return;dialog.close();
 const sheet=preparePrintStory(generated.collection,generated.assets);
 while(sheet.children.length>1)sheet.lastElementChild.remove();
 const append=(parent,tag,value)=>{const element=document.createElement(tag);element.textContent=value;parent.append(element);return element};
 append(sheet.firstElementChild,'p','AI-assisted draft').className='print-disclaimer';
 const placed=new Set();
 const photo=(entry)=>{if(placed.has(entry))return;placed.add(entry);const figure=document.createElement('figure');figure.className='print-photo';const image=new Image();image.src=generated.assets[entry.filePath];image.alt=entry.description||entry.caption||'Memory photograph';figure.append(image);if(entry.caption)append(figure,'figcaption',entry.caption);sheet.append(figure)};
 for(const section of generated.draft.sections){const chapter=document.createElement('section');chapter.className='print-chapter';if(section.heading)append(chapter,'h2',section.heading);append(chapter,'p',section.text).style.whiteSpace='pre-wrap';sheet.append(chapter);for(const id of section.sourceIds){const index=Number(id.replace('entry-',''))-1;const entry=generated.collection.entries[index];if(entry?.type==='photo')photo(entry)}}
 for(const entry of generated.collection.entries)if(entry.type==='photo')photo(entry);
 await Promise.all([...sheet.querySelectorAll('img')].map(image=>image.decode().catch(()=>{})));window.print();
};
loadGenerationConfig();
