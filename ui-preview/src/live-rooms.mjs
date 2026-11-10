const roomsPath = '/groups/rooms';

export function createRoomView(R,D,api) {
  const h = R.createElement;
  const getRooms = () => api.request('GET',roomsPath);

  return function RoomView({checkCard}) {
    const [rooms,setRooms] = R.useState([]);
    const [roomId,setRoomId] = R.useState('');
    const [name,setName] = R.useState('');
    const [code,setCode] = R.useState('');
    const [explanation,setExplanation] = R.useState('');
    const [verdict,setVerdict] = R.useState(null);
    const [closing,setClosing] = R.useState(false);
    const [loading,setLoading] = R.useState(true);
    const [busy,setBusy] = R.useState(false);
    const [error,setError] = R.useState('');
    const [notice,setNotice] = R.useState('');
    const pending = R.useRef(false);
    const room = rooms.find(item => item.id === roomId);

    R.useEffect(() => {
      let active = true;
      getRooms().then(items => {
        if (active) setRooms(items);
      }, error => {
        if (active && error.name !== 'AbortError') setError('Impossible de charger tes salles.');
      }).finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, []);

    async function run(work, failure) {
      if (pending.current) return;
      pending.current = true;
      setBusy(true);
      setError('');
      setNotice('');
      try { await work(); }
      catch (error) {
        if (error.name !== 'AbortError') setError(
          error.status === 404 ? 'Ce code ou cette salle n’est plus disponible.' : failure);
      } finally {
        pending.current = false;
        setBusy(false);
      }
    }

    function select(id) {
      setRoomId(id);
      setClosing(false);
      setVerdict(null);
      setExplanation('');
    }

    function openRoom(path,json,message) {
      return run(async () => {
        const entered = await api.request('POST',path,{json});
        setRooms(items => [...items.filter(item => item.id !== entered.id),entered]);
        select(entered.id);
        setNotice(h('span',null,'Salle ouverte : ',h('span',{translate:'no'},entered.name)));
      },message);
    }

    const submit = (label,disabled) => h(D.Button,{type:'submit',disabled:busy || loading || disabled},label);
    const form = (handler,...children) => h('form',{className:'grid gap-3',onSubmit:event => {
      event.preventDefault();
      handler();
    }},...children);
    return h(R.Fragment,null,
      h('div',{className:'grid gap-4 sm:grid-cols-2'},
        form(() => openRoom(roomsPath,{name:name.trim()},'Impossible de créer la salle.'),
          h(D.TextField,{label:'Nom de la salle',value:name,maxLength:80,onChange:event => setName(event.target.value)}),
          submit('Créer une salle',!name.trim())),
        form(() => openRoom(roomsPath + '/join',{code:code.trim()},'Vérifie le code d’invitation et réessaie.'),
          h(D.TextField,{label:'Code d’invitation',value:code,maxLength:36,onChange:event => setCode(event.target.value)}),
          submit('Rejoindre une salle',!code.trim()))),
      error && h('p',{role:'alert'},error),
      notice && h('p',{role:'status'},notice),
      h('section',{className:'grid gap-3 ed-tutor__header','aria-label':'Mes salles'},
        h('h2',{className:'heading'},'Mes salles'),
        h('div',null,h(D.Button,{disabled:busy || loading,icon:'refresh',onClick:() => run(async () => {
          const items = await getRooms();
          setRooms(items);
          if (roomId && !items.some(item => item.id === roomId)) select('');
        },'Impossible d’actualiser les salles.')},'Actualiser les salles et les membres')),
        loading ? h('p',{role:'status'},'Chargement…') : rooms.length === 0 ? h('p',null,'Tu ne fais encore partie d’aucune salle.')
          : h('label',{className:'label'},'Ouvrir une salle ',h('select',{
            value:roomId,disabled:busy,onChange:event => select(event.target.value),
          },h('option',{value:''},'Choisis une salle'),...rooms.map(item => h('option',{key:item.id,value:item.id,translate:'no'},item.name)))),
        room && h('section',{className:'grid gap-3','aria-label':room.name,translate:'no'},
          h('h3',{className:'heading',translate:'no'},room.name),
          room.invite_code && h(D.TextField,{label:'Code à partager',value:room.invite_code,readOnly:true}),
          h('h4',{className:'label'},'Membres (' + room.members.length + ')'),
          h('ul',null,room.members.map(member => h('li',{key:member,translate:'no'},member))),
          closing && h('p',null,'La salle sera fermée pour tous ses membres.'),
          h('div',{className:'flex flex-wrap gap-2'},
            h(D.Button,{disabled:busy,variant:closing ? 'danger' : 'secondary',onClick:() => {
              if (room.owner && !closing) { setClosing(true); return; }
              run(async () => {
                await api.request('DELETE',roomsPath + '/' + room.id);
                setRooms(items => items.filter(item => item.id !== room.id));
                select('');
                setNotice(room.owner ? 'Salle fermée.' : 'Tu as quitté la salle.');
              },'Impossible de quitter ou de fermer la salle.');
            }},room.owner ? (closing ? 'Confirmer la fermeture' : 'Fermer la salle') : 'Quitter la salle'),
            closing && h(D.Button,{disabled:busy,onClick:() => setClosing(false)},'Annuler')))),
      h('section',{className:'grid gap-3','aria-label':'Vérifier une explication'},
        h('h2',{className:'heading'},'Vérifier une explication'),
        h('p',null,room ? 'Retour de Nova dans le contexte de la salle. Ton texte et le retour restent privés.'
          : 'Explique une notion avec tes propres mots pour recevoir un retour de Nova.'),
        checkCard(verdict,'peer'),
        h('form',{className:'ed-explanation',onSubmit:event => {
          event.preventDefault();
          if (explanation.trim()) run(async () => {
            const path = room ? roomsPath + '/' + room.id + '/check' : '/groups/demo/check';
            setVerdict(await api.request('POST',path,{json:{explanation:explanation.trim()}}));
          },'Vérification indisponible.');
        }},
        h('label',{htmlFor:'explanation-draft',className:'label'},'Ton explication'),
        h('textarea',{id:'explanation-draft',value:explanation,rows:5,maxLength:2000,
          onChange:event => setExplanation(event.target.value)}),
        submit('Vérifier mon explication',!explanation.trim()))));
  };
}
