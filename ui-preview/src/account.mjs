/** Pure offline controller. Credentials stay in the active form, never in this state. */
export function accountTransition(state,event) {
 if(event.type==='SUBMIT') {
  if(['idle','duplicate','register_failed'].includes(state)) return 'registering';
  if(['login_needed','login_failed'].includes(state)) return 'logging_in';
 }
 if(state==='registering') {
  if(event.type==='REGISTER_OK') return 'login_needed';
  if(event.type==='DUPLICATE') return 'duplicate';
  if(event.type==='REGISTER_FAILED') return 'register_failed';
 }
 if(state==='logging_in') {
  if(event.type==='LOGIN_OK') return typeof event.access_token==='string' && event.access_token.trim() && event.token_type==='bearer' ? 'signed_in' : 'login_failed';
  if(['LOGIN_FAILED','CREDENTIALS_EXPIRED'].includes(event.type)) return 'login_failed';
 }
 return state;
}
