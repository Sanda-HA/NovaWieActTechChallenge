/** Mirrors implementation/wie-act/backend-api.openapi.json; static preview only. */
export interface Source {chunk_id:string; source:string; page:number|null}
export type Verdict='correct'|'incorrect'|'incomplete'|'unknown'|'wellbeing';
export interface AttemptResult {verdict:Verdict;issue:string;guiding_question:string;source:Source|null}
export interface ChatResult {
 response_id:string;answer:string;badge:'course'|'general'|'not_found'|'clarify'|'wellbeing'|'course_excerpt'|null;
 sources:Source[];topic:string|null;next_step:NextStep|null;ai_generated:boolean;label:string;
 mode:'explain'|'guided';degraded:boolean;receipt:Receipt;
 hint_rung?:number|null;retry_after?:number|null;capacity_level:'FULL'|'LEAN'|'ECO'|'OFFLINE';attempt_result?:AttemptResult|null;
 trace:{name:string;detail?:Record<string,unknown>;[key:string]:unknown}[];
}
export interface Receipt {llm_calls:number;compact_calls:number;mid_calls:number;tokens_in:number;tokens_out:number;latency_ms:number;cache:'exact'|'evidence'|'artifact'|null;events:string[];[key:string]:unknown}
export interface NextStep {kind:'exercise'|'prerequisite'|'next_topic';topic:string;label:string;request:{mode:'explain'|'guided';message:string}}
export interface DiagnosticCard {id:string;question:string;choices:{id:string;label:string}[]}
export interface Profile {level:'beginner'|'intermediate'|'advanced';subjects:string[];preferred_format:'analogy'|'examples'|'steps';city:string|null;diagnostic_score:number|null;grade:string;section:string;subject:string;reply_language:'fr'|'en'}
export interface ProgressRow {topic:string;label:string;mastery:number|null;attempts:number;solved:number;confusions:number;parent?:string}
export interface StudySession {id:number;started_at:string;ended_at:string|null}
