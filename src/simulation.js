// All people, dates, places and memories in this sample are fictional.
const simulationMemories=[
 "I was born in Brookfield on 12 April 1988. I spent most of my childhood in Oakridge. I remember the little park near our flat and visiting the library after school.",
 "We lived in a flat above a bakery. My bedroom looked onto a courtyard, and there was a shelf beside the window where I kept books and little collections.",
 "I liked a wooden train set and a box of coloured pencils. Later I collected postcards and kept them in a biscuit tin.",
 "After school I often went to the library or rode my bike around the park. On wet afternoons, I drew pictures at the kitchen table.",
 "As a child I was nervous around large dogs. Meeting a neighbour’s patient old dog helped. At bedtime I liked leaving a small lamp on while I read.",
 "My favourite childhood meal was potato soup with bread. These days I often make vegetable curry, with enough left over for lunch the next day.",
 "Birthdays usually began with pancakes. In summer we took a picnic to the park, even if the celebration was just a few people and a cake in a tin.",
 "I walked to school with a neighbour. Art and geography were my favourite subjects, and I liked borrowing books from the classroom shelf.",
 "I spent a lot of time with Sam and Casey from our street. We rode bikes, made up board games and met at the park after lunch.",
 "As a teenager I listened to borrowed CDs and spent weekends with friends. I wore jeans most of the time and was always looking for another second-hand book.",
 "My first paid job was in a small bookshop. I saved some of my wages for a bicycle and spent a little on books I had been meaning to read.",
 "One adventure I remember was taking an overnight train to a city I had never visited. Finding my way around with a paper map was part of the fun.",
 "I was born in Brookfield, grew up in Oakridge and later moved to Riverside. My first flat there was near the canal, which became a favourite place for a walk.",
 "I met several friends through a community garden. We still meet for coffee, exchange plants and help with each other’s small projects.",
 "I enjoy making simple shelves and repairing things around the house. Measuring twice is a habit I learned after making one shelf that did not quite fit.",
 "I return to detective novels and familiar comedies. I like acoustic music while cooking and would happily eat apple crumble every week.",
 "A usual weekday begins with tea and breakfast. I take the bus to work at the library. In the evening I cook, read or spend a little time looking after the plants.",
 "An ideal Saturday includes a visit to the market, time for a walk and a board game with friends. I like leaving some of the afternoon unplanned.",
 "I am learning to grow tomatoes and trying a few bread recipes. I keep notes about what worked so that I can try again next season.",
 "I take my coffee with milk and carry a spare pen. I like an organised kitchen drawer, although the rest of the flat is not always as tidy.",
 "A birthday lunch in the garden is a moment I remember fondly. It started raining halfway through, and everyone helped carry the table inside.",
 "I like making time for friends, cooking and a quiet hour with a book. Those are the things I would want to keep in a busy week.",
 "I would like to try pottery and take a longer train journey. For now, I am looking forward to seeing whether this year’s tomatoes ripen."
];
let simulationBackup=null;
function startSimulation(){
 if(!isDevelopmentHost)return;
 if(simulationBackup)return;
 $('revealDialog').close();$('aboutDialog').close();editor.close();commitAndSave();simulationBackup={document:structuredClone(storedDocument()),preview:$('preview').checked,lang};
 state={formatVersion:1,language:'en',isSample:true,profile:{name:'Alex Morgan',dateOfBirth:'1988-04-12',placeOfBirth:'Brookfield',placesLived:'Oakridge · childhood\nRiverside · adulthood'},entries:[]};
 media=Object.create(null);entryBindings=new WeakMap();pendingEdits=new Map();isSimulation=true;generatedDraft=null;window.refreshSavedGeneration?.();keepsakeRevealed=false;biographyCardHidden=false;openedDoors=[];lang='en';
 simulationMemories.forEach((answer,day)=>addTextEntry(answer,{topic:themes[day],question:question(day),binding:{day,choice:0}}));commitEdits();
 window.prepareSimulationDraft?.();
 $('preview').checked=true;$('simulationNotice').hidden=false;applyLanguage();
}
function endSimulation(){
 if(!simulationBackup)return;
 const backup=simulationBackup;simulationBackup=null;isSimulation=false;restoreDocument(backup.document);$('preview').checked=backup.preview;lang=backup.lang;
 $('simulationNotice').hidden=true;$('printSheet')?.remove();$('revealDialog').close();editor.close();$('entryDialog').close();applyLanguage();
}
initializeSavedDocument();inferBindings();applyLanguage();initializeIntro();startCalendarClock();
