// Only the supplied birth details, moves, beaches and sledding memories are factual.
const simulationMemories=[
 "I was born in Brookfield in 1988. From 1991 to 1994 I lived in Seabrook, and then we moved to Oakridge. I remember the beaches in Seabrook and sledding on the hill in Oakridge.",
 "In this sample, I picture a home with a small garden and a bedroom looking out onto a quiet street. The Seabrook coast and the hills around Oakridge are the real places behind these memories.",
 "I liked building sandcastles and making routes for a sled. For this example, I also imagine a box of toy cars and a collection of interesting stones.",
 "The memory that stands out is sledding on the hill in Oakridge: carrying the sled up, rushing down and climbing back again. On warmer days, I imagine spending afternoons outdoors on a bike.",
 "For this example, I imagine being nervous about dark staircases as a child. A bedside lamp and a familiar book made evenings feel more comfortable.",
 "A plausible favourite would be pasta with tomato sauce. I imagine weekend breakfasts with bread rolls and plenty of time to sit at the table.",
 "In this sample, birthdays meant cake in the afternoon and choosing what to eat for dinner. December meant candles and opening a calendar door each morning.",
 "I imagine a school day beginning with a short walk, followed by lessons and a noisy break outside. Building or drawing something would have been a favourite part.",
 "For this sample, I picture meeting friends after school and riding bikes around the neighbourhood. We usually decided what to do once we were outside.",
 "I imagine teenage weekends with friends, music and computer games. Clothes were practical, and a favourite album might stay on repeat for weeks.",
 "A plausible first job was helping with small computer tasks. I imagine saving some of the money and spending the rest on a game or something for a hobby.",
 "For this example, I imagine planning a first independent train trip: working out connections, finding the right platform and arriving somewhere unfamiliar with a backpack.",
 "I lived in Brookfield, then Seabrook from 1991 to 1994, then Oakridge. I remember Seabrook through its beaches and Oakridge through the hill where I went sledding.",
 "In this sample, I imagine meeting a friend through a shared technical project. We still meet for coffee, walks and conversations about things we are making.",
 "I enjoy the idea of making small, useful tools. For this example, an evening might involve trying a design, changing a few details and testing whether it works.",
 "For this sample, I imagine returning to an adventure film, a well-read novel and music that works in the background while cooking. Pasta would remain on the weekly menu.",
 "A plausible weekday starts with coffee, then work at a computer. There is a walk or an errand at lunchtime and cooking or a personal project in the evening.",
 "An ideal sample Saturday would have a slow breakfast, time outdoors and a few hours for a project. Meeting friends for dinner would round it off.",
 "At the moment, this sample version of me is interested in small web projects and ways of keeping family memories. I like seeing a rough idea become something usable.",
 "In this example, I take coffee without sugar, carry a phone and keys, and tend to check a small detail one more time before calling something finished.",
 "A snowy afternoon sledding in Oakridge is a memory I like returning to. So are the Seabrook beaches: the sand, the sea and the room to run around.",
 "For this sample, I make time for curiosity, a walk and staying in touch with friends. Those are things I would like to keep in an ordinary week.",
 "I would like to return to the Seabrook beaches and see what I recognise. For this example, I would also like to learn a practical craft and finish a few small projects."
];
let simulationBackup=null;
function startSimulation(){
 if(!isDevelopmentHost)return;
 if(simulationBackup)return;
 $('revealDialog').close();$('aboutDialog').close();editor.close();commitAndSave();simulationBackup={document:structuredClone(storedDocument()),preview:$('preview').checked,lang};
 state={formatVersion:1,language:'en',isSample:true,profile:{name:'Alex Morgan',dateOfBirth:'1988-04-12',placeOfBirth:'Brookfield, Germany',placesLived:'Brookfield, Germany · 1988–1991\nSeabrook, United Kingdom · 1991–1994\nOakridge, Germany · from 1994'},entries:[]};
 media=Object.create(null);entryBindings=new WeakMap();pendingEdits=new Map();isSimulation=true;generatedDraft=null;window.refreshSavedGeneration?.();keepsakeRevealed=false;biographyCardHidden=false;openedDoors=[];lang='en';
 simulationMemories.forEach((answer,day)=>addTextEntry(answer,{topic:themes[day],question:question(day),binding:{day,choice:0}}));commitEdits();
 $('preview').checked=true;$('simulationNotice').hidden=false;applyLanguage();
}
function endSimulation(){
 if(!simulationBackup)return;
 const backup=simulationBackup;simulationBackup=null;isSimulation=false;restoreDocument(backup.document);$('preview').checked=backup.preview;lang=backup.lang;
 $('simulationNotice').hidden=true;$('printSheet')?.remove();$('revealDialog').close();editor.close();$('entryDialog').close();applyLanguage();
}
initializeSavedDocument();inferBindings();applyLanguage();initializeIntro();startCalendarClock();
