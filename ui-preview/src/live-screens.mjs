import {studyTools} from './onboarding-preferences.mjs';
import {createTutorView, threadTitle} from './live-tutor.mjs';
import {subjects} from './tutor-workspace.mjs';
import {createRoomView} from './live-rooms.mjs';
import {getLocale, localizedReact, setLocale, translate} from './i18n.mjs';

const privacy = "L'historique de tes échanges n'est pas enregistré dans ton compte.";
const presentations = {visual:'Visuel',reading:'Lecture'};
const sections = {mathematiques:'Mathématiques',sciences_experimentales:'Sciences expérimentales'};
const revisionTopics = {
  svt:['Photosynthèse','Transmission de l’information génétique','Immunité'],
  physics:['Lois de Newton','Circuits électriques et dipôle RC','Ondes'],
  chemistry:['Équilibrage des équations','Réactions acido-basiques','Cinétique chimique'],
  french:['Conjugaison','Analyse de texte','Argumentation'],
  english:['Temps verbaux','Compréhension écrite','Expression écrite'],
  history:['Révolution française','Révolution industrielle','Décolonisation'],
  geography:['Zones climatiques','Urbanisation','Mondialisation'],
  philosophy:['Liberté','Vérité','Justice'],
  computer_science:['Conditions et boucles','Fonctions','Listes et tableaux'],
};

export function createLiveScreen(api, signOut, tutor) {
  const R = window.React;
  const localized = localizedReact(R);
  const h = localized.createElement;
  const text = (message, role) => h('p', {role,className:'body text-ink-muted'}, message);
  const button = (label, onClick, disabled = false) => h(window.EdNova.Button,{onClick,disabled},label);
  const fields = {city:'Ville',subjects:'Matières'};
  const titles = {tuteur:'Tuteur',carte:'Carte des chapitres',seances:'Séances',salle:'Salle d’étude',reglages:'Réglages'};
  const get = path => api.request('GET',path);
  const post = (path,json) => api.request('POST',path,{json});

  let Tutor, Rooms;
  return function Screen({screen,pseudo,navigate}) {
    const D = window.EdNova;
    Tutor ??= createTutorView(localized,D);
    Rooms ??= createRoomView(localized,D,api);
    const tutorState = R.useSyncExternalStore(tutor.subscribe,tutor.getSnapshot);
    const [timer, setTimer] = R.useState(null);
    const [map, setMap] = R.useState(null);
    const [mapSubject, setMapSubject] = R.useState('math');
    const [profile, setProfile] = R.useState(null);
    const [typed, setTyped] = R.useState('');
    const [confirm, setConfirm] = R.useState(false);
    const [error, setError] = R.useState('');
    const [status, setStatus] = R.useState('');
    const [busy, setBusy] = R.useState(false);
    const pending = R.useRef(false);
    const retry = R.useRef(null);

    async function run(work, message) {
      if (pending.current) return;
      pending.current = true;
      setBusy(true);
      setError('');
      setStatus('');
      retry.current = () => run(work,message);
      try { await work(); retry.current = null; }
      catch (error) { if (error.name !== 'AbortError') setError(error.waiting ?? message); }
      finally { pending.current = false; setBusy(false); }
    }

    R.useEffect(() => {
      let active = true;
      setError('');
      setStatus('');
      retry.current = null;
      const load = async () => {
        if (screen === 'accueil' || screen === 'seances') {
          const data = await get('/study/summary');
          if (active) setTimer(data);
        }
        if (screen === 'carte' && mapSubject === 'math') {
          const data = await Promise.all([get('/topics'),get('/learning/progress')]);
          if (active) setMap(data);
        }
        if (screen === 'accueil' || screen === 'reglages') {
          const data = await get('/me/profile');
          if (active) setProfile({...data,subjects:data.subjects.join(', ')});
        }
      };
      const refresh = () => load().catch(error => {
        if (active && error.name !== 'AbortError') {
          retry.current = refresh;
          setError('Chargement indisponible. Réessaie.');
        }
      });
      refresh();
      return () => { active = false; };
    }, [screen,mapSubject]);

    const timerProps = timer ? {
      todayMinutes:timer.minutes_today,weekMinutes:timer.minutes_week,streakDays:timer.streak_days,
      running:timer.in_progress,sessionRunning:timer.in_progress,
      startedAt:timer.started_at ? Date.parse(timer.started_at) : undefined,
    } : {};
    const checkCard = (value, context) => value && h(D.VerdictCard,{
      context, verdict:value.verdict === 'unknown' ? 'incomplete' : value.verdict,
      title:value.verdict === 'unknown' ? "Je n'ai pas pu vérifier" : undefined,
      issue:value.issue,question:value.guiding_question,
    });
    let view;
    if (screen === 'accueil') {
      const tools = profile?.enabled_tools ?? [];
      const recent = tutorState.threads.find(thread => thread.id === tutorState.recentId);
      view = h(R.Fragment,null,h(D.HomeOverview,{...timerProps,name:h('span',{translate:'no'},pseudo),greeting:'Bonjour',subtitle:'Ton espace de révision',
        lastSession:recent ? {when:'cette visite',topic:h('span',{translate:'no'},threadTitle(recent)),onOpen:() => {tutor.select(recent.id);navigate('tuteur');}} : undefined,
        onPractise:() => {
          const id = tutor.newThread({subject:'math',mode:'guided'});
          navigate('tuteur');
          tutor.send(id,getLocale() === 'en' ? 'Give me an exercise on differentiability.' : 'Propose un exercice sur la dérivabilité.','new_question');
        },
        onAsk:() => navigate('tuteur'),
        onStartSession:() => navigate('seances')}),
        profile?.presentation && text('Présentation : ' + presentations[profile.presentation]),
        tools.length > 0 && h('section',{className:'grid gap-3','aria-label':'Tes outils'},
          h('h2',{className:'heading m-0'},'Tes outils'),
          tools.includes('guided') && button(studyTools.guided,() => {tutor.newThread({mode:'guided'});navigate('tuteur');}),
          tools.includes('feynman') && button(studyTools.feynman,() => navigate('salle'))));
    } else if (screen === 'tuteur') {
      view = h(Tutor,{workspace:tutor,snapshot:tutorState,checkCard,
        onFeedback:(responseId,feedback) => run(
          () => post('/tutor/feedback',{...feedback,response_id:responseId}),'Avis non envoyé.')});
    } else if (screen === 'carte') {
      const [catalog,progress] = map ?? [{topics:[],subtopics:[]},{topics:[],subtopics:[]}];
      const mastery = new Map([...progress.topics,...progress.subtopics].map(row => [row.topic,row]));
      const level = value => value == null ? 'unknown' : value < .4 ? 'weak' : value < .75 ? 'medium' : 'strong';
      const selectSubject = h('label',{className:'ed-tutor__header label'},'Matière ',
        h('select',{value:mapSubject,onChange:event => setMapSubject(event.target.value)},
          ...Object.entries(subjects).map(([id,subject]) => h('option',{key:id,value:id},subject.label))));
      const revise = topic => {
        const id = tutor.newThread({subject:mapSubject});
        navigate('tuteur');
        tutor.send(id,getLocale() === 'en' ? 'Help me review ' + translate(topic) + '.' : 'Aide-moi à réviser cette notion : ' + topic + '.');
      };
      view = h(R.Fragment,null,selectSubject,mapSubject !== 'math'
        ? h('section',{className:'grid gap-3','aria-label':'Pistes de révision'},
          h('h2',{className:'heading'},'Pistes de révision'),
          text('Révise ces notions avec Nova. Le suivi par chapitre est disponible en mathématiques.'),
          ...revisionTopics[mapSubject].map(topic => h('div',{key:topic},button('Réviser : ' + topic,() => revise(topic)))))
        : !map ? (!error && text('Chargement…','status')) : h(R.Fragment,null,text('Catalogue de mathématiques en brouillon'),
        h(D.ChapterMap,{label:'Carte des chapitres',topics:catalog.topics.map((topic,index) => ({
          id:topic.slug,name:topic.label,requires:topic.prerequisites,col:index%4,row:Math.floor(index/4),
          level:level(mastery.get(topic.slug)?.mastery),
        }))}),
        ...[...catalog.topics,...catalog.subtopics].map(topic => {
          const row = mastery.get(topic.slug);
          const value = row?.mastery;
          return h('section',{key:topic.slug},
            h(D.MasteryRow,{...row,chapter:topic.label,level:level(value)}),
            text(value == null ? 'Pas encore évalué' : Math.round(value*100) + ' %'));
        })));
    } else if (screen === 'seances' && timer) {
      const change = action => run(async () => {
        try { await post('/study/' + action); }
        catch (error) { if (action !== 'stop' || error.status !== 409) throw error; }
        setTimer(await get('/study/summary'));
      },'La séance n’a pas pu être mise à jour.');
      view = h('div',{inert:busy ? '' : undefined},
        h(D.StudyTimer,{...timerProps,onStart:() => change('start'),onStop:() => change('stop')}));
    } else if (screen === 'salle') {
      view = h(Rooms,{checkCard});
    } else if (screen === 'reglages' && profile) {
      const set = (field,value) => setProfile(previous => ({...previous,[field]:value}));
      const save = event => {
        event.preventDefault();
        run(async () => {
          const data = await api.request('PUT','/me/profile',{json:{
            city:profile.city?.trim() ?? '',subjects:profile.subjects.split(',').map(item => item.trim()).filter(Boolean),
            level:profile.level,section:profile.section,reply_language:profile.reply_language,
            presentation:profile.presentation,enabled_tools:profile.enabled_tools,
          }});
          setProfile({...data,subjects:data.subjects.join(', ')});
          setLocale(data.reply_language);
          setStatus('Réglages enregistrés.');
        },'Les réglages n’ont pas pu être enregistrés.');
      };
      view = h(R.Fragment,null,h('form',{className:'grid gap-4',onSubmit:save},
        ...Object.entries(fields).map(([key,label]) => h(D.TextField,{key,label,value:profile[key] ?? '',maxLength:key === 'city' ? 50 : undefined,onChange:event => set(key,event.target.value)})),
        h('label',null,'Niveau ',h('select',{value:profile.level,onChange:event => set('level',event.target.value)},
          ...[['beginner','Débutant'],['intermediate','Intermédiaire'],['advanced','Avancé']].map(([value,label]) => h('option',{key:value,value},label)))),
        h('label',null,'Section du bac ',h('select',{value:profile.section,onChange:event => set('section',event.target.value)},
          !Object.hasOwn(sections,profile.section) && h('option',{value:profile.section},profile.section),
          ...Object.entries(sections).map(([value,label]) => h('option',{key:value,value},label)))),
        h('label',null,'Langue ',h('select',{value:profile.reply_language,onChange:event => set('reply_language',event.target.value)},
          h('option',{value:'fr'},'Français'),h('option',{value:'en'},'English'))),
        h('label',null,'Présentation ',h('select',{value:profile.presentation ?? '',onChange:event => set('presentation',event.target.value || null)},
          h('option',{value:''},'Selon le diagnostic'),
          ...Object.entries(presentations).map(([value,label]) => h('option',{key:value,value},label)))),
        h('fieldset',{className:'grid gap-2'},h('legend',null,'Raccourcis sur l’accueil'),
          ...Object.entries(studyTools).map(([value,label]) => h('label',{key:value,className:'flex items-center gap-2'},
            h('input',{type:'checkbox',checked:profile.enabled_tools.includes(value),onChange:event => set('enabled_tools',
              event.target.checked ? [...profile.enabled_tools,value] : profile.enabled_tools.filter(tool => tool !== value))}),label))),
        h(D.Button,{type:'submit',disabled:busy},'Enregistrer')),
        text(privacy),button('Se déconnecter',signOut),
        confirm ? h(R.Fragment,null,h(D.TextField,{label:'Confirme ton pseudo',value:typed,onChange:event => setTyped(event.target.value)}),
          h(D.Button,{variant:'danger',disabled:busy || typed !== pseudo,onClick:() => run(async () => {
            await api.request('DELETE','/auth/me');
            signOut();
          },'La suppression a échoué.')},'Supprimer définitivement'),
          button('Annuler',() => {setConfirm(false);setTyped('');setError('');retry.current=null;},busy))
          : button('Supprimer mon compte',() => setConfirm(true)));
    }
    return h('main',{className:'step-enter grid gap-8'},
      titles[screen] && h('h1',{className:'title m-0'},titles[screen]),
      error && h('div',null,text(error,'alert'),retry.current && button('Réessayer',retry.current,busy)),
      status && text(status,'status'),busy && text('Chargement…','status'),
      view ?? (!error && text('Chargement…','status')));
  };
}
