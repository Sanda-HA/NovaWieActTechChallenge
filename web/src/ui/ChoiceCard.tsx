import * as stylex from '@stylexjs/stylex';
import {useState, type FocusEvent, type ReactNode} from 'react';
import {en} from '../theme/ednova.stylex';
import {Icon, type IconName} from './icons';

export interface ChoiceCardProps {
  type: 'radio' | 'checkbox';
  /** Radios that share a name are one group: one tab stop, arrow keys move the choice. */
  name?: string;
  title: string;
  description?: string;
  icon?: IconName;
  /** A drawing or formula that shows the choice; hidden from assistive technology. */
  art?: ReactNode;
  tag?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

const styles = stylex.create({
  card: {
    position: 'relative',
    display: 'grid',
    alignContent: 'start',
    gap: en.space3,
    minInlineSize: 0,
    padding: en.space4,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: {default: en.line, ':hover': en.lineStrong},
    borderRadius: en.radiusLg,
    backgroundColor: en.surface,
    boxShadow: en.shadowRaise,
    cursor: 'pointer',
    transitionProperty: 'border-color, box-shadow, background-color',
    transitionDuration: en.dur1,
    transitionTimingFunction: en.ease,
    WebkitTapHighlightColor: 'transparent',
  },
  checked: {
    borderColor: en.argile,
    backgroundColor: en.argileSoft,
    boxShadow: `inset 0 0 0 1px ${en.argile}, ${en.shadowRaise}`,
  },
  disabled: {cursor: 'not-allowed', opacity: 0.55},
  focus: {outline: `2px solid ${en.focus}`, outlineOffset: 2},
  // The real control covers the whole card and is invisible, so a click anywhere on the card lands on it
  // (a clipped 1px input has no point a pointer, or a test, can hit).
  input: {
    position: 'absolute',
    inset: 0,
    inlineSize: '100%',
    blockSize: '100%',
    margin: 0,
    opacity: 0,
    zIndex: 1,
    cursor: 'inherit',
  },
  art: {
    display: 'grid',
    placeItems: 'center',
    blockSize: 140,
    padding: en.space3,
    borderRadius: en.radiusMd,
    backgroundColor: en.surfaceSunken,
    color: en.ink,
    overflow: 'hidden',
  },
  head: {display: 'flex', alignItems: 'center', gap: en.space2, minInlineSize: 0},
  icon: {display: 'inline-flex', color: en.argileStrong},
  title: {
    flexGrow: 1,
    minInlineSize: 0,
    overflowWrap: 'anywhere',
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeLabelSize,
    lineHeight: en.typeLabelLeading,
    fontWeight: 600,
  },
  tag: {
    flexShrink: 0,
    paddingInline: en.space2,
    borderRadius: en.radiusTessera,
    backgroundColor: en.surfaceSunken,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: 600,
  },
  mark: {
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    inlineSize: 20,
    blockSize: 20,
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: en.lineStrong,
    borderRadius: en.radiusTessera,
    color: en.onArgile,
    transitionProperty: 'background-color, border-color',
    transitionDuration: en.dur1,
    transitionTimingFunction: en.ease,
  },
  markRadio: {borderRadius: en.radiusFull},
  markOn: {borderColor: en.argile, backgroundColor: en.argile},
  description: {
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
});

/**
 * A choice drawn as a card around a native radio or checkbox: the browser supplies the roles, the group
 * keyboard and the form semantics, and the card only paints the state.
 */
export function ChoiceCard({type, name, title, description, icon, art, tag, checked, disabled, onChange}: ChoiceCardProps): React.JSX.Element {
  const [focused, setFocused] = useState(false);
  const onFocus = (event: FocusEvent<HTMLInputElement>) => {
    try {
      setFocused(event.currentTarget.matches(':focus-visible'));
    } catch {
      setFocused(false);
    }
  };
  return (
    <label {...stylex.props(styles.card, checked && styles.checked, disabled && styles.disabled, focused && styles.focus)}>
      <input
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.currentTarget.checked)}
        onFocus={onFocus}
        onBlur={() => setFocused(false)}
        {...stylex.props(styles.input)}
      />
      {art != null && (
        <span aria-hidden="true" {...stylex.props(styles.art)}>
          {art}
        </span>
      )}
      <span {...stylex.props(styles.head)}>
        {icon && (
          <span aria-hidden="true" {...stylex.props(styles.icon)}>
            <Icon name={icon} size={20} />
          </span>
        )}
        <span {...stylex.props(styles.title)}>{title}</span>
        {tag && <span {...stylex.props(styles.tag)}>{tag}</span>}
        <span aria-hidden="true" {...stylex.props(styles.mark, type === 'radio' && styles.markRadio, checked && styles.markOn)}>
          {checked && <Icon name="check" size={16} />}
        </span>
      </span>
      {description && <span {...stylex.props(styles.description)}>{description}</span>}
    </label>
  );
}
