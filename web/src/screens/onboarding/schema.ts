import {z} from 'zod';

export const PSEUDO_PATTERN = /^[A-Za-z0-9]{3,30}$/;

/** Issue messages are codes: the form maps them to translated copy. */
export const pseudoSchema = z.string().trim().regex(PSEUDO_PATTERN, {error: 'pseudo'});
export const passwordSchema = z.string().min(8, {error: 'password'});

export const accountSchema = z.object({username: pseudoSchema, password: passwordSchema});
export type AccountValues = z.input<typeof accountSchema>;
