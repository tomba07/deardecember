const $=id=>document.getElementById(id),editor=$('editor');let current=0,lang=state.language.toLowerCase().startsWith('de')?'de':'en';
const themes=["Your beginnings", "A place called home", "Childhood treasures", "Your younger world", "Things that seemed scary", "Around the table", "Little traditions", "School days", "Childhood friends", "Your teenage years", "Finding your own way", "Beyond the familiar", "Places along the way", "People along the way", "Making and doing", "Your favourites", "An ordinary weekday", "When the weekend comes", "What interests you now", "Your particular ways", "Moments to remember", "What matters today", "Still to come", "A moment for you"];
const deThemes=["Deine Anfänge", "Ein Ort namens Zuhause", "Kindheitsschätze", "Deine Welt als Kind", "Was damals unheimlich war", "Rund um den Tisch", "Kleine Traditionen", "Schulzeit", "Kindheitsfreunde", "Deine Jugend", "Dein eigener Weg", "Über das Vertraute hinaus", "Orte auf deinem Weg", "Menschen auf deinem Weg", "Machen und Ausprobieren", "Deine Favoriten", "Ein gewöhnlicher Wochentag", "Wenn das Wochenende kommt", "Was dich gerade interessiert", "Deine Eigenheiten", "Momente zum Erinnern", "Was dir heute wichtig ist", "Was noch kommt", "Ein Moment für dich"];
const questions=["Where did you grow up?", "What was your home like growing up?", "What did you love playing with as a child?", "What did you do after school?", "Were you afraid of anything as a child?", "What was your favourite meal growing up?", "How did you celebrate birthdays growing up?", "What was a usual school day like?", "Who did you spend time with as a child?", "What did you do at weekends as a teenager?", "What was your first job like?", "What’s the biggest adventure you’ve experienced? What happened?", "Where have you lived since childhood?", "How did you meet someone you spend time with today?", "What have you enjoyed making, working on or learning?", "What films or books do you return to?", "What does a usual weekday look like now?", "How do you usually spend your weekends?", "What are you interested in at the moment?", "What habits or preferences would someone who knows you recognise?", "What’s a moment in your life you remember especially fondly?", "What do you like making time for these days?", "What would you like to try or learn?"];
const deQuestions=["Wo bist du aufgewachsen?", "Wie sah dein Zuhause als Kind aus?", "Womit hast du als Kind am liebsten gespielt?", "Was hast du nach der Schule gemacht?", "Hattest du als Kind vor etwas Angst?", "Was war dein Lieblingsessen als Kind?", "Wie habt ihr früher Geburtstage gefeiert?", "Wie sah ein gewöhnlicher Schultag aus?", "Mit wem hast du als Kind viel Zeit verbracht?", "Was hast du als Teenager am Wochenende gemacht?", "Wie war dein erster Job?", "Was war dein größtes Abenteuer? Was ist passiert?", "Wo hast du seit deiner Kindheit gelebt?", "Wie hast du jemanden kennengelernt, mit dem du heute Zeit verbringst?", "Was hast du gerne gemacht, erarbeitet oder gelernt?", "Welche Filme oder Bücher schaust oder liest du immer wieder?", "Wie sieht ein gewöhnlicher Wochentag bei dir heute aus?", "Wie verbringst du meistens deine Wochenenden?", "Was interessiert dich gerade?", "Welche Gewohnheiten oder Vorlieben würde jemand wiedererkennen, der dich kennt?", "An welchen Moment in deinem Leben denkst du besonders gerne zurück?", "Wofür nimmst du dir heute gerne Zeit?", "Was würdest du gerne ausprobieren oder lernen?"];
const CALENDAR_CATALOG='timeline-v1';
const legacyDoorMap=[0, 1, 2, 3, 6, 9, 8, 7, 11, 14, 13, 10, 14, 12, 16, 19, 14, 17, 21, 17, 9, 22, 21, 23];
const legacyThemes=['Your beginnings','A place called home','Childhood treasures','The people around you','Little traditions','Growing into yourself','Friendship','Learning along the way','A first adventure','Finding your own way','Meaningful connections','Turning points','The work of your hands','Places that stay with you','Everyday joy','Your kind of person','Getting the hang of it','Taking a breather','What matters most','A perfect little day','Then and now','Dreams still unfolding','For those who come after','A moment for you'];
const legacyDeThemes=['Deine Anfänge','Ein Ort namens Zuhause','Kindheitsschätze','Die Menschen um dich','Kleine Traditionen','Du selbst werden','Freundschaft','Was du gelernt hast','Ein erstes Abenteuer','Dein eigener Weg','Wichtige Verbindungen','Wendepunkte','Was du erschaffst','Unvergessliche Orte','Freude im Alltag','Deine Persönlichkeit','Übung macht den Meister','Eine kleine Auszeit','Was wirklich zählt','Ein schöner Tag','Damals und heute','Träume für morgen','Für die Zukunft','Ein Moment für dich'];
const symbols=['✳','⌂','✧','❋','❧','❀','∞','✎','✦','➶','♡','✧','❋','⌁','☼','✳','✦','❧','◇','☼','✎','✧','❦','✴'];
function toast(message){$('toast').textContent=message;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',5000)}
function save(){
 try{persistDocument();$('saved').textContent='';render();return true}
 catch{$('saved').textContent='Not saved — export a backup';toast('Browser storage is full. Export an archive to save your current collection.');return false}
}
function commitAndSave(){commitEdits();return save()}
function adventYear(){return Math.min(new Date().getFullYear(),...state.entries.map(entry=>new Date(entry.createdAt).getFullYear()).filter(Number.isFinite))}
function developmentCalendar(){return isSimulation||(isDevelopmentHost&&$('preview').checked)}
function earlierDoorsComplete(){return themes.slice(0,23).every((_,index)=>doorComplete(index))}
function completionHint(){return lang==='de'?'Schließe zuerst alle anderen 23 Türchen ab.':'Complete all other 23 doors first.'}
function unlocked(index){return (index!==23||earlierDoorsComplete())&&(developmentCalendar()||new Date()>=new Date(adventYear(),11,index+1))}
function revealAvailable(){return earlierDoorsComplete()&&(keepsakeRevealed||developmentCalendar()||new Date()>=new Date(adventYear(),11,24))}
function suggestedDoor(){
 if(!dayHasAnswers(0))return 0;
 const date=new Date(),year=adventYear();
 if(date.getFullYear()>year)return 23;
 return date.getMonth()===11?Math.min(23,date.getDate()-1):0;
}
function refreshPrimaryAction(){
 const button=$('begin'),countdown=$('doorCountdown');
 if(!unlocked(0)){
  button.disabled=true;button.textContent=lang==='de'?'Dein erstes Türchen öffnet am 1. Dezember':'Your first door opens December 1';
  const seconds=Math.max(0,Math.ceil((new Date(adventYear(),11,1)-new Date())/1000));
  const days=Math.floor(seconds/86400),hours=Math.floor(seconds/3600)%24,minutes=Math.floor(seconds/60)%60,remainder=seconds%60,pad=value=>String(value).padStart(2,'0');
  countdown.textContent=`${days} ${lang==='de'?(days===1?'Tag':'Tage'):(days===1?'day':'days')} · ${pad(hours)}h ${pad(minutes)}m ${pad(remainder)}s`;countdown.hidden=false;return;
 }
 button.disabled=false;countdown.hidden=true;countdown.textContent='';
 const day=suggestedDoor(),date=new Date(),today=date.getFullYear()===adventYear()&&date.getMonth()===11&&date.getDate()<=24;
 button.disabled=!unlocked(day);button.title=day===23&&!earlierDoorsComplete()?completionHint():'';
 button.textContent=!dayHasAnswers(0)?(lang==='de'?'Öffne dein erstes Türchen':'Open your first door'):today?(lang==='de'?`Öffne das heutige Türchen · ${day+1}`:`Open today’s door · ${day+1}`):(lang==='de'?`Weiter zu Türchen ${day+1}`:`Continue with door ${day+1}`);
 button.insertAdjacentHTML('beforeend',icons.arrowRight);
}
function openSuggestedDoor(){if(unlocked(0))openDoor(suggestedDoor())}
function startCalendarClock(){
 let lastDate=new Date().toDateString();
 setInterval(()=>{const date=new Date().toDateString();if(date!==lastDate){lastDate=date;render()}else refreshPrimaryAction()},1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastDate=new Date().toDateString();render()}});
}
function doorComplete(index){
 if(index===23)return keepsakeRevealed;
 return dayEntries(index).some(entry=>entry.text.trim());
}
function doorStatus(index){
 if(!unlocked(index))return 'locked';
 if(doorComplete(index))return 'completed';
 if(openedDoors.includes(index)||dayEntries(index).some(entry=>entry.text.trim()))return 'pending';
 return 'unopened';
}
function render(){
 refreshPrimaryAction();window.refreshBiographyCard?.();
 const count=themes.filter((_,day)=>doorComplete(day)).length;
 $('count').textContent=lang==='de'?`${count} von 24 Erinnerungen gesammelt`:`${count} of 24 memories collected`;$('bar').style.width=count/24*100+'%';$('grid').replaceChildren();
 themes.forEach((_,index)=>{
  const button=document.createElement('button'),status=doorStatus(index),opened=openedDoors.includes(index)||dayEntries(index).some(entry=>entry.text.trim())||(index===23&&keepsakeRevealed);
  const title=(lang==='de'?deThemes:themes)[index];
  button.className='door'+(status==='completed'?' done':'')+(index===23?' reveal':'');button.dataset.status=status;
  const statusText=(lang==='de'?{locked:'Gesperrt',unopened:'Ungeöffnet',pending:'Angefangen',completed:'Abgeschlossen'}:{locked:'Locked',unopened:'Unopened',pending:'In progress',completed:'Completed'})[status];
  button.disabled=!unlocked(index);
  button.innerHTML=`<span class="lock" aria-hidden="true">${icons[status]}</span><span class="symbol">${symbols[index]}</span><span class="num">${String(index+1).padStart(2,'0')}</span><small></small><span class="door-status" id="door-status-${index}"></span>`;
  button.querySelector('small').textContent=opened?title:'';button.querySelector('.door-status').textContent=index===23&&!earlierDoorsComplete()?completionHint():statusText;button.title=index===23&&!earlierDoorsComplete()?completionHint():statusText;button.setAttribute('aria-describedby',`door-status-${index}`);
  button.setAttribute('aria-label',`${lang==='de'?'Tür':'Door'} ${index+1}${opened?': '+title:''}`);
  button.onclick=()=>openDoor(index);$('grid').append(button);
 });
}
function question(day,language=lang){return (language==='de'?deQuestions:questions)[day]}
function inferBindings(){
 entryBindings=new WeakMap();const occupied=new Set();
 for(const entry of state.entries){
  if(entry.type!=='text')continue;
  const tags=formatEntryContexts.get(entry)?.record?.tags||[];
  const taggedDay=tags.find(tag=>/^dear-december:door:([1-9]|1[0-9]|2[0-3])$/.test(tag));
  const isTimeline=tags.includes(`dear-december:catalog:${CALENDAR_CATALOG}`);
  let day=-1;
  if(taggedDay){const storedDay=Number(taggedDay.split(':').at(-1))-1;day=isTimeline?storedDay:legacyDoorMap[storedDay]}
  else{
   let legacy=legacyThemes.indexOf(entry.topic);if(legacy<0)legacy=legacyDeThemes.indexOf(entry.topic);
   if(legacy<0)legacy=({'A proud moment':16,'Ein stolzer Moment':16,'Through difficult times':17,'Schwierige Zeiten':17,'A letter to your younger self':20,'An dein jüngeres Ich':20})[entry.topic]??-1;
   if(legacy>=0)day=legacyDoorMap[legacy];else{day=themes.indexOf(entry.topic);if(day<0)day=deThemes.indexOf(entry.topic)}
  }
  let choice=null;
  for(const language of ['en','de']){
   for(let index=0;index<23;index++){
    const primary=(language==='de'?deQuestions:questions)[index];
    let candidate=null;
    if(entry.question===question(index,language)||entry.question===primary||entry.question?.startsWith(primary+' '))candidate=0;
    else if(entry.question===questionChoices[language][index][0])candidate=1;
    else if(entry.question===questionChoices[language][index][1])candidate=2;
    else {const alternative=questionChoices[language][index].indexOf(entry.question);if(alternative>=2)candidate=alternative+2;}
    if(candidate!==null&&(day<0||day===index)){day=index;choice=candidate;break}
   }
   if(choice!==null)break;
  }
  if(day>=0&&entry.question===null)choice=3;
  if(day>=0&&day<23){const key=`${day}:${choice}`;if(choice!==null&&!occupied.has(key)){occupied.add(key);bindEntry(entry,{day,choice})}else bindEntry(entry,{day})}
 }
}
function dayEntries(day){return state.entries.filter(entry=>entry.type==='text'&&entryBinding(entry).day===day)}
function dayHasAnswers(day){return doorComplete(day)}
function entryForChoice(day,choice){
 if(choice&&typeof choice==='object')return state.entries.includes(choice)?choice:null;
 return dayEntries(day).find(entry=>entryBinding(entry).choice===choice);
}
function insertForDoor(entry,day){
 const existing=state.entries.indexOf(entry);if(existing>=0)state.entries.splice(existing,1);
 let last=-1;for(let index=0;index<state.entries.length;index++){const item=state.entries[index];if(item.type==='text'&&entryBinding(item).day===day){last=index;while(state.entries[last+1]?.type==='photo')last++}}
 state.entries.splice(last<0?state.entries.length:last+1,0,entry);
}
function openDoor(index){
 if(window.requireAccount?.())return;
 if(index===23&&!earlierDoorsComplete()){toast(completionHint());return}
 if(!unlocked(index)){toast(lang==='de'?`Dieses Türchen öffnet am ${index+1}. Dezember.`:`This door opens December ${index+1}. Come back during Advent.`);return}
 $('aboutDialog').close();if(!openedDoors.includes(index)){openedDoors.push(index);save()}if(index===23){story(true);return}
 commitAndSave();current=index;selectedQuestion=dayEntries(index).find(entry=>entry.text.trim())||null;choosingQuestion=selectedQuestion===null;
 $('dayLabel').textContent=`${lang==='de'?'TÜR':'DOOR'} ${String(index+1).padStart(2,'0')}`;$('title').textContent=(lang==='de'?deThemes:themes)[index];
 $('answer').placeholder=lang==='de'?'Fang einfach an. Jedes kleine Detail zählt.':'Start anywhere. A little detail can hold a whole memory…';renderQuestionChoices();renderPhotos();renderDoorIntroduction(index);if(!editor.open)editor.showModal();animateDoorOpening(editor);
}
$('answer').oninput=()=>writeQuestionAnswer($('answer').value);
$('answer').onblur=()=>commitAndSave();
editor.addEventListener('close',()=>commitAndSave());
function saveAndCloseDoor(){commitAndSave();editor.close();const door=$('grid').children[current];door?.focus({preventScroll:true});door?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}

function selectedEntry(){return selectedQuestion===null?null:entryForChoice(current,selectedQuestion)}
function attachedPhotos(entry){if(!entry)return [];const result=[];for(let index=state.entries.indexOf(entry)+1;state.entries[index]?.type==='photo';index++)result.push(state.entries[index]);return result}
$('photo').onchange=async event=>{
 const file=event.target.files[0],anchor=selectedEntry(),document=state;event.target.value='';if(!file)return;
 try{
  if(!anchor?.text.trim())throw Error('Write a little of your memory before attaching a photo.');
  if(!Object.values(IMAGE_TYPES).includes(file.type)||file.size>ARCHIVE_LIMITS.image)throw Error('Please choose a JPG, PNG or WebP under 3 MB.');
  if(state.entries.length>=ARCHIVE_LIMITS.entries)throw Error('The collection has reached its 2,000-entry limit.');
  const blob=await imageIsValid(await file.arrayBuffer(),file.type),source=await blobDataUrl(blob);
  if(state!==document||!state.entries.includes(anchor))return;
  const extension=file.type==='image/jpeg'?'jpg':file.type.split('/')[1],path=`media/${crypto.randomUUID()}.${extension}`;
  const photo={type:'photo',description:'',filePath:path,createdAt:new Date().toISOString(),modificationDates:[]};
  const photos=attachedPhotos(anchor);state.entries.splice(state.entries.indexOf(anchor)+1+photos.length,0,photo);media[path]=source;save();renderPhotos();
 }catch(error){toast(error.message)}
};
function renderPhotos(){
 $('photos').replaceChildren();
 for(const photo of attachedPhotos(selectedEntry())){
  const card=document.createElement('div');card.className='photo-card';const img=new Image();img.src=media[photo.filePath];img.alt=photo.description||'Your memory photograph';card.append(img);
  const fields=document.createElement('div');
  for(const [key,labelText,placeholder]of [['description',lang==='de'?'Bildbeschreibung (freiwillig)':'Photo context (optional)',lang==='de'?'Wer oder was ist zu sehen? Wo und wann?':'Who or what is pictured? Where and when?'],['caption',lang==='de'?'Bildunterschrift (freiwillig)':'Caption (optional)',lang==='de'?'Eine kurze Beschriftung zum Foto':'A short label to go with the photo']]){
   const label=document.createElement('label');label.textContent=labelText;const field=document.createElement('textarea');field.rows=2;field.value=photo[key]||'';field.placeholder=placeholder;
   field.oninput=()=>{updateEntry(photo,{[key]:field.value});img.alt=photo.description||'Your memory photograph';save()};field.onblur=()=>commitAndSave();label.append(field);fields.append(label);
  }
  card.append(fields);const remove=document.createElement('button');remove.textContent=lang==='de'?'Foto entfernen':'Remove photo';remove.onclick=()=>{state.entries.splice(state.entries.indexOf(photo),1);pendingEdits.delete(photo);if(!state.entries.some(entry=>entry.type==='photo'&&entry.filePath===photo.filePath))delete media[photo.filePath];save();renderPhotos()};card.append(remove);$('photos').append(card);
 }
}
function story(reveal=false){
 if(window.requireAccount?.())return;
 if(!earlierDoorsComplete()){toast(completionHint());return}
 if(!keepsakeRevealed&&!(reveal&&revealAvailable())&&!developmentCalendar()){toast(lang==='de'?'Am 24. Dezember wartet hier eine Überraschung auf dich.':'A little surprise is waiting for you on December 24.');return}
 keepsakeRevealed=true;commitAndSave();applyWelcomeCopy();$('revealName').textContent=state.profile.name||(lang==='de'?'dich':'you');
 if(!$('revealDialog').open){$('revealDialog').showModal();animateDoorOpening($('revealDialog'))}
}
function downloadRevealJournal(){if(!keepsakeRevealed)return;exportDraftBackup()}
let editingEntry=null;
function renderCollectionEntries(){
 $('collectionEntries').replaceChildren();state.entries.forEach((entry,index)=>{
  const row=document.createElement('div');row.className='collection-entry';
  const label=document.createElement('span');label.textContent=entry.type==='photo'?`Photo: ${entry.caption||entry.description||entry.filePath}`:`${entry.topic?entry.topic+' · ':''}${entry.question||'Journal entry'}`;row.append(label);
  for(const [text,action,disabled]of [['Edit',()=>openEntryEditor(entry),false],['↑',()=>moveEntry(index,-1),index===0],['↓',()=>moveEntry(index,1),index===state.entries.length-1]]){const button=document.createElement('button');button.textContent=text;button.disabled=disabled;button.setAttribute('aria-label',text==='Edit'?`Edit entry ${index+1}`:`Move entry ${index+1} ${text==='↑'?'earlier':'later'}`);button.onclick=action;row.append(button)}$('collectionEntries').append(row);
 });
}
function moveEntry(index,direction){commitEdits();const [entry]=state.entries.splice(index,1);state.entries.splice(index+direction,0,entry);save();renderCollectionEntries()}
function openEntryEditor(entry){
 $('entryBack').hidden=!$('aboutDialog').open;$('entryBack').textContent=lang==='de'?'← Zurück':'← Back';
 editingEntry=entry;$('entryEditorTitle').textContent=entry.type==='photo'?'Photo details':entry.question||'Journal entry';$('entryTextLabel').hidden=entry.type!=='text';$('entryPhotoFields').hidden=entry.type!=='photo';
 $('entryText').value=entry.text||'';$('entryDescription').value=entry.description||'';$('entryCaption').value=entry.caption||'';$('entryDialog').showModal();
}
$('entryText').oninput=()=>{if(editingEntry){updateEntry(editingEntry,{text:$('entryText').value});save()}};
for(const [id,key]of [['entryDescription','description'],['entryCaption','caption']])$(id).oninput=()=>{if(editingEntry){updateEntry(editingEntry,{[key]:$(id).value});save()}};
function closeEntryEditor(){commitAndSave();$('entryDialog').close();renderCollectionEntries()}
$('entryDialog').addEventListener('close',()=>{commitAndSave();editingEntry=null;renderCollectionEntries()});
function preparePrintStory(collection=state,assets=media){
 commitAndSave();$('revealDialog').close();editor.close();$('printSheet')?.remove();
 const sheet=document.createElement('article');sheet.id='printSheet';
 function text(parent,tag,value,className){const element=document.createElement(tag);element.textContent=value;if(className)element.className=className;parent.append(element);return element}
 const cover=document.createElement('section');cover.className='print-cover';text(cover,'h1',collection.profile.name||'My story');text(cover,'p',[profileDate(collection.profile),collection.profile.placeOfBirth].filter(Boolean).join(' · ')||'The stories that make a life','print-subtitle');
 if(collection.isSample)text(cover,'p','FICTIONAL SAMPLE\nAll names, dates, places and memories are invented for this preview.','print-disclaimer');sheet.append(cover);
 if(collection.profile.placesLived?.trim()){const places=document.createElement('section');places.className='print-chapter print-timeline';text(places,'h2',lang==='de'?'Meine Wohnorte':'Places I have called home');text(places,'p',collection.profile.placesLived).style.whiteSpace='pre-wrap';sheet.append(places)}
 let lastTopic=null;
 for(const entry of collection.entries){
  if(entry.type==='text'){
   const section=document.createElement('section');section.className='print-chapter';
   if(entry.topic&&entry.topic!==lastTopic)text(section,'h2',entry.topic);
   if(entry.question)text(section,'p',entry.question,'print-question');text(section,'p',entry.text).style.whiteSpace='pre-wrap';sheet.append(section);lastTopic=entry.topic||null;
  }else{
   const figure=document.createElement('figure');figure.className='print-photo';const image=new Image();image.src=assets[entry.filePath];image.alt=entry.description||entry.caption||'Memory photograph';figure.append(image);if(entry.caption)text(figure,'figcaption',entry.caption);sheet.append(figure);
  }
 }
 if(!collection.entries.length)text(sheet,'p','Your story is still unfolding.');document.body.append(sheet);return sheet;
}
async function printStory(){const sheet=preparePrintStory();await Promise.all([...sheet.querySelectorAll('img')].map(image=>image.decode().catch(()=>{})));window.print()}
function applyLanguage(){
 document.documentElement.lang=lang;$('language').textContent=lang==='de'?'DE / EN':'EN / DE';$('calendarTitle').textContent=lang==='de'?'Dein Dezember voller Erinnerungen':'Your December of memories';applyWelcomeCopy();render();
 if(editor.open){renderDoorIntroduction(current);$('title').textContent=(lang==='de'?deThemes:themes)[current];renderQuestionChoices();renderPhotos()}
}
function toggleLang(){commitEdits();lang=lang==='en'?'de':'en';state.language=lang;save();applyLanguage()}
function downloadBlob(blob,name){const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}
async function exportArchive(){
 try{commitAndSave();const collection=taggedManifest(state),assets={...media};const blob=await createArchive(collection,assets);downloadBlob(blob,collection.isSample?'sample-journal.deardecember':'my-journal.deardecember');toast('Archive exported. Keep it somewhere safe.')}
 catch(error){toast(error.message)}
}
async function exportDraftBackup(){
 try{commitAndSave();const document=structuredClone(storedDocument());const blob=await createArchive(document.collection,document.media,{draftDocument:document});downloadBlob(blob,'dear-december-backup.zip');toast('Backup exported, including your entries, photos and saved generated text.')}catch(error){toast(`Backup failed: ${error.message}`)}
}
let importingArchive=false;
$('importFile').onchange=async event=>{
 const file=event.target.files[0];event.target.value='';if(!file||importingArchive)return;importingArchive=true;
 try{
  if(file.size>ARCHIVE_LIMITS.compressed)throw Error('Please choose an archive or recovery backup smaller than 25 MB.');
  const buffer=await file.arrayBuffer();const incoming=file.name.toLowerCase().endsWith('.json')?await readDraftBackup(buffer):await readArchive(buffer);
  if(!confirm(`Import ${incoming.collection.entries.length} entries and replace this browser’s current collection? Export a backup first if needed.`))return;
  const document={...incoming,bindings:[],pending:[]};
  // A failed storage write must leave both the active and persisted collection intact.
  if(window.accountPersistence?.enabled)await window.accountPersistence.replace(document);else localStorage.setItem(DOCUMENT_KEY,JSON.stringify(document));
  generatedDraft=readGeneratedDraft(incoming.generatedDraft);window.refreshSavedGeneration?.();state=incoming.collection;media=incoming.media;pendingEdits=new Map();keepsakeRevealed=false;biographyCardHidden=false;openedDoors=[];inferBindings();
  if(isSimulation){isSimulation=false;simulationBackup=null;$('simulationNotice').hidden=true}
  lang=state.language.toLowerCase().startsWith('de')?'de':'en';editor.close();$('revealDialog').close();$('aboutDialog').close();$('entryDialog').close();applyLanguage();save();toast('Your collection has been imported.');
 }catch(error){toast(`Import failed: ${error.message}`)}finally{importingArchive=false}
};
window.addEventListener('pagehide',()=>{commitEdits();try{persistDocument()}catch{}});

function resetDevelopmentData(){
 if(!isDevelopmentHost||window.accountPersistence?.enabled)return;
 if(!confirm(lang==='de'?'Alle lokalen Daten von Dear December löschen? Dazu gehören deine Einträge, Fotos und generierten Texte. Lade zuerst ein Backup herunter, wenn du sie behalten möchtest.':'Delete all local Dear December data, including entries, photos and generated text? Download a backup first if you want to keep them.'))return;
 try{
  localStorage.removeItem(DOCUMENT_KEY);localStorage.removeItem(INTRO_SEEN_KEY);
  resettingDevelopmentData=true;location.reload();
 }catch{toast(lang==='de'?'Die lokalen Daten konnten nicht gelöscht werden.':'Local data could not be cleared.')}
}
