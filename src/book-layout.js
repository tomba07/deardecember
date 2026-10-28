// A5 book composition. All measurements are millimetres, type sizes are points.
export const BOOK={width:148,height:210,inside:21,outside:18,top:25,bottom:23,body:15.5,leading:23*25.4/72};
export function composeBook(pdf,{name='',facts=[],sections=[],sample=false,language='en'}){
 const de=language.toLowerCase().startsWith('de'),{width:W,height:H}=BOOK;
 let page=1,y=BOOK.top;
 const margins=()=>page%2?{left:BOOK.inside,right:BOOK.outside}:{left:BOOK.outside,right:BOOK.inside};
 const width=()=>W-margins().left-margins().right;
 const font=(size=BOOK.body,italic=false)=>{pdf.setFont('Book',italic?'italic':'normal');pdf.setFontSize(size);pdf.setTextColor(37,37,34)};
 const next=()=>{pdf.addPage([W,H]);page++;y=BOOK.top};
 const lines=(text,size=BOOK.body,indent=0)=>{font(size);return pdf.splitTextToSize(String(text),width()-indent)};
 const line=(text,size,leading,italic=false,indent=0)=>{
  if(y+leading>H-BOOK.bottom)next();font(size,italic);pdf.text(text,margins().left+indent,y+size*25.4/72*.8);y+=leading;
 };
 const paragraph=(text,{size=BOOK.body,leading=BOOK.leading,italic=false,indent=0}={})=>{
  const wrapped=lines(text,size,indent);
  // Keep at least two lines on either side of a page turn where possible.
  if(wrapped.length>1&&y+leading*2>H-BOOK.bottom)next();
  wrapped.forEach((text,index)=>{if(wrapped.length-index===2&&y+leading*2>H-BOOK.bottom)next();line(text,size,leading,italic,indent)});
  y+=5;
 };
 const heading=(text,size=30)=>{
  const wrapped=lines(text,size),leading=size*1.18*25.4/72;
  if(y+wrapped.length*leading+BOOK.leading*3>H-BOOK.bottom)next();
  wrapped.forEach(text=>line(text,size,leading));y+=9;
 };
 // Cover: no browser headers, date stamps, badges or biography slogans.
 const coverName=name.trim()?name.trim().replace(/\s+(?=\S+$)/u,'\n'):(de?'Meine Erinnerungen':'My memories');let coverSize=43;while(lines(coverName,coverSize).length>3&&coverSize>26)coverSize--;
 y=52;paragraph(coverName,{size:coverSize,leading:coverSize*1.13*25.4/72});
 y+=7;paragraph(de?'Ein paar Erinnerungen':'A few memories',{size:16,leading:23*25.4/72,italic:true});
 y=H-38;paragraph('Dear December',{size:9,leading:4});
 if(sample)paragraph(de?'BEISPIELAUSGABE':'SAMPLE EDITION',{size:8,leading:4});
 next();
 if(facts.length){
  heading(de?'Zum Anfang':'A place to begin');
  for(const fact of facts)paragraph(fact);
  if(sample)paragraph(de?'Beispielantworten; einige Angaben sind erfunden.':'Sample answers; some details are imagined.',{size:9,leading:4.5,italic:true});
  // Give the opening narrative its own beginning, rather than crowding the facts.
  if(sections.length)next();
 }
 for(const [index,section]of sections.entries()){
  if(index>0)y+=10;
  if(section.title)heading(section.title);
  for(const block of section.blocks){
   if(block.kind==='heading'){y+=3;heading(block.text,22)}
   else paragraph(block.text,{italic:block.kind==='quote',indent:block.kind==='list'?4:0});
  }
  for(const photo of section.photos||[]){
   const caption=photo.caption?lines(photo.caption,9.5):[];
   const captionHeight=Math.min(caption.length,3)*4.5+(caption.length?4:0);
   const maxHeight=Math.max(35,125-captionHeight),w=Math.min(width(),maxHeight*photo.width/photo.height),h=w*photo.height/photo.width;
   if(y+h+captionHeight+5>H-BOOK.bottom)next();
   pdf.addImage(photo.data,'JPEG',margins().left+(width()-w)/2,y,w,h,undefined,'FAST');y+=h+4;
   for(const text of caption)line(text,9.5,4.5,true);
   y+=8;
  }
 }
 y+=6;paragraph(de?'Mit KI-Unterstützung aus meinen Einträgen erstellt.':'Prepared from my entries with AI assistance.',{size:8.5,leading:4.2,italic:true});
 // The body page count starts after the unnumbered cover.
 const total=pdf.getNumberOfPages();
 for(let number=2;number<=total;number++){
  pdf.setPage(number);page=number;font(9);pdf.setTextColor(115,113,107);
  pdf.text(String(number-1),number%2?W-margins().right:margins().left,H-12,{align:number%2?'right':'left'});
 }
 pdf.setProperties({title:name.trim()||'Dear December',author:name.trim(),subject:de?'Gedanken und Erinnerungen':'Thoughts and memories',creator:'Dear December'});
 return pdf;
}
