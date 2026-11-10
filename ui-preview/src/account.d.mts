export type AccountState = 'idle'|'registering'|'duplicate'|'register_failed'|'login_needed'|'logging_in'|'login_failed'|'signed_in';
export type AccountEvent = {type:'SUBMIT'|'REGISTER_OK'|'DUPLICATE'|'REGISTER_FAILED'|'LOGIN_FAILED'|'CREDENTIALS_EXPIRED'} | {type:'LOGIN_OK';access_token:string;token_type:string};
export function accountTransition(state:AccountState,event:AccountEvent):AccountState;
