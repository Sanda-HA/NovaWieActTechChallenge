import type {Api, ApiError, Quiz, QuizResult} from './types';

export type QuizStatus = 'idle' | 'loading' | 'ready' | 'failed' | 'submitting' | 'graded';

export interface QuizError {
  code:'busy'|'not_in_course'|'expired'|'pro_required'|'quiz_round_inactive'|'unavailable'; retryAfter:number|null;
}

export interface QuizState {
  status:QuizStatus; topic:string|null; quiz:Quiz|null; step:number; answers:Record<string, number>;
  result:QuizResult|null; error:QuizError|null; deadline:number|null;
}

const idle:QuizState = {status:'idle', topic:null, quiz:null, step:0, answers:{}, result:null, error:null, deadline:null};

/** Where a quiz comes from: a chapter (Pro), the fixed sample (everyone), the room's quiz round, or timed Bac practice (Pro). */
export interface QuizSource {
  sample?:boolean; roomId?:string; timed?:boolean;
}

export function createQuiz(api:Pick<Api, 'request'>, now:() => number = Date.now) {
  let serial = 0;
  let state = idle;
  const listeners = new Set<() => void>();
  const publish = (patch:Partial<QuizState>) => {
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };
  const describe = (error:unknown, expiredStatus?:boolean):QuizError => {
    const failure = error as ApiError;
    return {
      code: failure.code === 'pro_required' ? 'pro_required'
        : failure.code === 'quiz_round_inactive' ? 'quiz_round_inactive'
        : failure.status === 503 ? 'busy'
        : failure.status === 404 && failure.code === 'not_in_course' ? 'not_in_course'
        : failure.status === 404 && expiredStatus ? 'expired' : 'unavailable',
      retryAfter: failure.retryAfter ?? null,
    };
  };
  const complete = () => state.quiz?.questions.every(question => question.id in state.answers);
  const timedOut = () => state.deadline !== null && now() >= state.deadline;

  return {
    getSnapshot:() => state,
    getState:() => state,
    subscribe(listener:() => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      serial++;
      publish(idle);
    },
    async load(topic:string, {sample = false, roomId, timed = false}:QuizSource = {}) {
      const mine = ++serial;
      publish({...idle, status:'loading', topic});
      try {
        const path = sample ? '/learning/sample-quiz'
          : roomId ? '/groups/rooms/' + encodeURIComponent(roomId) + '/session/quiz'
          : timed ? '/learning/bac-practice/' + encodeURIComponent(topic)
          : '/learning/quiz/' + encodeURIComponent(topic);
        const quiz = await api.request<Quiz>('GET', path);
        const seconds = quiz.duration_seconds;
        if (timed && (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0)) throw new Error('Missing quiz duration');
        if (mine === serial) publish({status:'ready', quiz, deadline:timed ? now() + seconds! * 1000 : null});
      } catch (error) {
        if (mine !== serial) return;
        if ((error as ApiError).name === 'AbortError') publish(idle);
        else publish({status:'failed', error:describe(error)});
      }
    },
    select(questionId:string, index:number) {
      const known = state.quiz?.questions.some(question => question.id === questionId);
      if (state.status === 'ready' && !timedOut() && known && Number.isInteger(index) && index >= 0 && index <= 3) {
        publish({answers:{...state.answers, [questionId]:index}});
      }
    },
    next() {
      const current = state.quiz?.questions[state.step];
      if (state.status === 'ready' && !timedOut() && current !== undefined && current.id in state.answers
        && state.quiz && state.step < state.quiz.questions.length - 1) {
        publish({step:state.step + 1});
      }
    },
    async submit() {
      const quiz = state.quiz;
      if (!['ready', 'failed'].includes(state.status) || !quiz || !(timedOut() || complete())) return;
      const mine = serial;
      publish({status:'submitting', error:null});
      try {
        const result = await api.request<QuizResult>('POST', '/learning/quiz/' + quiz.quiz_id + '/answers',
          {json:{answers:state.answers}});
        if (mine === serial) publish({status:'graded', result});
      } catch (error) {
        if (mine !== serial) return;
        if ((error as ApiError).name === 'AbortError') publish(idle);
        else publish({status:'failed', error:describe(error, true)});
      }
    },
  };
}
