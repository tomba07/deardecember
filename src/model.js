const isDevelopmentHost=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const DOCUMENT_KEY='miniography-document-v1';
function emptyCollection(){return {formatVersion:1,language:'en',profile:{name:'',dateOfBirth:'',placeOfBirth:'',placesLived:''},entries:[]}}
let state=emptyCollection(), media=Object.create(null), entryBindings=new WeakMap(), pendingEdits=new Map(), isSimulation=false, keepsakeRevealed=false, openedDoors=[], generatedDraft=null;
function entryContent(entry){const {createdAt,modificationDates,...content}=entry;return JSON.stringify(content)}
function timestampAfter(previous){return new Date(Math.max(Date.now(),Date.parse(previous||'')+1||0)).toISOString()}
function bindEntry(entry,binding){entryBindings.set(entry,binding);return entry}
function entryBinding(entry){return entryBindings.get(entry)||{}}
function addTextEntry(text,{topic,question=null,binding={}}={}){
 const entry={type:'text',...(topic?{topic}:{}),question,text,createdAt:new Date().toISOString(),modificationDates:[]};
 state.entries.push(bindEntry(entry,binding));pendingEdits.set(entry,{original:entryContent(entry),isNew:true});return entry;
}
function updateEntry(entry,changes){
 if(!pendingEdits.has(entry))pendingEdits.set(entry,{original:entryContent(entry),isNew:false});
 Object.assign(entry,changes);
}
function commitEdits(){
 for(const [entry,pending] of pendingEdits){
  if(!state.entries.includes(entry))continue;
  if(entry.type==='text'&&!entry.text.trim()){state.entries.splice(state.entries.indexOf(entry),1);continue}
  if(!pending.isNew&&pending.original!==entryContent(entry))entry.modificationDates.push(timestampAfter(entry.modificationDates.at(-1)||entry.createdAt));
 }
 pendingEdits.clear();
}
function readGeneratedDraft(value){
 if(!value||typeof value.markdown!=='string'||value.markdown.length>100000)return null;
 return {markdown:value.markdown,model:typeof value.model==='string'?value.model.slice(0,200):'',generatedAt:typeof value.generatedAt==='string'?value.generatedAt:'',updatedAt:typeof value.updatedAt==='string'?value.updatedAt:'',source:value.source&&typeof value.source==='object'?value.source:null,journalSource:value.journalSource&&typeof value.journalSource==='object'?value.journalSource:null};
}
function storedDocument(){return {collection:state,media,generatedDraft,keepsakeRevealed,openedDoors,bindings:state.entries.map(entry=>entryBinding(entry)),pending:state.entries.map(entry=>pendingEdits.get(entry)||null)}}
function persistDocument(document=storedDocument()){
 if(!isSimulation)localStorage.setItem(DOCUMENT_KEY,JSON.stringify(document));
}
function restoreDocument(document){
 generatedDraft=readGeneratedDraft(document.generatedDraft);
 state=document.collection;keepsakeRevealed=Boolean(document.keepsakeRevealed);openedDoors=Array.isArray(document.openedDoors)?document.openedDoors.filter(day=>Number.isInteger(day)&&day>=0&&day<24):[];media=Object.assign(Object.create(null),document.media||{});entryBindings=new WeakMap();pendingEdits=new Map();
 state.entries.forEach((entry,index)=>{bindEntry(entry,document.bindings?.[index]||{});if(document.pending?.[index])pendingEdits.set(entry,document.pending[index])});
 window.refreshSavedGeneration?.();
}
try{
 const saved=JSON.parse(localStorage.getItem(DOCUMENT_KEY)||'null');
 if(saved){
  // Draft profile fields may be incomplete, but stored entries must follow the schema.
  const candidate=structuredClone(saved.collection);candidate.profile={...candidate.profile,name:candidate.profile.name||'Draft',dateOfBirth:candidate.profile.dateOfBirth||'1900-01-01',placeOfBirth:candidate.profile.placeOfBirth||'Draft'};
  candidate.entries=candidate.entries.filter(entry=>entry.type!=='text'||entry.text?.trim());
  if(!validateManifest(candidate))throw Error('Invalid stored collection');restoreDocument(saved);commitEdits();persistDocument();
 }
}catch(error){console.warn('Could not restore the saved collection; its storage has been left intact.',error)}
