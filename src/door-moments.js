// Short introductions for the timeline calendar.
const doorDescriptions={
 "en": [
  "The place you grew up and the first things you remember.",
  "Rooms, windows and the neighbourhood around your childhood home.",
  "Toys, games, books and things you liked to collect.",
  "After-school afternoons and the places where you played.",
  "Childhood fears, things that felt reassuring, or a cosy bedtime routine. Choose whichever you prefer.",
  "Favourite meals, familiar flavours and the people you ate with.",
  "Birthdays, holidays and little rituals you remember.",
  "Lessons, school journeys and an ordinary day in the classroom.",
  "The people you played with and what you did together.",
  "Music, clothes and weekends from your teenage years.",
  "First jobs, your own money and doing things independently.",
  "An adventure, a journey or trying something new nearby.",
  "Places you lived and what everyday life was like there.",
  "How you met, what you do together and how you keep in touch.",
  "Work, hobbies, making things and skills you picked up.",
  "The books, films, music and food you keep coming back to.",
  "Your routine today, from getting up to winding down.",
  "Time off, favourite outings or a Saturday spent at home.",
  "Something you’re reading, trying or getting absorbed in right now.",
  "Small habits, preferences and everyday things that are yours.",
  "A day, an outing or a small moment you like remembering.",
  "The things you enjoy making time for, with room to reflect if you like.",
  "Something to try, somewhere to go or a plan you look forward to.",
  "A Christmas wish, your reflections to keep and options for what comes next."
 ],
 "de": [
  "Der Ort, an dem du aufgewachsen bist, und deine ersten Erinnerungen.",
  "Zimmer, Fenster und die Nachbarschaft rund um dein Zuhause als Kind.",
  "Spielzeug, Spiele, Bücher und Dinge, die du gesammelt hast.",
  "Nachmittage nach der Schule und die Orte, an denen du gespielt hast.",
  "Ängste aus der Kindheit, etwas Beruhigendes oder ein gemütliches Abendritual. Wähle, was dir lieber ist.",
  "Lieblingsgerichte, vertraute Geschmäcker und gemeinsame Mahlzeiten.",
  "Geburtstage, Feiertage und kleine Rituale von früher.",
  "Unterricht, Schulwege und ein gewöhnlicher Tag im Klassenzimmer.",
  "Mit wem du gespielt hast und was ihr zusammen gemacht habt.",
  "Musik, Kleidung und Wochenenden aus deiner Jugend.",
  "Erste Jobs, eigenes Geld und Dinge, die du selbstständig gemacht hast.",
  "Ein Abenteuer, eine Reise oder etwas Neues in deiner Nähe.",
  "Orte, an denen du gelebt hast, und wie der Alltag dort aussah.",
  "Wie ihr euch kennengelernt habt, was ihr zusammen macht und wie ihr Kontakt haltet.",
  "Arbeit, Hobbys, selbst gemachte Dinge und neu gelernte Fähigkeiten.",
  "Bücher, Filme, Musik und Essen, zu denen du gerne zurückkehrst.",
  "Dein heutiger Alltag, vom Aufstehen bis zum Feierabend.",
  "Freie Zeit, ein Lieblingsausflug oder ein Samstag zu Hause.",
  "Etwas, das du gerade liest, ausprobierst oder besonders spannend findest.",
  "Kleine Gewohnheiten, Vorlieben und Dinge, die zu deinem Alltag gehören.",
  "Ein Tag, ein Ausflug oder ein kleiner Moment, an den du gerne zurückdenkst.",
  "Wofür du dir gerne Zeit nimmst — mit Raum zum Nachdenken, wenn du möchtest.",
  "Etwas zum Ausprobieren, ein Reiseziel oder ein Plan, auf den du dich freust.",
  "Ein Weihnachtsgruß, deine Gedanken zum Aufheben und Möglichkeiten für danach."
 ]
};
function renderDoorIntroduction(index){$('doorDescription').textContent=doorDescriptions[lang][index]}
const openingCleanups=new WeakMap();
function animateDoorOpening(dialog){
 openingCleanups.get(dialog)?.();
 dialog.classList.add('door-opening');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');if(motion.matches)return;
 dialog.scrollTop=0;
 const overlay=document.createElement('div');overlay.className='door-opening-overlay';overlay.setAttribute('role','group');overlay.setAttribute('aria-label',lang==='de'?'Türchen-Einführung':'Door introduction');
 const copy=document.createElement('div');copy.className='door-opening-copy';copy.style.paddingTop=Math.max(32,dialog.clientHeight/2-120)+'px';
 const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent=dialog.querySelector('.door-intro .eyebrow')?.textContent||'';
 const title=document.createElement('h2');title.className='opening-title';title.textContent=dialog.querySelector('.door-intro h2')?.textContent||'';
 const description=document.createElement('p');description.className='opening-description';description.textContent=dialog.querySelector('.door-intro p:last-child')?.textContent||'';
 const proceed=document.createElement('button');proceed.type='button';proceed.className='primary opening-continue';proceed.style.visibility='hidden';proceed.disabled=true;proceed.textContent=lang==='de'?'Weiter →':'Continue →';
 copy.append(eyebrow,title,description,proceed);overlay.append(copy);
 const blocked=[...dialog.children].filter(element=>!element.classList.contains('close')).map(element=>[element,element.inert]);
 for(const [element]of blocked)element.inert=true;
 dialog.classList.add('door-introducing');dialog.append(overlay);overlay.style.height=dialog.clientHeight+'px';
 const finish=(focusContent=false)=>{overlay.remove();dialog.classList.remove('door-introducing','door-clearing');for(const [element,inert]of blocked)element.inert=inert;dialog.removeEventListener('close',onClose);motion.removeEventListener('change',motionChanged);openingCleanups.delete(dialog);if(focusContent&&dialog.open)dialog.querySelector('#calendarFacts:not([hidden]) input, #questionChoices button, #revealDownload')?.focus({preventScroll:true})};
 const motionChanged=()=>{if(motion.matches)finish()};
 const onClose=()=>{if(!dialog.open)finish()};
 openingCleanups.set(dialog,finish);dialog.addEventListener('close',onClose);motion.addEventListener('change',motionChanged);
 proceed.onclick=()=>{proceed.disabled=true;dialog.classList.add('door-clearing');overlay.classList.add('is-leaving')};
 const showContinue=()=>{if(overlay.classList.contains('is-leaving'))return;proceed.classList.add('is-ready');proceed.style.visibility='';proceed.disabled=false;proceed.focus({preventScroll:true})};
 description.addEventListener('animationend',event=>{if(event.animationName==='opening-caption')showContinue()},{once:true});
 overlay.addEventListener('click',event=>{
  if(event.target.closest('button')||!proceed.disabled||overlay.classList.contains('is-leaving'))return;
  for(const animation of copy.getAnimations({subtree:true}))animation.finish();
  showContinue();
  for(const animation of proceed.getAnimations())animation.finish();
 });
 overlay.addEventListener('animationend',event=>{if(event.target===overlay&&event.animationName==='door-overlay-away')finish(true)});
}

function closeDoorReveal(){$('revealDialog').close()}
