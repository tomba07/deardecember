// The calendar uses a view of generic records. Only tagged records are persisted/exported.
const formatContexts=new WeakMap(),formatEntryContexts=new WeakMap();
const factTags={name:'person:name',dateOfBirth:'person:date-of-birth',placeOfBirth:'person:place-of-birth',placesLived:'person:places-lived'};
const contextTags=['question','topic','photo:context','photo:caption','photo:taken-at'];
function taggedManifest(collection){
 if(!Object.hasOwn(collection,'profile'))return structuredClone(collection);
 const context=formatContexts.get(collection),records=[],used=new Set();
 const original=context?.manifest.entries||[];
 const idFor=(record,fallback)=>record?.id||fallback;
 const put=(record,changes)=>{const result={...record,...changes},index=records.findIndex(item=>item.id===result.id);if(index<0)records.push(result);else records[index]=result;used.add(result.id);return result};
 for(const [key,tag]of Object.entries(factTags)){
  const record=original.find(item=>item.tags.includes(tag)&&typeof item.text==='string');if(record)used.add(record.id);
  if(collection.profile[key]?.trim())put(record,{id:idFor(record,crypto.randomUUID()),tags:record?.tags||[tag],text:collection.profile[key]});
 }
 let lastTextId=null;
 collection.entries.forEach((entry,index)=>{
  let meta=formatEntryContexts.get(entry);if(!meta){meta={id:crypto.randomUUID()};formatEntryContexts.set(entry,meta)}
  const base=meta.record,id=meta.id;
  const dates={...(entry.createdAt?{createdAt:entry.createdAt}:{}),...(entry.modificationDates?{modificationDates:[...entry.modificationDates]}:{})};
  const primary=entry.type==='photo'?{filePath:entry.filePath}:{text:entry.text};
  if(entry.type==='text'&&!entry.text.trim())return;
  const tags=[...(base?.tags||(entry.type==='photo'?['photo']:['reflection']))];
  // Calendar association is an app-specific plain tag, not a schema field.
  const binding=typeof entryBinding==='function'?entryBinding(entry):{};
  if(Number.isInteger(binding.day)&&!tags.some(tag=>tag.startsWith('dear-december:door:')))tags.push(`dear-december:door:${binding.day+1}`);
  const primaryRecord=put(base,{id,tags,...primary,...dates,...(entry.type==='photo'&&!base?.relatedTo&&lastTextId?{relatedTo:[lastTextId]}:{})});if(entry.type==='text')lastTextId=id;
  const updatedAux=[];
  const values=entry.type==='photo'?{'photo:context':entry.description,'photo:caption':entry.caption,'photo:taken-at':entry.takenAt}:{question:entry.question,topic:entry.topic};
  for(const [tag,text]of Object.entries(values)){
   const old=meta.aux?.find(record=>record.tags.find(label=>contextTags.includes(label))===tag);if(old)used.add(old.id);
   if(typeof text==='string'&&text.trim())updatedAux.push(put(old,{id:idFor(old,crypto.randomUUID()),tags:old?.tags||[tag],text,relatedTo:old?.relatedTo||[id]}));
  }
  formatEntryContexts.set(entry,{id,record:primaryRecord,aux:updatedAux});
 });
 // Preserve records from other applications and contexts the calendar does not edit.
 for(const record of original)if(!used.has(record.id)&&!context?.managed.has(record.id))records.push(structuredClone(record));
 const remaining=new Set(records.map(record=>record.id));for(const record of records)if(record.relatedTo)record.relatedTo=record.relatedTo.filter(id=>remaining.has(id));
 const manifest={formatVersion:1,language:collection.language,...(Object.hasOwn(collection,'isSample')?{isSample:collection.isSample}:{}),entries:records};
 formatContexts.set(collection,{manifest:structuredClone(manifest),managed:used});return manifest;
}
function calendarCollection(manifest){
 if(Object.hasOwn(manifest,'profile'))return manifest; // Legacy archive, validated separately.
 const collection={formatVersion:1,language:manifest.language,...(Object.hasOwn(manifest,'isSample')?{isSample:manifest.isSample}:{}),profile:{name:'',dateOfBirth:'',placeOfBirth:''},entries:[]};
 const managed=new Set();
 for(const [key,tag]of Object.entries(factTags)){
  const record=manifest.entries.find(item=>item.tags.includes(tag)&&typeof item.text==='string');
  if(record){collection.profile[key]=record.text;managed.add(record.id)}
 }
 const auxiliary=manifest.entries.filter(record=>typeof record.text==='string'&&record.tags.some(tag=>contextTags.includes(tag)));
 for(const record of manifest.entries){
  if(managed.has(record.id)||(typeof record.text==='string'&&record.tags.some(tag=>Object.values(factTags).includes(tag)))||auxiliary.includes(record))continue;
  const candidates=auxiliary.filter(item=>item.relatedTo?.includes(record.id));
  const aux=[...new Set(contextTags.map(tag=>candidates.find(item=>item.tags.find(label=>contextTags.includes(label))===tag)).filter(Boolean))];
  const value=tag=>aux.find(item=>item.tags.find(label=>contextTags.includes(label))===tag)?.text;
  const dates={...(record.createdAt?{createdAt:record.createdAt}:{}),modificationDates:record.modificationDates||[]};
  const entry=record.filePath?{type:'photo',description:value('photo:context')||'',...(value('photo:caption')?{caption:value('photo:caption')}:{}),...(value('photo:taken-at')?{takenAt:value('photo:taken-at')}:{}),filePath:record.filePath,...dates}:{type:'text',question:value('question')||null,...(value('topic')?{topic:value('topic')}:{}),text:record.text,...dates};
  collection.entries.push(entry);managed.add(record.id);aux.forEach(item=>managed.add(item.id));formatEntryContexts.set(entry,{id:record.id,record,aux});
 }
 formatContexts.set(collection,{manifest:structuredClone(manifest),managed});return collection;
}
