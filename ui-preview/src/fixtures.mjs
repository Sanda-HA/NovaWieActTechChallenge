export {bank,catalog} from './bank.mjs';
/** @typedef {import('./contracts').ChatResult} ChatResult */
const receipt={llm_calls:1,compact_calls:1,mid_calls:0,tokens_in:204,tokens_out:96,latency_ms:620,cache:null,events:[]};
/** @type {ChatResult} */
const success={response_id:'preview-response',mode:'explain',answer:'Pour $f(x)=3x^2$, la dérivée est $f\'(x)=6x$. On applique la règle de dérivation d’une puissance.',badge:'course',sources:[{chunk_id:'math_chunk_001',source:'Manuel, tome 2',page:147}],topic:'derivabilite',next_step:null,ai_generated:true,label:'Réponse générée par IA',capacity_level:'FULL',degraded:false,trace:[],receipt};
/** @type {Record<string,ChatResult>} */
export const chatFixtures={success,
 busy:{...success,badge:null,answer:'',sources:[],retry_after:12,capacity_level:'OFFLINE',receipt:{...receipt,llm_calls:0}},
 degraded:{...success,badge:'course_excerpt',answer:'La dérivée de la fonction $x \\mapsto x^2$ est la fonction $x \\mapsto 2x$.',ai_generated:false,label:'sans IA',capacity_level:'ECO',degraded:true},
 hint0:{...success,mode:'guided',hint_rung:0,answer:'Calcule la dérivée de $f(x)=3x^2$.'},
 hint1:{...success,mode:'guided',hint_rung:1,answer:'Utilise la règle $(x^n)\'=nx^{n-1}$.'},
 hint2:{...success,mode:'guided',hint_rung:2,answer:'Dérive d’abord $x^2$, puis conserve le coefficient 3.'},
};
export const scenarioNames=['success','empty','busy','degraded','error','hint0','hint1','hint2','mastery-null','mastery-zero','timer-idle','timer-running','timer-stopped','timer-error','permission','unknown','correct','incorrect','incomplete','login-failed','duplicate','expired','register-error','pending','delete-error','delete-success','save-success'];
/** @type {import('./contracts').Profile} */
export const profileFixture={level:'beginner',subjects:['math'],preferred_format:'examples',city:null,diagnostic_score:null,grade:'4eme_annee_secondaire',section:'mathematiques',subject:'math',reply_language:'fr'};
/** @type {import('./contracts').ProgressRow[]} */
export const progressFixture=[{topic:'probabilites',label:'Probabilités',mastery:0,attempts:1,solved:0,confusions:0},{topic:'derivabilite',label:'Dérivabilité',mastery:null,attempts:0,solved:0,confusions:0}];
