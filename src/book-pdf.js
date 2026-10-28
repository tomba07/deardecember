import {renderMarkdown} from './markdown.js';
import {composeBook} from './book-layout.js';

const words=text=>new Set((text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu)||[]).filter(word=>!STOP.has(word)));
const STOP=new Set('that this with from have were your about which what when they them there their would could where into some these those meine einer einem einen nicht auch sich oder habe mein deine haben wird sind eine einem über noch aber dann'.split(' '));
export function bookSections(markdown){
 const template=document.createElement('template');template.innerHTML=renderMarkdown(markdown);
 const textOf=element=>{const copy=element.cloneNode(true);copy.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));return copy.textContent.trim()};
 const sections=[];let current={title:'',blocks:[],photos:[]};
 const flush=()=>{if(current.title||current.blocks.length)sections.push(current)};
 for(const element of template.content.children){
  const text=textOf(element);if(!text)continue;
  if(['H1','H2'].includes(element.tagName)){flush();current={title:text,blocks:[],photos:[]}}
  else if(['UL','OL'].includes(element.tagName)){
   [...element.children].forEach((item,index)=>current.blocks.push({kind:'list',text:`${element.tagName==='OL'?`${index+1}.`:'•'} ${textOf(item)}`}));
  }else if(element.tagName==='TABLE'){
   element.querySelectorAll('tr').forEach(row=>current.blocks.push({kind:'paragraph',text:[...row.children].map(cell=>textOf(cell)).join(' · ')}));
  }else current.blocks.push({kind:/^H[3-6]$/.test(element.tagName)?'heading':element.tagName==='BLOCKQUOTE'?'quote':'paragraph',text});
 }
 flush();return sections;
}
// Place a photo using its context plus the preceding, related original reflection.
// Ambiguous matches remain in a photo chapter; descriptions are never printed as prose.
export function photoSection(entry,entries,sections,anchor=null){
 const position=entries.indexOf(entry);let reflection=anchor;
 for(let i=position-1;!reflection&&i>=0;i--)if(entries[i].type==='text'){reflection=entries[i];break}
 const context=words([entry.description,entry.caption,reflection?.text,reflection?.topic].filter(Boolean).join(' '));
 const scores=sections.map(section=>{
  const title=words(section.title),text=words(section.blocks.map(block=>block.text).join(' '));let score=0,matches=0;
  for(const word of context){if(title.has(word)){score+=4;matches++}else if(text.has(word)){score++;matches++}}
  return {section,score,matches};
 }).sort((a,b)=>b.score-a.score);
 return scores[0]?.matches>=2&&scores[0].score>(scores[1]?.score||0)?scores[0].section:null;
}
let fontsPromise;
function fonts(){
 if(!fontsPromise)fontsPromise=Promise.all(['SourceSerif4-Regular.ttf','SourceSerif4-It.ttf'].map(async file=>{
  const response=await fetch(new URL('./fonts/'+file,import.meta.url));if(!response.ok)throw Error('The book fonts could not be loaded. Please try again.');
  const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
 })).catch(error=>{fontsPromise=null;throw error});
 return fontsPromise;
}
async function imageForBook(source,caption){
 if(!/^data:image\/(png|jpeg|webp);base64,/.test(source||''))throw Error('A journal photo is missing. Restore it before downloading the PDF.');
 const image=new Image();image.src=source;
 try{await image.decode()}catch{throw Error('A journal photo could not be read. Please check your photos and try again.')}
 if(image.naturalWidth*image.naturalHeight>40000000)throw Error('A journal photo is too large to include.');
 const scale=Math.min(1,2200/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
 const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
 const data=canvas.toDataURL('image/jpeg',.9);canvas.width=canvas.height=1;
 return {data,width:image.naturalWidth,height:image.naturalHeight,caption:caption||''};
}
function openingFacts(profile,de){
 const result=[];
 if(profile.name?.trim())result.push(de?`Mein Name ist ${profile.name.trim()}.`:`My name is ${profile.name.trim()}.`);
 let birthday=profile.dateOfBirth||'';
 if(/^\d{4}-\d{2}-\d{2}$/.test(birthday)&&Number.isFinite(+new Date(birthday)))birthday=new Intl.DateTimeFormat(de?'de-DE':'en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(birthday));
 if(birthday||profile.placeOfBirth)result.push(de?`Ich wurde${birthday?' am '+birthday:''}${profile.placeOfBirth?' in '+profile.placeOfBirth:''} geboren.`:`I was born${birthday?' on '+birthday:''}${profile.placeOfBirth?' in '+profile.placeOfBirth:''}.`);
 if(profile.placesLived?.trim())result.push((de?'Orte, an denen ich gelebt habe:\n':'Places I have lived:\n')+profile.placesLived.trim());
 return result;
}
export async function createBookPdf({markdown,collection,media,photoContexts={}}){
 if(!markdown?.trim())throw Error('Add some text before downloading a PDF.');
 const [{jsPDF},fontData]=await Promise.all([import('./pdf-runtime.js'),fonts()]);
 const pdf=new jsPDF({unit:'mm',format:[148,210],orientation:'portrait',compress:true,putOnlyUsedFonts:true});
 for(const [index,style]of ['normal','italic'].entries()){
  const file=`book-${style}.ttf`;pdf.addFileToVFS(file,fontData[index]);pdf.addFont(file,'Book',style);
 }
 const sections=bookSections(markdown),de=collection.language.toLowerCase().startsWith('de');
 const unmatched={title:de?'Fotos':'Photographs',blocks:[],photos:[]};
 for(const entry of collection.entries){
  if(entry.type!=='photo')continue;
  const photo=await imageForBook(media[entry.filePath],entry.caption);
  (photoSection(entry,collection.entries,sections,photoContexts[entry.filePath])||unmatched).photos.push(photo);
 }
 if(unmatched.photos.length)sections.push(unmatched);
 const printable=[collection.profile.name||'',...openingFacts(collection.profile,de),...sections.flatMap(s=>[s.title,...s.blocks.map(b=>b.text),...s.photos.map(p=>p.caption)])].join('');
 pdf.setFont('Book','normal');const font=pdf.getFont().metadata;
 if([...printable].some(char=>!/[\s\u200b\ufeff]/u.test(char)&&!font.characterToGlyph(char.codePointAt(0))))throw Error(de?'Die Schrift unterstützt einige Zeichen nicht. Bitte bearbeite diese Zeichen oder lade Markdown herunter.':'Some characters are not supported by the book font. Please edit them or download Markdown instead.');
 composeBook(pdf,{name:collection.profile.name||'',facts:openingFacts(collection.profile,de),sections,sample:collection.isSample,language:collection.language});
 return pdf.output('blob');
}
