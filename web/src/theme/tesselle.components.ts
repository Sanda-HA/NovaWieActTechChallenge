import type {ComponentStyleMap} from '@astryxdesign/core/theme';

// Hand-written component styling for Tesselle. Colours come from the theme tokens
// (Astryx roles, or the EdNova `--en-*` locals the generated theme declares).

// tokens.json focus-ring: a ground-coloured gap, then solid argile, on every keyboard-reachable field.
const FIELD_FOCUS = {
  ':focus-within': {
    outlineWidth: 'var(--focus-outline-width)',
    outlineStyle: 'solid',
    outlineColor: 'var(--focus-outline-color)',
    outlineOffset: 'var(--focus-outline-offset)',
  },
} as const;

const INPUT_STATUS = {
  'status:success': {'--color-border-success': 'var(--en-faience)', '--color-icon-success': 'var(--en-faience)'},
  'status:warning': {'--color-border-warning': 'var(--en-ocre-ink)', '--color-icon-warning': 'var(--en-ocre-ink)'},
  'status:error': {'--color-border-error': 'var(--en-harissa)', '--color-icon-error': 'var(--en-harissa)'},
} as const;

// These rules sit in the astryx-theme layer, below the app's own `ednova` layer. StyleX shares one atomic class per
// declaration, so an app style with the same declaration as an Astryx base style (`borderWidth: 0`, say) re-emits that
// class in `ednova` and silently beats the rule here. The reset layer already zeroes borders: don't restate it in app
// styles, and write a cleared outline as '0 none', not 'none'. theme/layerCollisions.test.ts keeps both out.
export const tesselleComponents: ComponentStyleMap = {
  button: {
    base: {borderRadius: 'var(--radius-element)'},
    'variant:primary': {':hover': {backgroundColor: 'var(--en-argile-strong)'}},
    // A secondary action is an outlined tile, never bare text that reads as a link.
    'variant:secondary': {borderWidth: '1px', borderColor: 'var(--en-line-strong)'},
  },
  banner: {
    'status:info': {
      '--color-info-muted': 'var(--en-surface-sunken)',
      '--color-on-info-muted': 'var(--en-ink)',
    },
  },
  badge: {
    'variant:info': {backgroundColor: 'var(--en-faience-soft)', color: 'var(--en-faience)'},
  },
  'progress-bar-fill': {
    'variant:accent': {backgroundColor: 'var(--en-argile)'},
    'variant:success': {backgroundColor: 'var(--en-faience)'},
    'variant:warning': {backgroundColor: 'var(--en-ocre)'},
    'variant:error': {backgroundColor: 'var(--en-harissa)'},
  },
  card: {
    base: {padding: 'clamp(var(--spacing-4), 3vw, var(--spacing-6))'},
  },
  section: {
    base: {padding: 'clamp(var(--spacing-4), 3vw, var(--spacing-6))'},
  },
  heading: {
    'level:1': {letterSpacing: 'var(--en-type-display-tracking)'},
    'level:2': {letterSpacing: 'var(--en-type-title-tracking)'},
    'level:3': {fontFamily: 'var(--font-family-body)'},
    'level:4': {fontFamily: 'var(--font-family-body)'},
    'level:5': {fontFamily: 'var(--font-family-body)'},
    'level:6': {fontFamily: 'var(--font-family-body)'},
    'type:display-1': {letterSpacing: 'var(--en-type-display-xl-tracking)'},
    'type:display-2': {letterSpacing: 'var(--en-type-display-tracking)'},
    'type:display-3': {letterSpacing: 'var(--en-type-title-tracking)'},
  },
  // Flat like a mosaic floor: the chosen segment is a tone step (surface on sunken), not a lifted tile.
  'segmented-control-item': {
    selected: {boxShadow: 'none'},
  },
  'selectable-card': {
    'selected:true': {backgroundColor: 'var(--en-argile-soft)'},
  },
  'text-input': {...INPUT_STATUS, base: FIELD_FOCUS},
  'text-area': {...INPUT_STATUS, base: FIELD_FOCUS},
  'number-input': INPUT_STATUS,
  'date-input': INPUT_STATUS,
  'time-input': INPUT_STATUS,
  // Same reading size as a TextInput, so a form reads as one column of fields.
  selector: {...INPUT_STATUS, base: {fontSize: 'var(--text-body-size)'}},
  'multi-selector': INPUT_STATUS,
  typeahead: INPUT_STATUS,
  tokenizer: INPUT_STATUS,
};
