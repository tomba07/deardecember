const ARCHIVE_LIMITS={compressed:25e6,expanded:30e6,manifest:2e6,image:3e6,entries:2000,members:2100};
const IMAGE_TYPES={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
function validateCollection(collection){
 if(collection?.formatVersion!==1)throw Error('Unsupported archive format. Please use a journal archive with formatVersion 1.');
 if(!validateManifest(collection)){
  const error=validateManifest.errors[0];throw Error(`Invalid collection at ${error.instancePath||'/'}: ${error.message}.`);
 }
 try{new Intl.Locale(collection.language)}catch{throw Error('The collection language tag is invalid.')}
 if(collection.entries.length>ARCHIVE_LIMITS.entries)throw Error('This archive has more than 2,000 entries.');
 for(const entry of collection.entries){let previous=Date.parse(entry.createdAt);for(const date of entry.modificationDates){if(Date.parse(date)<=previous)throw Error('Entry modification dates must be chronological and later than creation.');previous=Date.parse(date)}}
}
// Inspect the raw central directory before JSZip can normalize paths or collapse duplicates.
function inspectZip(buffer){
 const bytes=new Uint8Array(buffer),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.length>ARCHIVE_LIMITS.compressed)throw Error('Please choose an archive smaller than 25 MB.');
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===bytes.length){end=i;break}}
 if(end<0)throw Error('This file is not a supported ZIP archive.');
 const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),offset=view.getUint32(end+16,true);
 if(view.getUint16(end+4,true)||view.getUint16(end+6,true)||view.getUint16(end+8,true)!==count||count===65535||count>ARCHIVE_LIMITS.members||offset+size!==end)throw Error('Multi-part, ZIP64 or oversized archives are not supported.');
 const members=new Map(),decoder=new TextDecoder('utf-8',{fatal:true});let cursor=offset,total=0;
 for(let i=0;i<count;i++){
  if(cursor+46>end||view.getUint32(cursor,true)!==0x02014b50)throw Error('Invalid ZIP directory.');
  const flags=view.getUint16(cursor+8,true),method=view.getUint16(cursor+10,true),expanded=view.getUint32(cursor+24,true),nameLength=view.getUint16(cursor+28,true),extraLength=view.getUint16(cursor+30,true),commentLength=view.getUint16(cursor+32,true),attributes=view.getUint32(cursor+38,true),localOffset=view.getUint32(cursor+42,true);
  if(cursor+46+nameLength+extraLength+commentLength>end)throw Error('Truncated ZIP directory.');
  const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLength));
  if(members.has(name))throw Error('Duplicate ZIP file names are not allowed.');
  if(!/^(miniography\.json|draft-backup\.json|README\.txt|schema\.json|media\/|media\/[A-Za-z0-9][A-Za-z0-9_-]*\.(jpg|jpeg|png|webp))$/.test(name))throw Error('The archive contains an unsupported or unsafe file path.');
  if((attributes>>>16&0xf000)===0xa000||(flags&1)||![0,8].includes(method))throw Error('Symlinks, encrypted files or unsupported compression are not allowed.');
  if(localOffset+30>offset||view.getUint32(localOffset,true)!==0x04034b50)throw Error('Invalid ZIP file header.');
  const localNameLength=view.getUint16(localOffset+26,true),localExtraLength=view.getUint16(localOffset+28,true);
  if(localOffset+30+localNameLength+localExtraLength>offset||decoder.decode(bytes.subarray(localOffset+30,localOffset+30+localNameLength))!==name||view.getUint16(localOffset+6,true)!==flags||view.getUint16(localOffset+8,true)!==method)throw Error('ZIP header names or flags do not match.');
  if(localOffset+30+localNameLength+localExtraLength+view.getUint32(cursor+20,true)>offset)throw Error('Invalid ZIP file size.');
  const limit=['miniography.json','draft-backup.json'].includes(name)?ARCHIVE_LIMITS.manifest:name.startsWith('media/')?ARCHIVE_LIMITS.image:ARCHIVE_LIMITS.manifest;
  if(expanded>limit||(total+=expanded)>ARCHIVE_LIMITS.expanded)throw Error('The expanded archive or one of its files exceeds the supported size.');
  members.set(name,{size:expanded,crc:view.getUint32(cursor+16,true)});cursor+=46+nameLength+extraLength+commentLength;
 }
 if(cursor!==end||Number(members.has('miniography.json'))+Number(members.has('draft-backup.json'))!==1)throw Error('The archive must contain exactly one journal or draft manifest.');
 return members;
}
async function imageIsValid(bytes,type){
 const header=new Uint8Array(bytes);
 const signatures={
  'image/jpeg':()=>header[0]===255&&header[1]===216&&header[2]===255,
  'image/png':()=>[137,80,78,71,13,10,26,10].every((value,index)=>header[index]===value),
  'image/webp':()=>String.fromCharCode(...header.slice(0,4))==='RIFF'&&String.fromCharCode(...header.slice(8,12))==='WEBP'
 };
 if(!signatures[type]?.())throw Error('A photo does not match its declared file type.');
 const blob=new Blob([bytes],{type});const bitmap=await createImageBitmap(blob).catch(()=>{throw Error('A photo could not be decoded.')});
 if(bitmap.width*bitmap.height>40e6){bitmap.close();throw Error('Photos must be smaller than 40 megapixels.')}bitmap.close();return blob;
}
function blobDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)})}
function zipCrc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
function readZipMember(zip,path,member){
 const file=zip.file(path);if(!file||!member)throw Error(`Missing file: ${path}`);
 return new Promise((resolve,reject)=>{
  let total=0,failed=false;const chunks=[],stream=file.internalStream('uint8array');
  stream.on('data',chunk=>{if(failed)return;total+=chunk.length;if(total>member.size){failed=true;stream.pause();reject(Error('Decompressed file exceeds its declared size.'));return}chunks.push(chunk)});
  stream.on('error',reject);stream.on('end',()=>{if(failed)return;if(total!==member.size){reject(Error('Decompressed file size does not match the ZIP directory.'));return}const result=new Uint8Array(total);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length}if(zipCrc32(result)!==member.crc){reject(Error('A file failed its ZIP integrity check.'));return}resolve(result)});stream.resume();
 });
}
async function readArchive(buffer){
 const members=inspectZip(buffer);const zip=await JSZip.loadAsync(buffer);
 const draft=members.has('draft-backup.json'),manifestPath=draft?'draft-backup.json':'miniography.json';
 const manifestBytes=await readZipMember(zip,manifestPath,members.get(manifestPath));if(manifestBytes.length!==members.get(manifestPath).size)throw Error('The manifest size does not match the ZIP directory.');
 const document=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(manifestBytes)),collection=draft?document.collection:document;
 if(draft)validateDraftCollection(collection);else validateCollection(collection);
 const assets=Object.create(null);
 for(const photo of collection.entries.filter(entry=>entry.type==='photo')){
  if(Object.hasOwn(assets,photo.filePath))continue;
  const member=members.get(photo.filePath),file=zip.file(photo.filePath);if(!member||!file)throw Error(`Missing photo: ${photo.filePath}`);
  const bytes=await readZipMember(zip,photo.filePath,member);if(bytes.length!==member.size||bytes.length>ARCHIVE_LIMITS.image)throw Error('The photo size is invalid.');
  const blob=await imageIsValid(bytes,IMAGE_TYPES[photo.filePath.split('.').pop()]);assets[photo.filePath]=await blobDataUrl(blob);
 }
 // Validate even unreferenced media, although only referenced originals are retained.
 for(const [path]of members){if(path.startsWith('media/')&&path!=='media/'&&!Object.hasOwn(assets,path)){const bytes=await readZipMember(zip,path,members.get(path));if(bytes.length!==members.get(path).size)throw Error('Invalid media size.');await imageIsValid(bytes,IMAGE_TYPES[path.split('.').pop()])}}
 return draft?{collection,media:assets,generatedDraft:readGeneratedDraft(document.generatedDraft)}:{collection,media:assets};
}
function validateDraftCollection(collection){
 const profile=collection?.profile;
 if(!profile||['name','dateOfBirth','placeOfBirth'].some(key=>typeof profile[key]!=='string'))throw Error('Invalid draft profile.');
 const candidate=structuredClone(collection);candidate.profile.name=profile.name.trim()?profile.name:'Draft';candidate.profile.dateOfBirth=profile.dateOfBirth||'1900-01-01';candidate.profile.placeOfBirth=profile.placeOfBirth.trim()?profile.placeOfBirth:'Draft';validateCollection(candidate);
}
async function readDraftBackup(buffer){
 if(buffer.byteLength>ARCHIVE_LIMITS.expanded)throw Error('The draft backup exceeds 30 MB.');
 const document=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer));
 if(!document.collection||!document.media||typeof document.media!=='object'||Array.isArray(document.media))throw Error('Invalid draft recovery backup.');
 const collection=document.collection;validateDraftCollection(collection);
 const assets=Object.create(null);let total=0;
 for(const photo of collection.entries.filter(entry=>entry.type==='photo')){
  if(Object.hasOwn(assets,photo.filePath))continue;
  const source=document.media[photo.filePath];if(typeof source!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(source))throw Error('Invalid draft photo.');
  const bytes=Uint8Array.from(atob(source.split(',')[1]),value=>value.charCodeAt(0));if(bytes.length>ARCHIVE_LIMITS.image||(total+=bytes.length)>ARCHIVE_LIMITS.expanded)throw Error('Draft photos exceed the size limit.');
  const blob=await imageIsValid(bytes,IMAGE_TYPES[photo.filePath.split('.').pop()]);assets[photo.filePath]=await blobDataUrl(blob);
 }
 return {collection,media:assets,generatedDraft:readGeneratedDraft(document.generatedDraft)};
}
async function createArchive(collection,assets,{draftDocument=null}={}){
 if(draftDocument)validateDraftCollection(collection);else validateCollection(collection);
 const json=JSON.stringify(draftDocument?{...draftDocument,collection,media:undefined}:collection,null,2);if(new TextEncoder().encode(json).length>ARCHIVE_LIMITS.manifest)throw Error('The collection manifest exceeds 2 MB.');
 const zip=new JSZip();zip.file(draftDocument?'draft-backup.json':'miniography.json',json);let total=new TextEncoder().encode(json).length;
 for(const path of new Set(collection.entries.filter(entry=>entry.type==='photo').map(entry=>entry.filePath))){
  const source=assets[path];if(!source)throw Error(`Missing original photo: ${path}`);
  const bytes=Uint8Array.from(atob(source.split(',')[1]||''),value=>value.charCodeAt(0));
  if(bytes.length>ARCHIVE_LIMITS.image||(total+=bytes.length)>ARCHIVE_LIMITS.expanded)throw Error('The photos exceed the archive size limit.');
  await imageIsValid(bytes,IMAGE_TYPES[path.split('.').pop()]);zip.file(path,bytes);
 }
 zip.file('README.txt',draftDocument?'Dear December draft backup\nOpen this ZIP in Dear December to restore unfinished entries, original photos and saved generated text.\ndraft-backup.json holds the journal data; media/ contains the image files.':'Personal journal archive, formatVersion 1\nminiography.json contains your profile and ordered original text/photo entries.\nPhotos in media/ follow the text they illustrate. createdAt is the date added; modificationDates records later edits.\nOpen this archive with any ZIP reader.');
 const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});if(blob.size>ARCHIVE_LIMITS.compressed)throw Error('The archive exceeds 25 MB.');return blob;
}
