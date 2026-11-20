/** Mirrors implementation/wie-act/backend-api.openapi.json; copied from ui-preview/src/contracts.ts. */
export interface Source {chunk_id:string; source:string; page:number|null}
export type Verdict = 'correct' | 'incorrect' | 'incomplete' | 'unknown' | 'wellbeing';
export interface AttemptResult {verdict:Verdict; issue:string; guiding_question:string; source:Source|null}
export interface ChatResult {
  response_id:string; answer:string; badge:'course'|'general'|'not_found'|'clarify'|'wellbeing'|'course_excerpt'|null;
  sources:Source[]; topic:string|null; next_step:NextStep|null; ai_generated:boolean; label:string;
  mode:'explain'|'guided'; degraded:boolean; receipt:Receipt;
  hint_rung?:number|null; retry_after?:number|null; capacity_level:'FULL'|'LEAN'|'ECO'|'OFFLINE'; attempt_result?:AttemptResult|null;
  trace:{name:string; detail?:Record<string, unknown>; [key:string]:unknown}[];
}
export interface Receipt {
  llm_calls:number; compact_calls:number; mid_calls:number; tokens_in:number; tokens_out:number; latency_ms:number;
  cache:'exact'|'evidence'|'artifact'|null; events:string[]; [key:string]:unknown;
}
export interface NextStep {kind:'exercise'|'prerequisite'|'next_topic'|'practice_mistake'; topic:string; label:string; request:{mode:'explain'|'guided'; message:string}}
export interface DiagnosticCard {id:string; question:string; choices:{id:string; label:string}[]}
export type StudentPlan = 'free' | 'pro';
export interface Profile {
  readonly student_plan:StudentPlan; readonly pro_requested:boolean;
  level:'beginner'|'intermediate'|'advanced'; subjects:string[]; preferred_format:'analogy'|'examples'|'steps'; city:string|null;
  diagnostic_score:number|null; grade:string; section:string; subject:string; reply_language:'fr'|'en'|'ar';
}
export interface ProgressRow {topic:string; label:string; mastery:number|null; attempts:number; solved:number; confusions:number; parent?:string}
export interface StudySession {id:number; started_at:string; ended_at:string|null}

export interface QuizQuestion {id:string; question:string; choices:string[]}
/** The room quiz also says which language it was served in; timed Bac practice says how long it lasts. */
export interface Quiz {quiz_id:string; topic:string; questions:QuizQuestion[]; language?:'fr'|'en'|'ar'; duration_seconds?:number}
export interface MistakePractice {session_id:string; message:string}
export interface QuizResult {
  score:number; total:number;
  results:{id:string; correct:boolean; answer_index:number; explanation:string; source:Source|null}[];
}

export interface StudySummary {
  in_progress:boolean; planned_end:string|null; minutes_today?:number; minutes_week?:number; streak_days?:number;
}

export interface Room {
  id:string; name:string; owner:boolean; members:string[]; invite_code:string; already_member?:boolean; owner_pseudo?:string;
  tutor_enabled?:boolean; tutor_round_prompts?:boolean; tutor_version?:number;
}

export interface OnboardingChoices {
  lang:'fr'|'en'|'ar'; section?:string; style:'visuel'|'lecture'|null; tools:Set<string>;
}

export type AccountState = 'idle'|'registering'|'duplicate'|'register_failed'|'login_needed'|'logging_in'|'login_failed'|'signed_in';
export type AccountEvent =
  {type:'SUBMIT'|'REGISTER_OK'|'DUPLICATE'|'REGISTER_FAILED'|'LOGIN_FAILED'|'CREDENTIALS_EXPIRED'}
  | {type:'LOGIN_OK'; access_token:string; token_type:string};

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface RequestOptions {
  json?:unknown; form?:URLSearchParams; signal?:AbortSignal; auth?:boolean; accept?:string; headers?:Record<string, string>;
}

export interface StreamOptions {
  json?:unknown; signal?:AbortSignal; onEvent?:(kind:string, body:unknown) => void;
}

export interface Api {
  setToken(value:string|undefined):void;
  hasToken():boolean;
  clear():void;
  request<T = unknown>(method:string, path:string, options?:RequestOptions):Promise<T>;
  stream<T = unknown>(path:string, options:StreamOptions):Promise<T>;
}

export interface ApiError extends Error {
  status?:number; code?:string; feature?:string; retryAfter?:number|null;
}
