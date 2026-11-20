import {z} from 'zod';
import {normalizeCode} from '../../lib/rooms-store';

export const ROOM_NAME_MAX = 80;
export const CODE_LENGTH = 6;
export const EXPLANATION_MAX = 2000;

/** Issue messages are codes: the forms map them to translated copy. */
export const createRoomSchema = z.object({
  name: z.string().trim().min(1, {error: 'required'}).max(ROOM_NAME_MAX, {error: 'too_long'}),
});
export type CreateRoomValues = z.input<typeof createRoomSchema>;

/** The format check stays in the rooms store, which words the "bon format" error; here the code only has to exist. */
export const joinRoomSchema = z.object({
  code: z.string().transform(normalizeCode).pipe(z.string().min(1, {error: 'required'})),
});
export type JoinRoomValues = z.input<typeof joinRoomSchema>;

export const explanationSchema = z.object({
  explanation: z.string().trim().min(1, {error: 'required'}).max(EXPLANATION_MAX, {error: 'too_long'}),
});
export type ExplanationValues = z.input<typeof explanationSchema>;
