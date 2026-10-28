import validate from './manifest-validator.cjs';
export function validateDocument(value){
 if(!value||typeof value!=='object'||!validate(value.collection))throw Object.assign(Error('Invalid journal document.'),{status:400});
 const entries=value.collection.entries;if(entries.length>2000)throw Object.assign(Error('The journal exceeds 2,000 records.'),{status:413});
 try{new Intl.Locale(value.collection.language)}catch{throw Object.assign(Error('Invalid journal language.'),{status:400})}
 const ids=new Set();for(const entry of entries){if(ids.has(entry.id))throw Object.assign(Error('Duplicate record ID.'),{status:400});ids.add(entry.id)}
 for(const entry of entries){
  for(const id of entry.relatedTo||[])if(id===entry.id||!ids.has(id))throw Object.assign(Error('Invalid record link.'),{status:400});
  let previous=Date.parse(entry.createdAt);for(const date of entry.modificationDates||[]){if(!Number.isFinite(previous)||Date.parse(date)<=previous)throw Object.assign(Error('Invalid edit chronology.'),{status:400});previous=Date.parse(date)}
 }
 let generatedDraft=null;
 if(value.generatedDraft!=null){
  const draft=value.generatedDraft;if(typeof draft.markdown!=='string'||draft.markdown.length>100000)throw Object.assign(Error('Invalid generated text.'),{status:400});
  generatedDraft={markdown:draft.markdown,model:typeof draft.model==='string'?draft.model.slice(0,200):'',generatedAt:typeof draft.generatedAt==='string'?draft.generatedAt:'',updatedAt:typeof draft.updatedAt==='string'?draft.updatedAt:'',source:draft.source&&typeof draft.source==='object'?draft.source:null,journalSource:draft.journalSource&&typeof draft.journalSource==='object'?draft.journalSource:null};
 }
 return {calendarCatalog:value.calendarCatalog==='timeline-v1'?'timeline-v1':null,collection:value.collection,generatedDraft,keepsakeRevealed:value.keepsakeRevealed===true,biographyCardHidden:value.biographyCardHidden===true,openedDoors:Array.isArray(value.openedDoors)?[...new Set(value.openedDoors.filter(day=>Number.isInteger(day)&&day>=0&&day<24))]:[]};
}
