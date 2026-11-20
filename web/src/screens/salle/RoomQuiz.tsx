import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {useLingui} from '@lingui/react/macro';
import {useState} from 'react';
import {QuizPanel} from '../carte/QuizPanel';
import {shared} from './styles';

/** The chapter quiz of the quiz round, closable and reopenable. */
export function RoomQuiz({roomId, topic, label, active}: {roomId: string; topic: string; label: string; active: boolean}): React.JSX.Element | null {
  const {t} = useLingui();
  const [open, setOpen] = useState(active);
  return open ? (
    <QuizPanel roomId={roomId} topic={topic} label={label} canRestart={active} onClose={() => setOpen(false)} />
  ) : active ? (
    <div {...stylex.props(shared.actions)}>
      <Button variant="secondary" label={t`Quiz du chapitre`} onClick={() => setOpen(true)} />
    </div>
  ) : null;
}
