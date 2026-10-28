// Original, brief introductions and closing messages for each calendar door.
const doorMoments={
 en:[
 ['Start with an early memory: a place, a game or something you remember seeing.', 'A beginning, tucked away for another day.'],
 ['A doorstep, a room, a familiar view. Remember somewhere you called home.', 'A little corner of home, kept.'],
 ['The games, treasures and tiny discoveries that filled your childhood.', 'A small treasure for your December.'],
 ['Remember the people who were part of your early everyday world.', 'A familiar face, a little closer.'],
 ['Meals, celebrations and little rituals you remember sharing.', 'Some traditions fit on a page.'],
 ['The tastes, choices and interests you tried as you grew up.', 'A little of who you were, in your own words.'],
 ['An old friend, a shared joke, or a conversation that carried on.', 'Here’s to the people we take the long way home with.'],
 ['Think of something you learned, at school or somewhere unexpected.', 'One more memory for a quiet winter evening.'],
 ['A journey or a first attempt that took you somewhere unfamiliar.', 'A little adventure, safely brought home.'],
 ['An interest you followed, and the things you enjoyed along the way.', 'A little space for the things you love doing.'],
 ['A person you remember, and the moments you shared.', 'A shared moment, kept close.'],
 ['A change of plan, a new start, or a moment when life took a turn.', 'One part of the journey, written down.'],
 ['Something you made, worked on, studied or enjoyed doing.', 'The little details of making things matter too.'],
 ['A landscape, a street or a favourite spot you can still picture.', 'A favourite place is a little easier to return to now.'],
 ['Coffee, a walk, a familiar song: notice a pleasure in an ordinary week.', 'A little everyday joy for December.'],
 ['Your favourite things, familiar habits and small particularities.', 'A small detail that sounds just like you.'],
 ['Something you were pleased to finish, try or learn.', 'A moment you can return to with a smile.'],
 ['A quiet spot, a favourite programme or whatever helps you switch off.', 'Enough for today. There’s no need to write more.'],
 ['The things you care about, in the words and examples that fit you.', 'A quiet moment to notice what matters to you.'],
 ['Walk through a lovely ordinary day, from its first cup to its last light.', 'May there be more days like that.'],
 ['How you imagined the future, and the everyday things that changed along the way.', 'A little kindness, sent back through time.'],
 ['Something you are curious about, or a small thing you look forward to.', 'A little room for whatever comes next.'],
 ['Something you would enjoy someone discovering about your life one day.', 'A little hello to someone who may read this years from now.'],
 ['A Christmas wish, your memories to keep, and something to make from them.', 'Merry little moments, kept in your own words.']
 ],
 de:[
 ['Beginne mit einer frühen Erinnerung: einem Ort, einem Spiel oder etwas, das du gesehen hast.', 'Ein Anfang, für einen anderen Tag aufgehoben.'],
 ['Eine Haustür, ein Zimmer, ein vertrauter Ausblick. Erinnere dich an ein Zuhause.', 'Ein kleines Stück Zuhause, bewahrt.'],
 ['Die Spiele, Schätze und kleinen Entdeckungen deiner Kindheit.', 'Ein kleiner Schatz für deinen Dezember.'],
 ['Erinnere dich an die Menschen, die zu deinem frühen Alltag gehörten.', 'Ein vertrautes Gesicht, ein wenig näher.'],
 ['Essen, Feiern und kleine Rituale, die ihr geteilt habt.', 'Manche Traditionen passen auf eine Seite.'],
 ['Vorlieben, Entscheidungen und Interessen aus deiner Jugend.', 'Ein wenig von damals, in deinen eigenen Worten.'],
 ['Ein alter Freund, ein gemeinsamer Witz oder ein langes Gespräch.', 'Auf die Menschen, mit denen wir den längeren Heimweg nehmen.'],
 ['Etwas, das du gelernt hast — in der Schule oder ganz woanders.', 'Eine Erinnerung für einen ruhigen Winterabend.'],
 ['Eine Reise oder ein erster Versuch, der dich ins Unbekannte führte.', 'Ein kleines Abenteuer, gut nach Hause gebracht.'],
 ['Ein Interesse, dem du nachgegangen bist, und was dir daran gefallen hat.', 'Ein wenig Raum für das, was du gerne tust.'],
 ['Ein Mensch, an den du denkst, und eure gemeinsamen Momente.', 'Ein gemeinsamer Moment, gut aufgehoben.'],
 ['Ein neuer Plan, ein Anfang oder eine unerwartete Wendung.', 'Ein Stück des Weges, aufgeschrieben.'],
 ['Etwas, das du gemacht, erarbeitet, gelernt oder gerne getan hast.', 'Auch die kleinen Handgriffe sind eine Erinnerung wert.'],
 ['Eine Landschaft, eine Straße oder ein Lieblingsplatz vor deinem inneren Auge.', 'Ein Lieblingsort, zu dem du nun leichter zurückfindest.'],
 ['Kaffee, ein Spaziergang, ein Lied: etwas Schönes in einer gewöhnlichen Woche.', 'Ein wenig Alltagsfreude für den Dezember.'],
 ['Deine Lieblingsdinge, vertrauten Gewohnheiten und kleinen Eigenheiten.', 'Ein kleines Detail, das nach dir klingt.'],
 ['Etwas, das du gerne geschafft, ausprobiert oder gelernt hast.', 'Ein Moment, zu dem du mit einem Lächeln zurückkehren kannst.'],
 ['Ein ruhiger Ort, eine Lieblingssendung oder etwas anderes, bei dem du abschaltest.', 'Genug für heute. Du musst nicht mehr aufschreiben.'],
 ['Was dir wichtig ist — mit den Worten und Beispielen, die zu dir passen.', 'Ein ruhiger Moment für das, was dir wichtig ist.'],
 ['Ein schöner Alltagstag, von der ersten Tasse bis zum letzten Licht.', 'Möge es noch mehr solche Tage geben.'],
 ['Wie du dir die Zukunft vorgestellt hast und was sich im Alltag verändert hat.', 'Ein wenig Freundlichkeit, zurück durch die Zeit geschickt.'],
 ['Etwas, das dich neugierig macht oder worauf du dich freust.', 'Ein wenig Platz für das, was noch kommt.'],
 ['Etwas über dein Leben, das jemand eines Tages gerne entdecken könnte.', 'Ein kleiner Gruß an jemanden, der das vielleicht in vielen Jahren liest.'],
 ['Ein Weihnachtsgruß, Erinnerungen zum Aufheben und etwas, das daraus werden kann.', 'Kleine Weihnachtsmomente, in deinen eigenen Worten bewahrt.']
 ]
};
function renderDoorIntroduction(index){$('doorDescription').textContent=doorMoments[lang][index][0]}
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
