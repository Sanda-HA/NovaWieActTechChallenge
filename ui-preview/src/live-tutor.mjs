import {answerBlocks, answerInline, subjects} from './tutor-workspace.mjs';
import {translate} from './i18n.mjs';

const privacy = "L'historique de tes échanges n'est pas enregistré dans ton compte.";
const starters = [
  'Explique-moi une notion de mon cours avec un exemple.',
  'Aide-moi à préparer une fiche de révision.',
  'Propose un exercice pour m’entraîner.',
];

export const subjectLabel = subject => subjects[subject]?.label ?? 'Sans matière';
export const threadTitle = thread => {
  const first = thread.turns[0]?.message.replace(/\s+/g,' ');
  return first ? (first.length > 52 ? first.slice(0,51) + '…' : first) : 'Nouvelle conversation';
};

export function createTutorView(R, D) {
  const h = R.createElement;
  const button = (label, onClick, props = {}) => h(D.Button,{onClick,...props},label);
  const math = (text, key) => h(D.MathText,{key},text);
  function inline(text) {
    return answerInline(text).map((part,index) => part.kind === 'code'
      ? h('code',{key:index},part.text)
      : part.kind === 'strong' ? h('strong',{key:index},math(part.text)) : math(part.text,index));
  }
  function answer(text) {
    return h('div',{className:'ed-tutor__answer'},answerBlocks(text).map((block,index) => {
      if (block.kind === 'code') return h('pre',{key:index,tabIndex:0},h('code',null,block.text));
      if (block.kind === 'list') return h(block.ordered ? 'ol' : 'ul',{key:index},
        block.items.map((item,i) => h('li',{key:i},inline(item))));
      return h(block.kind === 'heading' ? 'h3' : 'p',{key:index},inline(block.text));
    }));
  }
  return function TutorView({workspace, snapshot, onFeedback, checkCard}) {
    const thread = snapshot.threads.find(item => item.id === snapshot.activeId);
    const {id, subject, turns, mode, attempt} = thread;
    const last = turns.at(-1);
    const busy = last?.status === 'pending';
    const result = turns.findLast(turn => turn.status === 'complete')?.result;
    const waitingHint = mode === 'guided' && result?.mode === 'guided' &&
      result.hint_rung != null && result.hint_rung >= 0 && result.hint_rung < 3;
    const log = R.useRef(null);
    const [inputError, setInputError] = R.useState('');
    R.useEffect(() => {
      if (log.current) log.current.scrollTop = log.current.scrollHeight;
    },[id,last]);
    R.useEffect(() => setInputError(''),[id]);

    const send = (message, action, nextMode) => {
      if (message.length > 2000) {
        setInputError('Limite de 2 000 caractères par message.');
        return;
      }
      setInputError('');
      if (nextMode) workspace.setMode(id,nextMode);
      workspace.send(id,message,action);
    };
    function guardComposer(event) {
      const draft = event.currentTarget.querySelector('textarea');
      if (draft?.value.trim().length > 2000) {
        event.preventDefault();
        event.stopPropagation();
        setInputError('Limite de 2 000 caractères par message. Raccourcis ton texte et renvoie-le.');
        draft.focus();
      }
    }
    const starterPrompts = subject ? [subjects[subject].prompt,...starters.slice(1)] : starters;
    const newExercise = subject ? 'Propose un nouvel exercice dans cette matière.' : 'Propose un nouvel exercice.';

    return h('div',{className:'ed-tutor'},
      h('aside',{className:'ed-tutor__history','aria-label':'Conversations'},
        h('h2',{className:'heading'},'Conversations'),
        button('Nouvelle conversation',() => workspace.newThread(),{icon:'new-question',block:true}),
        h('ul',{className:'ed-tutor__threads'},snapshot.threads.map(item => h('li',{key:item.id},
          h('button',{type:'button',onClick:() => workspace.select(item.id),
            'aria-current':item.id === id ? 'true' : undefined},
          h('span',{className:'micro'},subjectLabel(item.subject)),
        h('span',{className:'label',translate:'no'},item.turns.length ? threadTitle(item) : translate(threadTitle(item)))))))),
      h('section',{className:'ed-tutor__conversation','aria-label':'Conversation avec le tuteur'},
        h('header',{className:'ed-tutor__header'},
          h('label',{className:'label'},'Matière ',h('select',{value:subject,disabled:turns.length > 0,
            onChange:event => workspace.setSubject(id,event.target.value)},
          h('option',{value:''},'Sans préférence'),
          ...Object.entries(subjects).map(([value,{label}]) => h('option',{key:value,value},label)))),
          h('p',{className:'caption text-ink-muted'},privacy)),
        turns.length === 0 ? h('div',{className:'ed-tutor__starters'},
          h('h2',{className:'heading'},'Que veux-tu apprendre aujourd’hui ?'),
          h('p',{className:'body text-ink-muted'},'Pose une question ou choisis une idée pour commencer.'),
          h('div',null,starterPrompts.map(prompt => button(prompt,() => send(translate(prompt),mode === 'guided' ? 'new_question' : 'auto'),{key:prompt}))))
          : h('div',{ref:log,role:'log','aria-label':'Messages',className:'ed-tutor__log',tabIndex:0},
            turns.map((turn,index) => h('article',{key:id + ':' + index,className:'ed-tutor__turn'},
              h(D.StudentMessage,{attempt:turn.action === 'attempt',translate:'no'},turn.message),
              turn.status === 'pending' && h(D.StageIndicator,{stage:'writing'}),
              turn.status === 'failed' && h('div',{className:'ed-tutor__error'},
                h('p',{role:'alert'},turn.error),
                turn === last && button('Réessayer',() => workspace.retry(id),{icon:'refresh'})),
              turn.result && h(R.Fragment,null,h(D.AnswerBubble,{
                kind:turn.result.badge === 'course_excerpt' ? 'excerpt' : turn.result.badge || 'clarify',
                aiGenerated:turn.result.ai_generated,aiLabel:turn.result.label,
                sources:turn.result.sources.map(source => ({page:source.page ?? 'non précisée',book:source.source})),
                footer:h(D.FeedbackControl,{onSubmit:feedback => onFeedback(turn.result.response_id,feedback)}),
              },answer(turn.result.answer)),checkCard(turn.result.attempt_result,'attempt'))))),
        result?.next_step?.request && button(result.next_step.label,() => {
          const next = result.next_step.request;
          send(next.message,next.mode === 'guided' ? 'new_question' : 'auto',next.mode === 'guided' ? 'guided' : 'free');
        },{disabled:busy}),
        waitingHint && h(D.GuidedActionBar,{
          used:result.hint_rung,total:2,waiting:busy,
          onHint:() => {if (waitingHint && result.hint_rung < 2) send(translate('Un indice, s’il te plaît.'),'hint');},
          onAttempt:() => {if (waitingHint) workspace.setAttempt(id);},
          onNewQuestion:() => send(translate(newExercise),'new_question'),
        }),
        mode === 'guided' && !waitingHint && turns.length > 0 &&
          button('Nouvel exercice',() => send(translate(newExercise),'new_question'),{disabled:busy,icon:'new-question'}),
        inputError && h('p',{role:'alert'},inputError),
        h('div',{onSubmitCapture:guardComposer,onKeyDownCapture:event => {
          if (event.target.tagName === 'TEXTAREA' && event.key === 'Enter' &&
            !event.shiftKey && !event.nativeEvent.isComposing) guardComposer(event);
        },onInput:event => {
          if (inputError && event.target.value.trim().length <= 2000) setInputError('');
        }},h(D.Composer,{key:id,mode,onModeChange:next => workspace.setMode(id,next),busy,attempt,
          placeholder:attempt ? 'Écris ta réponse…' : 'Pose ta question…',
          onSend:message => send(message,attempt ? 'attempt' : mode === 'guided' && !waitingHint ? 'new_question' : 'auto')}))));
  };
}
