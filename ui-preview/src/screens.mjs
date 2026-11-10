import {chatFixtures,profileFixture,progressFixture,catalog} from './fixtures.mjs';
import {aiLabel,hintUsed,mastery,peerPresentation,canDelete,timerTransition,timerSummary,tutorEntry} from './model.mjs';
const R=window.React,h=R.createElement,D=window.EdNova;
const scenario=new URLSearchParams(location.search).get('scenario')||'success';
export const Tag=({children='Exemple'})=>h('span',{className:'flex items-center gap-2'},h('span',{className:'en-choice__tag micro'},children));
const Text=({children,role})=>h('p',{className:'body m-0 text-ink-muted',role},children);
const Section=({title,children})=>h('section',{className:'grid gap-4'},title&&h('h2',{className:'heading m-0'},title),children);
const Card=({children})=>h('article',{className:'grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-[var(--shadow-raise)]'},children);
const sourceProps=s=>({page:s.page??'non précisée',book:s.source});
const retryError=(text,onRetry)=>h(D.BusyBanner,{retryAfter:0,errorMessage:text,onRetry});
function SoonTools(){const [selected,setSelected]=R.useState({});return h('div',{className:'grid gap-3 sm:grid-cols-2'},...['Salle d’étude','Mes notes'].map((title,i)=>h(D.ChoiceTile,{key:title,title,icon:i?'receipt':'users',description:i?'Tes notes de cours au même endroit.':'Invitation et membres',tag:'Bientôt',multiple:true,selected:!!selected[title],onChange:value=>setSelected(s=>({...s,[title]:value}))})));}

function Tutor({intent}){
 const initial=tutorEntry(intent,scenario);
 const [result,setResult]=R.useState(scenario==='empty'?null:initial),[messages,setMessages]=R.useState([]),[pending,setPending]=R.useState(scenario==='pending'),[error,setError]=R.useState(scenario==='error'),[rung,setRung]=R.useState(hintUsed(initial.hint_rung??0)),[mode,setMode]=R.useState(initial.mode==='guided'?'guided':'free'),[attempt,setAttempt]=R.useState(false),[verdict,setVerdict]=R.useState(null);
 const retry=R.useCallback(()=>{setError(false);setPending(true);setTimeout(()=>{setResult(chatFixtures.success);setPending(false)},400)},[]);
 const send=(text,selectedMode)=>{if(pending)return;setMessages(m=>[...m,text]);setPending(true);setError(false);setTimeout(()=>{setPending(false);setResult(chatFixtures.success);if(attempt){setVerdict({verdict:'unknown',issue:"Je n'ai pas pu vérifier",guiding_question:'Peux-tu préciser ton raisonnement ?',source:null});setAttempt(false)}},400)};
 const footer=result&&h(R.Fragment,null,h(D.FeedbackControl,{key:result.response_id,onSubmit:()=>{}}),h(D.Receipt,{modelCalls:result.receipt.llm_calls,tokens:result.receipt.tokens_in+result.receipt.tokens_out,cacheHits:result.receipt.cache?1:0,durationMs:result.receipt.latency_ms}));
 return h(R.Fragment,null,h(Text,null,"L'historique de tes échanges n'est pas enregistré dans ton compte."),
  !result&&!messages.length&&h(Text,null,'Pose ta première question. Tes échanges restent ici pendant cette visite.'),
  messages.map((m,i)=>h(D.StudentMessage,{key:i,attempt},m)),
  error?retryError('La réponse n’a pas pu être chargée. Ton message est conservé.',retry):pending?h(D.StageIndicator,{stage:'understanding'}):result?.retry_after!=null?h(D.BusyBanner,{retryAfter:result.retry_after,onRetry:retry}):result&&h(D.AnswerBubble,{kind:result.badge==='course_excerpt'?'excerpt':result.badge||'clarify',aiGenerated:result.ai_generated,aiLabel:aiLabel(result),sources:result.sources.map(sourceProps),footer},result.answer),
  verdict&&h(D.VerdictCard,{...peerPresentation(verdict.verdict),context:'attempt',issue:verdict.issue,question:verdict.guiding_question}),
  mode==='guided'&&h(D.GuidedActionBar,{used:rung,total:2,waiting:pending,onHint:()=>{const next=Math.min(2,rung+1);setRung(next);setResult(chatFixtures['hint'+next])},onAttempt:()=>setAttempt(true),onNewQuestion:()=>{setRung(0);setVerdict(null);setResult(chatFixtures.hint0)}}),
  h(D.Composer,{onSend:send,mode,onModeChange:setMode,busy:pending,attempt,placeholder:attempt?'Écris ta réponse et ton raisonnement…':'Pose ta question de maths…'}),
  h(Section,{title:'Tes échanges'},h(Tag,null,'Exemple'),h(Text,null,'Aucun texte de conversation à restaurer après actualisation.'),h(D.Button,{icon:'chat',onClick:()=>setMessages(m=>[...m,'Exemple : une nouvelle conversation commence ici.'])},'Reprendre un échange')));
}

function Progress(){
 const rows=scenario==='empty'?[]:progressFixture.map(row=>({...row,mastery:scenario==='mastery-null'?null:scenario==='mastery-zero'?0:row.mastery}));
 return h(R.Fragment,null,h(Text,null,'Catalogue en brouillon · 19 chapitres'),h(Tag,null,'Exemple'),
 h(D.ChapterMap,{topics:catalog.topics.map((t,i)=>({id:t.slug,name:t.label,level:mastery(rows.find(r=>r.topic===t.slug)?.mastery??null).level,col:i%4,row:Math.floor(i/4),requires:t.prerequisites})),label:'Carte des chapitres · Exemple'}),
 h(Section,{title:'Ta progression'},!rows.length?h(Text,null,'Pas encore de progression. Elle apparaîtra après tes premiers exercices.'):rows.map(row=>h(Card,{key:row.topic},h(D.MasteryRow,{chapter:row.label,level:mastery(row.mastery).level,attempts:row.attempts,solved:row.solved,confusions:row.confusions}),h(Text,null,mastery(row.mastery).label)))),
 h(Section,{title:'Notions de probabilités'},h(Tag,null,'Exemple'),catalog.subtopics.map(t=>h(D.MasteryRow,{key:t.slug,chapter:t.label,level:'unknown'}))),
 h(Awards));
}
function Awards(){return h(Section,{title:'Tes pièces de réussite'},h(Tag,null,'Bientôt'),h('div',{className:'grid gap-3 md:grid-cols-3',inert:''},h(D.AchievementBadge,{tier:'argile',title:'Première pièce',criterion:'Comprendre une première notion',glyph:'tesserae'}),h(D.AchievementBadge,{tier:'faience',title:'Une idée claire',criterion:'Expliquer un raisonnement',glyph:'users'}),h(D.AchievementBadge,{tier:'marbre',title:'Solide',criterion:'Consolider un chapitre',glyph:'target'})));}

function Timer({state,setState}){
 const [error,setError]=R.useState(scenario==='timer-error'),[pending,setPending]=R.useState(false);
 const act=action=>{if(pending)return;setPending(true);setTimeout(()=>{setState(s=>timerTransition(s,action,Date.now()));setPending(false);setError(false)},300)};
 return h(R.Fragment,null,error&&retryError('La séance n’a pas pu être mise à jour.',()=>setError(false)),h('div',{'aria-busy':pending,inert:pending?'':undefined},h(D.StudyTimer,{...timerSummary(state,Date.now()),running:state.status==='running',startedAt:state.startedAt,onStart:()=>act('start'),onStop:()=>act('stop')})),pending&&h(Text,{role:'status'},'Mise à jour…'),state.status==='stopped'&&h(Text,{role:'status'},'Séance terminée.'),h(Section,{title:'Tes séances'},state.status==='idle'?h(Text,null,'Aucune séance pour le moment.'):h(Card,null,h(Text,null,`Mathématiques · ${timerSummary(state,Date.now()).todayMinutes} min`),h(Text,null,'Historique de durées uniquement.'))),h(Awards));
}

function Room(){
 const [roomSelected,setRoomSelected]=R.useState(false),[code,setCode]=R.useState(''),[roomMessage,setRoomMessage]=R.useState('');
 const [pending,setPending]=R.useState(false),[verdict,setVerdict]=R.useState(scenario==='empty'?null:scenario==='unknown'?'unknown':['correct','incorrect','incomplete'].includes(scenario)?scenario:'unknown'),[error,setError]=R.useState(scenario==='error');
 const check=text=>{if(pending)return;setPending(true);setTimeout(()=>{setPending(false);setVerdict('unknown')},400)};
 if(scenario==='permission')return h(Text,{role:'alert'},'Ton compte élève ne dispose pas de cette action.');
 return h(R.Fragment,null,h('div',{className:'grid gap-3 sm:grid-cols-2'},h(D.ChoiceTile,{title:'Créer une salle',description:'Un espace pour réviser ensemble.',icon:'users',tag:'Bientôt',selected:roomSelected,onChange:value=>{setRoomSelected(value);setRoomMessage('Exemple : création de salle à venir.')}}),h(D.TextField,{label:'Code d’invitation',placeholder:'Code de la salle',value:code,onChange:e=>setCode(e.target.value)})),h(D.Button,{icon:'users',onClick:()=>setRoomMessage(code?'Exemple : rejoindre une salle sera bientôt disponible.':'Saisis un code pour essayer cet aperçu.')},'Rejoindre une salle'),roomMessage&&h(Text,{role:'status'},roomMessage),h(Tag,null,'Bientôt'),h(Section,{title:'Membres'},h(Text,null,'Exemple · Yasmine · Sami · Nour')),
 h(Section,{title:'Vérifier une explication'},h(Text,null,'Une vérification peut rester indéterminée. Aucun verdict positif n’est supposé.'),error?retryError('La vérification est indisponible.',()=>setError(false)):pending?h(D.StageIndicator,{stage:'verifying'}):verdict?h(D.VerdictCard,{...peerPresentation(verdict),issue:verdict==='unknown'?'La vérification n’a pas abouti.':verdict==='incorrect'?'Revois la règle de dérivation.':'',question:'Quelle règle utilises-tu ?',mascot:true}):h(Text,null,'Écris une explication pour demander une vérification.'),h(D.Composer,{onSend:check,busy:pending,placeholder:'Explique ton raisonnement…'})));
}

function Settings({pseudo}){
 const [presentation,setPresentation]=R.useState(null);
 const [profileError,setProfileError]=R.useState(scenario==='error');
 const [city,setCity]=R.useState(profileFixture.city||''),[subjects,setSubjects]=R.useState(profileFixture.subjects.join(', ')),[level,setLevel]=R.useState(profileFixture.level),[language,setLanguage]=R.useState(profileFixture.reply_language),[typed,setTyped]=R.useState(''),[confirm,setConfirm]=R.useState(scenario.startsWith('delete-')),[pending,setPending]=R.useState(false),[error,setError]=R.useState(false),[success,setSuccess]=R.useState(scenario==='save-success'?'Réglages enregistrés.':null),[deleted,setDeleted]=R.useState(scenario==='delete-success');
 const save=event=>{event.preventDefault();if(pending||city.length>50)return;setPending(true);setProfileError(false);setTimeout(()=>{setPending(false);setSuccess('Réglages enregistrés.')},300)};
 const remove=()=>{if(!canDelete(typed,pseudo,pending))return;setPending(true);setTimeout(()=>{setPending(false);if(scenario==='delete-error')setError(true);else{setDeleted(true);setTyped('')}},300)};
 if(scenario==='permission') return h(Text,{role:'alert'},'Ton compte élève ne dispose pas de cette action.');
 if(deleted)return h(Text,{role:'status'},'Exemple · compte supprimé. Aucune donnée réelle n’a été modifiée.');
 return h(R.Fragment,null,h(Text,null,'Compte élève'),profileError&&retryError('Les réglages n’ont pas pu être enregistrés. Tes saisies sont conservées.',()=>setProfileError(false)),h('form',{className:'grid gap-5',onSubmit:save},
 h(D.TextField,{label:'Pseudo',value:pseudo,readOnly:true}),h(Section,{title:'Profil facultatif'},h(Text,null,'Ces informations peuvent être laissées vides.'),h(D.TextField,{label:'Ville (facultatif)',value:city,onChange:e=>setCity(e.target.value),maxLength:50,hint:'50 caractères maximum.'}),h(D.TextField,{label:'Matières (facultatif)',value:subjects,onChange:e=>setSubjects(e.target.value),hint:'Sépare les matières par une virgule.'}),h('div',{className:'grid gap-3 sm:grid-cols-3',role:'radiogroup','aria-label':'Niveau (facultatif)'},[['beginner','Débutant'],['intermediate','Intermédiaire'],['advanced','Avancé']].map(([id,label])=>h(D.ChoiceTile,{key:id,title:label,selected:level===id,onChange:()=>setLevel(id)})))),
 h(Section,{title:'Langue des réponses'},h('div',{className:'grid gap-3 sm:grid-cols-2'},['fr','en'].map(lang=>h(D.ChoiceTile,{key:lang,title:lang==='fr'?'Français':'English',selected:language===lang,onChange:()=>setLanguage(lang)})))),
 h(Section,{title:'Présentation'},h('div',{className:'grid gap-3 sm:grid-cols-2'},h(D.ChoiceTile,{title:'Visuel',icon:'tesserae',tag:'Exemple',selected:presentation==='visuel',onChange:()=>setPresentation('visuel')}),h(D.ChoiceTile,{title:'Lecture',icon:'book-open',tag:'Exemple',selected:presentation==='lecture',onChange:()=>setPresentation('lecture')}))),
 h(D.Button,{type:'submit',variant:'primary',loading:pending},'Enregistrer'),success&&h(Text,{role:'status'},success)),
 h(Section,{title:'Confidentialité'},h(Text,null,"L'historique de tes échanges n'est pas enregistré dans ton compte."),
 confirm?h(Card,null,h(Text,null,'Supprimer ton compte et les données qui lui sont associées. Cette action est définitive. Pour confirmer, recopie ton pseudo.'),h(D.TextField,{label:'Confirme ton pseudo',value:typed,onChange:e=>setTyped(e.target.value),error:error?'La suppression a échoué. Ton compte est conservé. Réessaie.':typed&&typed!==pseudo?'Recopie exactement ton pseudo.':undefined}),h('div',{className:'flex flex-wrap gap-3'},h(D.Button,{variant:'danger',disabled:!canDelete(typed,pseudo,pending),loading:pending,onClick:remove},'Supprimer définitivement'),h(D.Button,{disabled:pending,onClick:()=>{setConfirm(false);setError(false)}},'Annuler'))):h(D.Button,{variant:'danger',icon:'trash',onClick:()=>setConfirm(true)},'Supprimer mon compte')),h(SoonTools));
}

function Home({pseudo,navigate,profile,timer,openTutor}){
 const nullMastery=['empty','mastery-null'].includes(scenario),zero=scenario==='mastery-zero';
 return h(R.Fragment,null,h(D.HomeOverview,{name:pseudo,greeting:'Bonjour',subtitle:'Ton espace est prêt : on pose la première pièce ?',weakest:nullMastery?undefined:{...profile.weakest,chapter:'Dérivabilité',level:zero?'weak':'unknown'},onPractise:()=>openTutor('guided'),onAsk:()=>openTutor(null),...timerSummary(timer,Date.now()),sessionRunning:timer.status==='running',onStartSession:()=>navigate('seances'),nextStep:{kind:'practise',label:'Un exercice guidé : dérivabilité',message:'Donne-moi un exercice guidé sur la dérivabilité.',onSend:()=>openTutor('guided')}}),h(Section,{title:'Ton programme de la semaine'},h(Tag,null,'Exemple'),h('ol',{className:'m-0 grid list-none gap-4 rounded-lg border border-line bg-surface p-5 shadow-[var(--shadow-raise)]'},profile.plan.map((p,i)=>h('li',{className:'plan-item',key:i},h('span',{className:'plan-when label text-ink'},p.when,h('span',{className:'caption block text-ink-muted'},p.minutes,' min')),h('span',{className:'plan-dot','aria-hidden':true}),h('span',{className:'plan-task grid gap-1'},h('span',{className:'body text-ink'},p.task),h('span',{className:'micro text-ink-muted'},p.tool)))))));
}
export function Screen({screen,pseudo,navigate,profile}){
 const [timer,setTimer]=R.useState(()=>scenario==='timer-running'?{status:'running',startedAt:Date.now()-125000}:scenario==='timer-stopped'?{status:'stopped',minutes:2}:{status:'idle'});
 const [intent,setIntent]=R.useState(null);
 const openTutor=value=>{setIntent(value);navigate('tuteur')};
 const names={accueil:'Accueil',tuteur:'Tuteur',carte:'Carte des chapitres',seances:'Séances',salle:'Salle d’étude',reglages:'Réglages'};
 const child=screen==='accueil'?h(Home,{pseudo,navigate,profile,timer,openTutor}):screen==='tuteur'?h(Tutor,{intent}):screen==='carte'?h(Progress):screen==='seances'?h(Timer,{state:timer,setState:setTimer}):screen==='salle'?h(Room):h(Settings,{pseudo});
 return h('main',{className:'step-enter grid gap-8'},screen!=='accueil'&&h('h1',{className:'title m-0'},names[screen]),child);
}
