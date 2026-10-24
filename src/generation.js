import {renderMarkdown} from './markdown.js';
import {generationSource,generationSourceText,miniBiographyPrompt,validateGenerationSource,validateGeneratedMarkdown} from './generation-core.js';
let generationConfig=null,preview=null,sourceEdited=false,generating=false,controller=null;
const dialog=document.createElement('dialog');dialog.id='generationDialog';
dialog.innerHTML=`<button class="close" aria-label="Close generation">×</button><button type="button" class="dialog-back" id="generationBack">← Back</button><h2 id="generationTitle">Create your mini biography</h2>
<p>Make a short, editable text from your entries. This sends your writing and photo context to <strong>OpenAI</strong>. Photos stay on your device. API usage is billed to the configured key.</p>
<details><summary>Data-sharing and privacy details</summary><p>Your basic facts, questions, answers, recording dates, and photo descriptions/captions are sent through the local server. Original entries stay unchanged.</p><p>OpenAI does not train on API data by default unless you opt in. We request no response storage, but abuse-monitoring logs may retain content for up to 30 days, with exceptions. <a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noopener noreferrer">OpenAI’s data policy</a>.</p><p id="generationModel" class="hint"></p></details>
<details id="generationInputDetails"><summary>Review and edit what gets sent</summary><p class="hint">This copy is sent to OpenAI. Remove or change anything you like here; your original journal stays unchanged.</p><label for="generationPayload">Text to send</label><textarea id="generationPayload" spellcheck="true" maxlength="450000"></textarea><button type="button" id="generationResetInput">Reset from my journal</button></details>
<p id="generationReplace" class="hint" hidden>Regenerating replaces your saved text and edits. Download your current Markdown first if you want to keep it.</p>
<label class="generation-check"><input type="checkbox" id="generationAgree"> I agree to send this journal data to OpenAI.</label>
<button class="primary" id="generationSubmit" disabled>Generate my text</button> <button id="generationLocal">Cancel</button><button id="generationOwnLlm">Use my own AI instead</button>
<div id="generationLoading" class="generation-loading" role="status" aria-live="polite" hidden><span class="generation-spinner" aria-hidden="true"></span><span id="generationLoadingText">Creating your text…</span></div>
<p id="generationStatus" role="status" aria-live="polite"></p>`;
const textDialog=document.createElement('dialog');textDialog.id='miniographyDialog';
textDialog.innerHTML=`<button class="close" aria-label="Close my text">×</button><button type="button" class="dialog-back" id="savedTextBack">← Back</button><h2>Your mini biography</h2><p class="hint">Saved in this browser. Read it through before keeping or sharing it; AI can make mistakes.</p><section id="generationResult" hidden><p id="generationStorage" class="hint" role="status"></p><p id="generationStale" class="hint" hidden>Your journal has changed since this text was generated.</p><label for="generationMarkdown">Your text (Markdown)</label><textarea id="generationMarkdown" spellcheck="true"></textarea><details><summary>Preview formatting</summary><div id="generationPreview" class="markdown-content"></div></details><div class="text-actions"><button class="primary" id="generationDownload">Download Markdown ↓</button><button id="generationPrint">Convert to PDF / Print ↗</button><button id="generationRegenerate">Regenerate text</button><button id="savedOwnLlm">Use my own AI</button></div><p class="hint">Keep a downloaded copy too. Journal archive downloads contain your original entries; photos follow the text when printing.</p></section>`;
document.body.append(dialog,textDialog);
async function loadGenerationConfig(){
 if(!isDevelopmentHost)return;
 try{const response=await fetch('/api/generation',{cache:'no-store'});if(!response.ok)return;const config=await response.json();if(config.provider!=='OpenAI')return;generationConfig=config;refreshSavedGeneration();refreshRevealGeneration()}catch{}
}
function currentSource(){commitAndSave();return generationSource(state)}
function resetGenerationConsent(){$('generationAgree').checked=false;$('generationSubmit').disabled=true}
function refreshPreview(){preview=currentSource();sourceEdited=false;$('generationPayload').value=generationSourceText(preview);resetGenerationConsent()}
$('generationPayload').oninput=()=>{sourceEdited=true;resetGenerationConsent();$('generationStatus').textContent='Text updated. Please agree again before sending.'};
$('generationResetInput').onclick=()=>{refreshPreview();$('generationStatus').textContent='Restored a fresh copy from your journal.'};
function openGeneration(){
 if(!keepsakeRevealed&&!developmentCalendar())return;
 if(generatedDraft)openSavedText();else openGenerationConsent();
}
function updateDialogBackLabels(){for(const button of document.querySelectorAll('.dialog-back'))button.textContent=lang==='de'?'← Zurück':'← Back'}
function openGenerationConsent(){
 updateDialogBackLabels();
 if(!keepsakeRevealed&&!developmentCalendar())return;
 refreshPreview();$('generationModel').textContent=`OpenAI · ${generationConfig?.model||'not configured'}`;
 $('generationTitle').textContent=generatedDraft?'Regenerate your text':'Create your mini biography';
 $('generationSubmit').textContent=generatedDraft?'Regenerate my text':'Generate my text';
 $('generationLocal').textContent=generatedDraft?'Back to my text':'Cancel';
 $('generationReplace').hidden=!generatedDraft;$('generationStatus').textContent='';
 textDialog.close();$('revealDialog').close();dialog.showModal();
}
function openSavedText(){
 updateDialogBackLabels();
 if(!generatedDraft)return;
 dialog.close();$('revealDialog').close();renderDraft();
 $('generationStale').hidden=JSON.stringify(currentSource())===JSON.stringify(generatedDraft.journalSource||generatedDraft.source);
 $('generationRegenerate').disabled=!generationConfig?.available||generating;
 $('generationRegenerate').title=generationConfig?.available?'':'Connect the local API server to generate again.';
 if(!textDialog.open)textDialog.showModal();
}
$('generationAgree').onchange=()=>{$('generationSubmit').disabled=!$('generationAgree').checked||!generationConfig?.available||generating};
function closeGeneration(){controller?.abort();dialog.close();if(generatedDraft)openSavedText();else story()}
function closeSavedText(){textDialog.close();story()}
$('generationBack').onclick=closeGeneration;
dialog.querySelector('.close').onclick=closeGeneration;$('generationLocal').onclick=closeGeneration;
dialog.addEventListener('cancel',event=>{event.preventDefault();closeGeneration()});
$('savedTextBack').onclick=closeSavedText;
textDialog.querySelector('.close').onclick=closeSavedText;
textDialog.addEventListener('cancel',event=>{event.preventDefault();closeSavedText()});
$('generationRegenerate').onclick=openGenerationConsent;
function setGenerationLoading(active){
 $('generationLoading').hidden=!active;
 $('generationLoadingText').textContent=lang==='de'?'Dein Text entsteht…':'Creating your text…';
 $('generationSubmit').setAttribute('aria-busy',String(active));
 $('generationSubmit').textContent=active?(lang==='de'?'Wird erstellt…':'Generating…'):(generatedDraft?'Regenerate my text':'Generate my text');
}
$('generationSubmit').onclick=async()=>{
 if(generating||!$('generationAgree').checked||!generationConfig?.available)return;
 if(JSON.stringify(currentSource())!==JSON.stringify(preview)){if(sourceEdited){preview=currentSource();resetGenerationConsent()}else refreshPreview();$('generationStatus').textContent='Your journal changed. Review the text to send and agree again.';return}
 const activeDocument=state,journalSource=structuredClone(preview),source={language:preview.language,profile:{},entries:[{id:'entry-1',type:'text',question:null,text:$('generationPayload').value}]};
 try{validateGenerationSource(source);if(new TextEncoder().encode(JSON.stringify({consent:true,source})).length>512000)throw Error('Please shorten the text to send (maximum 500 KB).')}catch(error){$('generationStatus').textContent=source.entries[0].text.trim()?error.message:'Add some text before generating.';return}
 generating=true;setGenerationLoading(true);controller=new AbortController();$('generationSubmit').disabled=true;$('generationAgree').disabled=true;$('generationPayload').disabled=true;$('generationResetInput').disabled=true;$('generationStatus').textContent='You can close this window; the provider may still finish and charge for the request.';
 try{
  const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({consent:true,source})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Generation failed. Please try again.');
  validateGeneratedMarkdown(result.markdown);
  if(state!==activeDocument)throw Error('The journal changed while generating. Open the current journal and try again.');
  generatedDraft={...result,source,journalSource,updatedAt:result.generatedAt};persistGeneratedDraft();refreshSavedGeneration();openSavedText();
 }catch(error){$('generationStatus').textContent=error.name==='AbortError'?'Stopped waiting for the draft. Your entries are unchanged.':error.message}
 finally{generating=false;setGenerationLoading(false);controller=null;$('generationAgree').disabled=false;$('generationPayload').disabled=false;$('generationResetInput').disabled=false;$('generationAgree').checked=false;$('generationSubmit').disabled=true;$('generationRegenerate').disabled=!generationConfig?.available}
};
function renderDraft(){
 $('generationResult').hidden=false;$('generationMarkdown').value=generatedDraft.markdown;
 $('generationPreview').innerHTML=renderMarkdown(generatedDraft.markdown);
}
$('generationMarkdown').oninput=()=>{if(!generatedDraft)return;generatedDraft.markdown=$('generationMarkdown').value;generatedDraft.updatedAt=new Date().toISOString();persistGeneratedDraft();$('generationPreview').innerHTML=renderMarkdown(generatedDraft.markdown)};
$('generationDownload').onclick=()=>{
 if(!generatedDraft)return;
 downloadBlob(new Blob([generatedDraft.markdown],{type:'text/markdown;charset=utf-8'}),'my-mini-biography.md');
};
$('generationPrint').onclick=async()=>{
 if(!generatedDraft)return;textDialog.close();
 const sheet=preparePrintStory();
 while(sheet.children.length>1)sheet.lastElementChild.remove();
 const append=(parent,tag,value)=>{const element=document.createElement(tag);element.textContent=value;parent.append(element);return element};
 append(sheet.firstElementChild,'p','AI-assisted draft').className='print-disclaimer';
 const content=document.createElement('section');content.className='markdown-content';content.innerHTML=renderMarkdown(generatedDraft.markdown);sheet.append(content);
 const photo=(entry)=>{const figure=document.createElement('figure');figure.className='print-photo';const image=new Image();image.src=media[entry.filePath];image.alt=entry.description||entry.caption||'Memory photograph';figure.append(image);if(entry.caption)append(figure,'figcaption',entry.caption);sheet.append(figure)};
 for(const entry of state.entries)if(entry.type==='photo'&&media[entry.filePath])photo(entry);
 await Promise.all([...sheet.querySelectorAll('img')].map(image=>image.decode().catch(()=>{})));window.print();
};
function persistGeneratedDraft(){
 const saved=save();$('generationStorage').textContent=window.accountPersistence?.enabled&&!isSimulation?'Saving to your account…':saved?(isSimulation?'Sample text is temporary; download it to keep it.':''):'Could not save in this browser. Download your Markdown now to keep these edits.';
}
function refreshSavedGeneration(){
 if(!generatedDraft){$('generationResult').hidden=true;textDialog.close();if(dialog.open)dialog.close()}else if(textDialog.open)renderDraft();
 $('generationRegenerate').disabled=!generationConfig?.available||generating;
 refreshRevealGeneration();
}
window.refreshSavedGeneration=refreshSavedGeneration;
refreshSavedGeneration();
loadGenerationConfig();

function refreshRevealGeneration(){
 const available=Boolean(generationConfig?.available||generatedDraft);
 $('revealGenerate').disabled=!available;
 $('revealGenerate').textContent=generatedDraft?(lang==='de'?'Meinen erstellten Text öffnen ↗':'Open my saved text ↗'):(lang==='de'?'Meinen Text erstellen ↗':'Create my text ↗');
 $('revealGenerationHint').textContent=generatedDraft?(window.accountPersistence?.enabled?(lang==='de'?'Dein Text wird in deinem Konto gespeichert. Du kannst ihn bearbeiten, herunterladen und drucken.':'Your text is saved to your account. You can edit, download and print it.'):(lang==='de'?'Dein Text ist lokal gespeichert. Du kannst ihn bearbeiten, herunterladen und drucken.':'Your text is saved locally. You can edit, download and print it.')):available?'':(lang==='de'?'Die integrierte KI-Erstellung ist noch nicht eingerichtet. Du kannst trotzdem deine eigene KI nutzen.':'Built-in generation is not set up here. You can still use your own AI.');
}
window.refreshRevealGeneration=refreshRevealGeneration;
$('revealGenerate').onclick=()=>{if(!generationConfig?.available&&!generatedDraft)return;$('revealDialog').close();openGeneration()};
refreshRevealGeneration();

// A fully local alternative: take the same writing instructions to any chosen model.
const ownDialog=document.createElement('dialog');ownDialog.id='ownLlmDialog';ownDialog.setAttribute('aria-labelledby','ownLlmTitle');
ownDialog.innerHTML=`<button class="close" aria-label="Close prompt">×</button><button type="button" class="dialog-back" id="ownLlmBack">← Back</button><h2 id="ownLlmTitle">Use your preferred AI</h2><p id="ownLlmIntro"></p><p class="hint" id="ownLlmLocalHint"></p><div class="text-actions"><button class="primary" id="ownLlmCopy">Copy prompt & reflections</button><button id="ownLlmDownload">Download prompt ↓</button></div><details><summary id="ownLlmSourceTitle">Review and edit the reflections</summary><label for="ownLlmSource" id="ownLlmSourceLabel">Reflections to include</label><textarea id="ownLlmSource" maxlength="450000"></textarea><button id="ownLlmReset">Reset from my journal</button></details><details><summary id="ownLlmPromptTitle">View the complete prompt</summary><textarea id="ownLlmPrompt" readonly aria-label="Complete prompt"></textarea></details><p class="hint" id="ownLlmPrivacy"></p><details><summary id="ownLlmReturnTitle">Bring your result back</summary><label for="ownLlmResult" id="ownLlmResultLabel">Paste the Markdown from your AI</label><textarea id="ownLlmResult" maxlength="100000"></textarea><p class="hint" id="ownLlmReplace" hidden></p><button class="primary" id="ownLlmSave">Save my text</button></details><p id="ownLlmStatus" role="status" aria-live="polite"></p>`;
document.body.append(ownDialog);
let ownOrigin='reveal',ownJournalSource=null,ownDocument=null;
const ownLlmCopy={
 en:{ownLlmTitle:'Use your preferred AI',ownLlmIntro:'Copy the writing prompt and your reflections, then paste them into your favourite AI. No API key is needed here.',ownLlmLocalHint:'Local LLMs are a great option for privacy: when the model runs entirely on your device, your reflections can stay there too.',ownLlmCopy:'Copy prompt & reflections',ownLlmDownload:'Download prompt ↓',ownLlmSourceTitle:'Review and edit the reflections',ownLlmSourceLabel:'Reflections to include',ownLlmReset:'Reset from my journal',ownLlmPromptTitle:'View the complete prompt',ownLlmPrivacy:'Copying and downloading do not send data to an AI. If you paste it into an online service, that service’s privacy policy applies.',ownLlmReturnTitle:'Bring your result back',ownLlmResultLabel:'Paste the Markdown from your AI',ownLlmReplace:'Saving will replace your current mini biography and edits. Download your existing text first if you want to keep it.'},
 de:{ownLlmTitle:'Nutze deine bevorzugte KI',ownLlmIntro:'Kopiere die Schreibanweisung und deine Gedanken und füge sie in deine bevorzugte KI ein. Hierfür brauchst du keinen API-Schlüssel.',ownLlmLocalHint:'Lokale LLMs sind eine gute Möglichkeit für mehr Privatsphäre: Läuft das Modell vollständig auf deinem Gerät, können deine Gedanken dort bleiben.',ownLlmCopy:'Prompt und Gedanken kopieren',ownLlmDownload:'Prompt herunterladen ↓',ownLlmSourceTitle:'Gedanken prüfen und bearbeiten',ownLlmSourceLabel:'Diese Gedanken einfügen',ownLlmReset:'Aus meinem Tagebuch zurücksetzen',ownLlmPromptTitle:'Vollständigen Prompt ansehen',ownLlmPrivacy:'Kopieren und Herunterladen senden keine Daten an eine KI. Wenn du den Text in einen Onlinedienst einfügst, gelten dessen Datenschutzbedingungen.',ownLlmReturnTitle:'Dein Ergebnis zurückbringen',ownLlmResultLabel:'Markdown aus deiner KI hier einfügen',ownLlmReplace:'Speichern ersetzt deine bisherige Mini-Biografie und Änderungen. Lade deinen bisherigen Text vorher herunter, wenn du ihn behalten möchtest.'}
};
function refreshOwnPrompt(){$('ownLlmPrompt').value=miniBiographyPrompt($('ownLlmSource').value,ownJournalSource.language)}
function openOwnLlm(origin='reveal'){
 updateDialogBackLabels();
 if(!keepsakeRevealed&&!developmentCalendar())return;
 controller?.abort();ownDocument=state;ownOrigin=origin;ownJournalSource=structuredClone(origin==='generation'?preview:currentSource());
 for(const [id,text]of Object.entries(ownLlmCopy[lang]))$(id).textContent=text;
 $('ownLlmSource').value=origin==='generation'?$('generationPayload').value:generationSourceText(ownJournalSource);refreshOwnPrompt();
 $('ownLlmResult').value='';$('ownLlmReplace').hidden=!generatedDraft;$('ownLlmStatus').textContent='';
 $('ownLlmSave').textContent=lang==='de'?(generatedDraft?'Meinen Text ersetzen':'Meinen Text speichern'):(generatedDraft?'Replace my saved text':'Save my text');
 dialog.close();textDialog.close();$('revealDialog').close();resetGenerationConsent();ownDialog.showModal();
}
function closeOwnLlm(){ownDialog.close();if(ownOrigin==='generation')dialog.showModal();else if(ownOrigin==='saved'&&generatedDraft)openSavedText();else story()}
$('ownLlmBack').onclick=closeOwnLlm;
ownDialog.querySelector('.close').onclick=closeOwnLlm;ownDialog.addEventListener('cancel',event=>{event.preventDefault();closeOwnLlm()});
$('ownLlmSource').oninput=()=>{refreshOwnPrompt();$('ownLlmStatus').textContent=''};
$('ownLlmReset').onclick=()=>{ownJournalSource=currentSource();$('ownLlmSource').value=generationSourceText(ownJournalSource);refreshOwnPrompt()};
$('ownLlmCopy').onclick=async()=>{
 try{await navigator.clipboard.writeText($('ownLlmPrompt').value);$('ownLlmStatus').textContent=lang==='de'?'Prompt und Gedanken kopiert.':'Prompt and reflections copied.'}
 catch{$('ownLlmPrompt').closest('details').open=true;$('ownLlmPrompt').focus();$('ownLlmPrompt').select();$('ownLlmStatus').textContent=lang==='de'?'Bitte kopiere den ausgewählten Prompt manuell oder lade ihn herunter.':'Copy the selected prompt manually, or download it.'}
};
$('ownLlmDownload').onclick=()=>downloadBlob(new Blob([$('ownLlmPrompt').value],{type:'text/plain;charset=utf-8'}),'mini-biography-prompt.txt');
$('ownLlmSave').onclick=()=>{
 try{
  if(state!==ownDocument)throw Error('Your journal changed. Reopen the prompt before saving this result.');
  const markdown=validateGeneratedMarkdown($('ownLlmResult').value),now=new Date().toISOString();
  generatedDraft={markdown,model:'External AI',generatedAt:now,updatedAt:now,journalSource:structuredClone(ownJournalSource),source:{language:ownJournalSource.language,profile:{},entries:[{id:'entry-1',type:'text',question:null,text:$('ownLlmSource').value}]}};
  persistGeneratedDraft();ownDialog.close();refreshSavedGeneration();openSavedText();
 }catch(error){$('ownLlmStatus').textContent=error.message}
};
$('revealOwnLlm').onclick=()=>openOwnLlm();$('generationOwnLlm').onclick=()=>openOwnLlm('generation');$('savedOwnLlm').onclick=()=>openOwnLlm('saved');

window.applyAccountCopy?.();
