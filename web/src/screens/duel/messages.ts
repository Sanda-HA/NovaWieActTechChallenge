import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import type {DraftError, DuelErrorCode} from '../../lib/duel';

export const ERRORS: Record<DuelErrorCode, MessageDescriptor> = {
  pro_required: msg`Le Duel Exam est réservé à l’offre Pro.`,
  opponent_unavailable: msg`Cet adversaire n’est pas disponible : il doit être membre de la salle et avoir l’offre Pro.`,
  active: msg`Un duel est déjà en cours dans cette salle. Attends sa fin pour en lancer un autre.`,
  self: msg`Tu ne peux pas t’inviter toi-même.`,
  invite_missing: msg`Cette invitation n’existe pas ou n’est plus disponible.`,
  invite_expired: msg`Cette invitation a expiré. Demande un nouveau duel.`,
  invite_closed: msg`Cette invitation n’est plus ouverte.`,
  lobby_closed: msg`Le duel a déjà démarré ou a été fermé.`,
  closed: msg`Ce duel est fermé.`,
  not_running: msg`Le duel n’est pas en cours.`,
  locked: msg`Tes réponses sont déjà rendues.`,
  stale: msg`Tes réponses ont été rechargées depuis le serveur. Vérifie-les puis recommence.`,
  invalid_answer: msg`Cette réponse n’est pas valide.`,
  rate_limited: msg`Trop d’essais. Réessaie dans une minute.`,
  code_unavailable: msg`Impossible de créer un code d’invitation pour l’instant. Réessaie.`,
  key_reused: msg`Cette action a changé : relance-la.`,
  not_found: msg`Ce duel est introuvable dans cette salle.`,
  network: msg`La connexion a été coupée. Réessaie.`,
  unavailable: msg`Le Duel Exam est momentanément indisponible. Réessaie.`,
};

export const DRAFT_ERRORS: Record<DraftError, MessageDescriptor> = {
  stale: ERRORS.stale,
  closed: msg`Le temps d’écriture est terminé : tes dernières modifications n’ont pas pu être enregistrées.`,
  invalid: ERRORS.invalid_answer,
  pro_required: ERRORS.pro_required,
  network: msg`Connexion perdue : tes dernières modifications ne sont pas enregistrées.`,
  unavailable: msg`Tes dernières modifications n’ont pas pu être enregistrées.`,
};
