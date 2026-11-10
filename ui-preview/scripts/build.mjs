import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const data=JSON.parse(read('../llm_service/app/pedagogy/data/diagnostic_fr.json'));
const bank=[...data.preferences.map(p=>({id:p.id,question:p.question,choices:Object.entries(p.options).map(([id,label])=>({id,label}))})),{id:data.styles_probe.id,question:`Quelle explication préfères-tu pour ${data.styles_probe.concept} ?`,choices:Object.entries(data.styles_probe.versions).map(([id,label])=>({id,label}))},...data.level_check.map(p=>({id:p.id,question:p.question,choices:p.options.map(label=>({id:label,label}))}))];
const topics=JSON.parse(read('../llm_service/app/pedagogy/data/topics_math_bac.json'));
write('src/bank.mjs','export const bank='+JSON.stringify(bank,null,2)+';\nexport const catalog='+JSON.stringify(topics,null,2)+';\n');
let runtime=read('vendor/components.js');
function replace(text,from,to){if(!text.includes(from)) throw Error('Missing approved source anchor: '+from.slice(0,90));return text.replace(from,to);}
runtime=replace(runtime,'{id:"not_my_level",label:"Pas \\xE0 mon niveau"}]','{id:"not_my_level",label:"Pas \\xE0 mon niveau"},{id:"other",label:"Autre"}]');
runtime=replace(runtime,'function De({verdict:e,context:t="peer",issue:a,question:r,source:n,mascot:s})','function De({verdict:e,context:t="peer",issue:a,question:r,source:n,mascot:s,title:customTitle})');
runtime=replace(runtime,'let i=yt[e];return','let i={...yt[e],...(customTitle?{title:customTitle}:{})};return');
runtime=replace(runtime,'t==="peer"?"Explication v\\xE9rifi\\xE9e":"Ta r\\xE9ponse"','t==="peer"?(customTitle?"Vérification indisponible":"Explication v\\xE9rifi\\xE9e"):"Ta r\\xE9ponse"');
runtime=replace(runtime,'function Be({retryAfter:e,onRetry:t,excerpt:a})','function Be({retryAfter:e,onRetry:t,excerpt:a,errorMessage:customError})');
runtime=replace(runtime,'"EdNova est tr\\xE8s demand\\xE9"','customError?"Erreur":"EdNova est tr\\xE8s demand\\xE9"');
runtime=replace(runtime,'"Beaucoup d\\u2019\\xE9l\\xE8ves r\\xE9visent en ce moment. Je r\\xE9essaie tout seul dans "','customError||"Beaucoup d\\u2019\\xE9l\\xE8ves r\\xE9visent en ce moment. Je r\\xE9essaie tout seul dans "');
// Manual-retry errors use the exact banner DOM/styles without a misleading countdown.
runtime=replace(runtime,'if(r<=0){s.current','if(customError)return;if(r<=0){s.current');
runtime=replace(runtime,'r,"\\xA0s"','customError?null:r,customError?null:"\\xA0s"');
runtime=replace(runtime,'"quelques secondes"','customError?null:"quelques secondes"');
runtime=replace(runtime,'r>0?`Nouvel essai automatique','customError?customError:r>0?`Nouvel essai automatique');
runtime=runtime.replaceAll('Pas encore commenc\\xE9','Pas encore évalué');
runtime=replace(runtime,'var Me=window.React;','var Me=window.EdNovaReact||window.React;');
runtime=replace(runtime,'e>1?"jours de suite":"jour"',
  'e>1||e===0&&window.EdNovaPreview?.getLocale?.()==="en"?"jours de suite":"jour"');
write('src/components.js',runtime);
// Preserve original onboarding markup. Changes are bounded copy/content/state adapters.
let app=read('reference/onboarding.bundle.js');
const pStart=app.indexOf('P=[{'),pEnd=app.indexOf('],ue=',pStart);
if(pStart<0||pEnd<0)throw Error('Diagnostic anchor');
app=app.slice(0,pStart)+'P=window.EdNovaPreview.bank'+app.slice(pEnd+1);
const vStart=app.indexOf('function Ve('),vEnd=app.indexOf('var q=M(',vStart);
app=app.slice(0,vStart)+'function Ve(e,n){return window.EdNovaPreview.profile(e,n)}'+app.slice(vEnd);
const validationStart=app.indexOf('if(/^[A-Za-z0-9_.]'),validationEnd=app.indexOf(',L.length<8',validationStart);
if(validationStart<0||validationEnd<0)throw Error('Validation anchor');
app=app.slice(0,validationStart)+'if(A.pseudo=window.EdNovaPreview.validatePseudo(_)'+app.slice(validationEnd);
app=replace(app,'3 \\xE0 20 caract\\xE8res. Essaie \\xAB\\xA0yasmine\\xA0\\xBB pour voir l\\u2019erreur.','3 à 30 caractères : lettres et chiffres.');
app=replace(app,'ex. yasmine_07\\u2026','ex. yasmine07…');
app=replace(app,'Je garde seulement ton pseudo et ta progression, jamais le texte de tes questions ni de mes r\\xE9ponses.',"L'historique de tes échanges n'est pas enregistré dans ton compte.");
app=replace(app,'Le tome 2 couvre dix chapitres. Le tome 1 (analyse) arrive bient\\xF4t.','Catalogue de 19 chapitres, encore en brouillon.');
app=replace(app,'Je m\\u2019adapte \\xE0 toi. Tu pourras changer d\\u2019avis dans les r\\xE9glages.','Deux présentations d’exemple. Le diagnostic estime ta préférence d’explication.');
app=replace(app,'selected:e.style==="visuel",onChange:()=>r("visuel")','selected:e.style==="visuel",tag:"Exemple",onChange:()=>r("visuel")');
app=replace(app,'selected:e.style==="lecture",onChange:()=>r("lecture")','selected:e.style==="lecture",tag:"Exemple",onChange:()=>r("lecture")');
app=replace(app,'Prends-en autant que tu veux. Ceux marqu\\xE9s \\xAB\\xA0Bient\\xF4t\\xA0\\xBB arrivent apr\\xE8s le lancement\\xA0: je te pr\\xE9viendrai.','Choisis les outils à explorer dans cet aperçu.');
app=replace(app,'tag:o.soon?"Bient\\xF4t":void 0,selected:e.tools.has(o.id),onChange:s(o.id)','tag:o.soon?"Bientôt":"Exemple",selected:e.tools.has(o.id),onChange:s(o.id)');
app=replace(app,'Voil\\xE0 ton plan pour cette semaine.','Exemple de programme pour cette semaine.');
app=replace(app,'Il \\xE9volue avec toi\\xA0: chaque s\\xE9ance remplit ta carte des chapitres.','Exemple · ce programme n’est pas enregistré dans ton compte.');
app=replace(app,'Visuel":"Lecture"," \\xB7 modifiable dans les r\\xE9glages"','Visuel":"Lecture"," · Exemple"');
app=replace(app,'Pas encore commenc\\xE9','Pas encore évalué');
app=replace(app,'N.useState("accueil")','N.useState(window.EdNovaPreview.screen)');
const mainStart=app.indexOf('s==="accueil"?N.createElement("main"'),mainEnd=app.indexOf(',N.createElement("div",{className:"home-bar"}',mainStart);
if(mainStart<0||mainEnd<0)throw Error('Screen anchor');
app=app.slice(0,mainStart)+'N.createElement(window.EdNovaPreview.Screen,{screen:s,pseudo:e||"Yasmine",navigate:o,profile:n}))'+app.slice(mainEnd);
app=replace(app,'At={q1:"b",q2:"c",q3:"a",q4:"c",q5:"c",q6:"a"}','At={}');
app=replace(app,'Je pr\\xE9pare ton point de d\\xE9part et ton plan.','Je prépare tes pistes pour mieux réviser.');
app=replace(app,'Je pr\\xE9pare ton plan\\u2026','Je prépare ton point de départ…');
app=app.replaceAll('Voir mon plan','Voir un exemple de programme');
app=replace(app,'l=t.useRef(null);return t.createElement(t.Fragment,null,t.createElement(H,{state:"welcoming",title:s?', 'l=t.useRef(null),[accountCreated,setAccountCreated]=t.useState(false);return t.createElement(t.Fragment,null,t.createElement(H,{state:"welcoming",title:s?');
// Account form delegates only to deterministic offline fixtures, never networking.
app=replace(app,'d(!0),window.setTimeout(()=>{n(S=>({...S,pseudo:_})),d(!1),a(s?"accueil":"bac")},700)','d(!0),window.EdNovaPreview.accountSubmit({login:s,form:f.currentTarget,onCreated:()=>setAccountCreated(true),onError:(message,field="password")=>{i({[field]:message});d(!1)},onSuccess:()=>{n(S=>({...S,pseudo:_}));d(!1);a(s?"accueil":"bac")}})');
app=replace(app,'c?s?"Connexion\\u2026":"Cr\\xE9ation\\u2026":s?"Me connecter":"Cr\\xE9er mon compte"','c?(s||accountCreated)?"Connexion…":"Création…":(s||accountCreated)?"Me connecter":"Créer mon compte"');
app=replace(app,"return Bt.includes(e)?e:\"bienvenue\"","return window.EdNovaPreview.route?.(Bt.includes(e)?e:\"bienvenue\")??(Bt.includes(e)?e:\"bienvenue\")");
app=replace(app,"onRestart:()=>{s(We),o(\"bienvenue\")}","onRestart:()=>{if(window.EdNovaPreview.restart){window.EdNovaPreview.restart();return}s(We),o(\"bienvenue\")}");
app=replace(app,"[d,m]=t.useState(0);t.useEffect(()=>{if(i!==\"thinking\")return;","[d,m]=t.useState(0),[liveResult,setLiveResult]=t.useState(null),[liveError,setLiveError]=t.useState(false);t.useEffect(()=>{if(i!==\"thinking\"||window.EdNovaPreview.submitDiagnostic)return;");
app=replace(app,"p=()=>{o<P.length-1?r(o+1):c(\"thinking\")}","p=()=>{if(o<P.length-1){r(o+1);return}c(\"thinking\");if(window.EdNovaPreview.submitDiagnostic){setLiveError(false);window.EdNovaPreview.submitDiagnostic(e.answers).then(result=>{setLiveResult(result);c(\"result\")},()=>{setLiveError(true);c(\"quiz\")})}}");
app=replace(app,"i===\"quiz\"&&t.createElement(me,","liveError&&t.createElement(\"p\",{role:\"alert\"},\"Diagnostic indisponible. Réessaie.\"),i===\"quiz\"&&t.createElement(me,");
app=replace(app,"style:a.formatLabel,level:a.levelLabel,summary:a.summary","style:(liveResult||a).formatLabel,level:(liveResult||a).levelLabel,summary:(liveResult||a).summary");
// Apply connected preferences through the onboarding bridge.
app=replace(app,"tag:\"Exemple\",onChange:()=>r(\"visuel\")","tag:window.EdNovaPreview.finishOnboarding?undefined:\"Exemple\",onChange:()=>r(\"visuel\")");
app=replace(app,"tag:\"Exemple\",onChange:()=>r(\"lecture\")","tag:window.EdNovaPreview.finishOnboarding?undefined:\"Exemple\",onChange:()=>r(\"lecture\")");
app=replace(app,"\"Deux présentations d’exemple. Le diagnostic estime ta préférence d’explication.\"","window.EdNovaPreview.finishOnboarding?\"Choisis la façon dont Nova te présentera ses explications.\":\"Deux présentations d’exemple. Le diagnostic estime ta préférence d’explication.\"");
app=replace(app,"\"Choisis les outils à explorer dans cet aperçu.\"","window.EdNovaPreview.finishOnboarding?\"Choisis les outils à afficher sur ton accueil.\":\"Choisis les outils à explorer dans cet aperçu.\"");
app=replace(app,"tag:o.soon?\"Bientôt\":\"Exemple\",selected:e.tools.has(o.id)","tag:o.soon?\"Bientôt\":window.EdNovaPreview.finishOnboarding?undefined:\"Exemple\",disabled:!!window.EdNovaPreview.finishOnboarding&&o.soon,selected:e.tools.has(o.id)");
app=replace(app,"Visuel\":\"Lecture\",\" · Exemple\"","Visuel\":\"Lecture\",window.EdNovaPreview.finishOnboarding?\" · Ta préférence\":\" · Exemple\"");
app=replace(app,"function Pt({state:e,profile:n,go:a}){","function Pt({state:e,profile:n,go:a}){\n    const [saving,setSaving]=t.useState(false);\n    const [saveError,setSaveError]=t.useState(false);\n    const pending=t.useRef(false);\n    async function finish(){\n      if(pending.current)return;\n      const save=window.EdNovaPreview.finishOnboarding;\n      if(!save){a(\"accueil\");return;}\n      pending.current=true;\n      setSaving(true);\n      setSaveError(false);\n      try{await save(e);a(\"accueil\");}\n      catch(error){if(error.name!==\"AbortError\")setSaveError(true);}\n      finally{pending.current=false;setSaving(false);}\n    }\n  ");
app=replace(app,"t.createElement(G,{onBack:()=>a(\"diagnostic\")},t.createElement(y,{variant:\"primary\",size:\"lg\",iconEnd:\"arrow-right\",onClick:()=>a(\"accueil\")},\"Commencer\"","saveError&&t.createElement(\"p\",{role:\"alert\"},\"Tes choix n’ont pas pu être enregistrés. Réessaie.\"),t.createElement(G,{onBack:()=>{if(!pending.current)a(\"diagnostic\")}},t.createElement(y,{variant:\"primary\",size:\"lg\",iconEnd:\"arrow-right\",onClick:finish,loading:saving,disabled:saving},\"Commencer\"");
app=replace(app,'page flex min-h-full gap-8 pb-28 pt-4 lg:pb-8','page ed-live-shell flex min-h-full gap-8 pb-28 pt-4 lg:pb-8');
app=replace(app,'function Ue(){let[e,n]=B.useState(Ke),[a,s]=B.useState(We);', 'function Ue(){let[e,n]=B.useState(Ke),[a,s]=B.useState(We);const savePending=B.useRef(false),[saveMessage,setSaveMessage]=B.useState("");');
app=replace(app,'let o=d=>{window.location.hash.slice(1)===d?n(d):window.location.hash=d}',
  'let o=async d=>{if(savePending.current)return;const advance=()=>{window.location.hash.slice(1)===d?n(d):window.location.hash=d};const save=window.EdNovaPreview.saveOnboardingStep;if(!save||({bac:"style",style:"outils",outils:"diagnostic"})[e]!==d){setSaveMessage("");advance();return}savePending.current=true;setSaveMessage("Enregistrement…");try{await save(e,a);setSaveMessage("");advance()}catch(error){if(error.name!=="AbortError")setSaveMessage("Tes choix n’ont pas pu être enregistrés. Réessaie.")}finally{savePending.current=false}}');
app=replace(app,'profile:i,go:o})}window.katex','profile:i,go:o,saveMessage})}window.katex');
app=replace(app,'t.createElement(ve,null)),a?t.createElement("main",{key:n',
  't.createElement(ve,null)),e.saveMessage&&t.createElement("p",{role:e.saveMessage==="Enregistrement…"?"status":"alert"},e.saveMessage),a?t.createElement("main",{key:n');
app=replace(app,'window.EdNovaPreview.submitDiagnostic(e.answers).then',
  'window.EdNovaPreview.submitDiagnostic(e.answers,e.style).then');
app=replace(app,'t.createElement(G,{onBack:f})))}function Pt',
  't.createElement(G,{onBack:f},i==="quiz"&&t.createElement(y,{variant:"quiet",onClick:()=>{n(previous=>({...previous,answers:{}}));s("plan")}},"Passer les questions"))))}function Pt');
app=replace(app,'Bac maths \\xB7 4\\xE8me ann\\xE9e secondaire \\xB7 section math\\xE9matiques','Ton compagnon de révision');
const welcomeCopy=app.match(/Je t\\u2019aide [^"]+bac de maths[^"]+/u)?.[0];
if(!welcomeCopy)throw Error('Missing welcome copy');
app=replace(app,welcomeCopy,
  'Révise tes matières, pose des questions et entraîne-toi à expliquer avec tes propres mots. Préparons ton espace.');
app=replace(app,'On parle bien du bac maths\\u202F?','Comment veux-tu réviser ?');
app=replace(app,'Je r\\xE8gle le programme, les exemples et la langue de mes r\\xE9ponses.','Choisis la langue dans laquelle Nova te répondra.');
app=replace(app,'[["Niveau","4\\xE8me ann\\xE9e secondaire"],["Section","Math\\xE9matiques"],["Manuel","Manuel officiel, tome 2"]]',
  '[["Matières","Plusieurs matières"],["Activités","Révisions et exercices"],["Aide","Tuteur Nova"]]');
app=replace(app,'Catalogue de 19 chapitres, encore en brouillon.','Tu pourras choisir une matière dans la carte des chapitres.');
app=replace(app,'var Me=window.React;','var Me=window.EdNovaReact||window.React;');
app=replace(app,'We={pseudo:"",lang:"fr"', 'We={pseudo:"",lang:window.EdNovaPreview.getLocale?.()||"fr"');
app=replace(app,'[a,s]=B.useState(We);','[a,s]=B.useState(We);B.useSyncExternalStore(window.EdNovaPreview.subscribeLocale||(()=>()=>{}),window.EdNovaPreview.getLocale||(()=>"fr"));');
app=replace(app,'t.createElement(ve,null)),e.saveMessage', 'window.EdNovaPreview.setLocale&&t.createElement("select",{"aria-label":"Langue",value:e.state.lang,onChange:event=>{const lang=event.target.value;window.EdNovaPreview.setLocale(lang);e.setState(previous=>({...previous,lang}));}},t.createElement("option",{value:"fr"},"Français"),t.createElement("option",{value:"en"},"English")),t.createElement(ve,null)),e.saveMessage');
app=replace(app,'Les formules restent les m\\xEAmes.','Utiliser EdNova en français.');
app=replace(app,'Les termes du manuel restent en fran\\xE7ais.','Utiliser EdNova en anglais.');
for(const lang of ['fr','en']){
  app=replace(app,'onChange:()=>n(s=>({...s,lang:"'+lang+'"}))',
    'onChange:()=>{window.EdNovaPreview.setLocale?.("'+lang+'");n(s=>({...s,lang:"'+lang+'"}))}');
}
write('src/onboarding.js',app);
write('src/components.css',read('vendor/components.css').replace(/@import url\([^;]+;/,''));
console.log('Built from approved bundles: markup/CSS preserved; six-card bank and bounded adapters applied.');
