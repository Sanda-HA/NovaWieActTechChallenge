import type * as React from 'react';

/* Navigation and pages ----------------------------------------------------- */

export interface NavItem {
  id: string;
  label: string;
  /** One short word for the phone bar; defaults to label. */
  shortLabel?: string;
  icon: IconName;
  /** Makes the item a real link (Cmd/Ctrl-click still works). */
  href?: string;
  /** A small argile tile; a number is read out as a count. */
  badge?: boolean | number;
}
export interface NavRailProps {
  items: NavItem[];
  /** Pinned to the bottom of the rail (Réglages). */
  footerItems?: NavItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  /** rail: floating vertical pill (≥1024px). bar: labelled bottom bar (phones). */
  layout?: 'rail' | 'bar';
  brand?: React.ReactNode;
  label?: string;
}
export declare function NavRail(props: NavRailProps): React.ReactElement;

export interface HomeOverviewProps {
  name: string;
  /** Computed on the client from the local hour. */
  greeting?: string;
  subtitle?: string;
  weakest?: { chapter: string; level: MasteryLevel; attempts?: number; solved?: number; confusions?: number };
  onPractise?: () => void;
  onAsk?: () => void;
  todayMinutes: number;
  weekMinutes: number;
  streakDays: number;
  sessionRunning?: boolean;
  onStartSession?: () => void;
  nextStep?: NextStepChipProps;
  lastSession?: { topic: string; when: string; onOpen?: () => void };
}
export declare function HomeOverview(props: HomeOverviewProps): React.ReactElement;

/* Foundations ------------------------------------------------------------- */

export type IconName =
  | 'book' | 'book-open' | 'compass' | 'question' | 'not-found' | 'quote' | 'jasmine' | 'stairs' | 'pen' | 'new-question'
  | 'check' | 'x' | 'arrow-right' | 'arrow-up' | 'thumb-up' | 'thumb-down' | 'clock' | 'play' | 'stop' | 'lock' | 'user'
  | 'users' | 'tesserae' | 'home' | 'map' | 'chat' | 'settings' | 'chevron-down' | 'chevron-right' | 'chevron-left' | 'info' | 'alert'
  | 'hourglass' | 'eye' | 'eye-off' | 'log-out' | 'trash' | 'target' | 'review' | 'forward' | 'receipt' | 'refresh' | 'copy'
  | 'sun' | 'moon';

export interface IconProps {
  name: IconName;
  /** px, default 20 (size-icon) */
  size?: number;
  /** Accessible name; omit for decorative icons beside a text label. */
  label?: string;
  className?: string;
}
export declare function Icon(props: IconProps): React.ReactElement;

export interface MathTextProps {
  /** Text with formulas between $…$ (inline) or $$…$$ (display); \$ for a literal dollar. */
  children?: string;
  /** One formula without delimiters; wins over children. */
  tex?: string;
  display?: boolean;
  as?: 'span' | 'div' | 'p';
  className?: string;
}
export declare function MathText(props: MathTextProps): React.ReactElement;

export type MascotState = 'welcoming' | 'thinking' | 'cheering' | 'encouraging' | 'calm';
export interface MascotProps {
  state?: MascotState;
  /** px, default 120 */
  size?: number;
  /** Accessible name; omit when decorative. */
  label?: string;
  className?: string;
}
/** Nova the axolotl; embeds the artwork from Assets › Mascot with per-instance ids. */
export declare function Mascot(props: MascotProps): React.ReactElement;

export interface MarkProps {
  /** px, default 32 */
  size?: number;
  /** Accessible name, default "EdNova"; "" when a visible name sits beside it. */
  label?: string;
  /** brand: mark-ribbon and mark-turn tokens (follows Jour/Nuit). mono: currentColor. */
  tone?: 'brand' | 'mono';
  className?: string;
}
/** The Rise mark: the folded ribbon N with its turned page. */
export declare function Mark(props: MarkProps): React.ReactElement;

/* Actions ----------------------------------------------------------------- */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconEnd?: IconName;
  /** Spinner, clicks ignored; end the label with “…”. */
  loading?: boolean;
  block?: boolean;
}
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;

export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  hint?: string;
  /** Inline error that says how to fix it. */
  error?: string;
}
export declare const TextField: React.ForwardRefExoticComponent<TextFieldProps & React.RefAttributes<HTMLInputElement>>;

/* Tutor ------------------------------------------------------------------- */

export type AnswerKind = 'course' | 'general' | 'not_found' | 'clarify' | 'excerpt' | 'wellbeing';
export type Stage = 'understanding' | 'searching' | 'writing' | 'verifying';

export interface AiLabelProps { label?: string; className?: string }
export declare function AiLabel(props: AiLabelProps): React.ReactElement;

export interface SourceChipProps {
  page: number | string;
  /** default “Manuel, tome 2” */
  book?: string;
  /** Opens the cited extract; makes the chip a button. */
  onOpen?: () => void;
  className?: string;
}
export declare function SourceChip(props: SourceChipProps): React.ReactElement;

export interface AnswerBadgeProps { kind: AnswerKind; className?: string }
export declare function AnswerBadge(props: AnswerBadgeProps): React.ReactElement;

export interface StageIndicatorProps {
  stage: Stage;
  failed?: boolean;
  onRetry?: () => void;
  /** Nova thinking beside the tiles, default true */
  mascot?: boolean;
}
export declare function StageIndicator(props: StageIndicatorProps): React.ReactElement;

export interface AnswerBubbleProps {
  kind: AnswerKind;
  /** A string is typeset with MathText; blank lines start paragraphs. */
  children?: React.ReactNode;
  streaming?: boolean;
  stage?: Stage;
  failed?: boolean;
  onRetry?: () => void;
  sources?: SourceChipProps[];
  /** Backend `ai_generated`; default true except for excerpts. */
  aiGenerated?: boolean;
  aiLabel?: string;
  /** NextStepChip, FeedbackControl, Receipt — shown once final. */
  footer?: React.ReactNode;
}
export declare function AnswerBubble(props: AnswerBubbleProps): React.ReactElement;

export interface StudentMessageProps { children: string; attempt?: boolean }
export declare function StudentMessage(props: StudentMessageProps): React.ReactElement;

export interface WellbeingMessageProps {
  title?: string;
  children?: React.ReactNode;
  aiGenerated?: boolean;
  aiLabel?: string;
}
export declare function WellbeingMessage(props: WellbeingMessageProps): React.ReactElement;

export interface BusyBannerProps {
  /** Seconds, from the 503 `retry_after`. */
  retryAfter: number;
  /** Called once at zero, and by “Réessayer maintenant”. */
  onRetry: () => void;
  excerpt?: { text: string; source?: SourceChipProps };
}
export declare function BusyBanner(props: BusyBannerProps): React.ReactElement;

export type NextStepKind = 'practise' | 'review' | 'move_on';
export interface NextStepChipProps {
  kind: NextStepKind;
  label: string;
  /** The ready-to-send message from `next_step`. */
  message: string;
  onSend: (message: string) => void;
  disabled?: boolean;
}
export declare function NextStepChip(props: NextStepChipProps): React.ReactElement;

export type FeedbackReason = 'wrong' | 'unclear' | 'too_long' | 'not_my_level';
export interface FeedbackControlProps { onSubmit: (value: { helpful: boolean; reason?: FeedbackReason }) => void }
export declare function FeedbackControl(props: FeedbackControlProps): React.ReactElement;

export interface ReceiptProps {
  modelCalls: number;
  tokens: number;
  cacheHits: number;
  durationMs?: number;
  steps?: { label: string; ms?: number }[];
  defaultOpen?: boolean;
}
export declare function Receipt(props: ReceiptProps): React.ReactElement;

export type TutorMode = 'free' | 'guided';
export interface ComposerProps {
  onSend: (text: string, mode: TutorMode) => void;
  mode?: TutorMode;
  onModeChange?: (mode: TutorMode) => void;
  busy?: boolean;
  /** Guided mode after “Ma réponse”: the next message is an attempt. */
  attempt?: boolean;
  placeholder?: string;
}
export declare function Composer(props: ComposerProps): React.ReactElement;

/* Guided practice --------------------------------------------------------- */

export interface HintLadderProps { used: number; total?: number; solved?: boolean; compact?: boolean }
export declare function HintLadder(props: HintLadderProps): React.ReactElement;

export interface GuidedActionBarProps {
  used: number;
  total?: number;
  solved?: boolean;
  waiting?: boolean;
  onHint: () => void;
  onAttempt: () => void;
  onNewQuestion: () => void;
}
export declare function GuidedActionBar(props: GuidedActionBarProps): React.ReactElement;

export type Verdict = 'correct' | 'incomplete' | 'incorrect' | 'wellbeing';
export interface VerdictCardProps {
  verdict: Verdict;
  context?: 'peer' | 'attempt';
  issue?: string;
  question?: string;
  source?: SourceChipProps;
  mascot?: boolean;
}
export declare function VerdictCard(props: VerdictCardProps): React.ReactElement;

export interface QuizChoice { id: string; label: string }
export interface QuizResult { style: string; level: string; summary: string }
export interface QuizCardProps {
  step: number;
  total: number;
  question: string;
  choices: QuizChoice[];
  selected?: string;
  onSelect?: (id: string) => void;
  onNext?: () => void;
  result?: QuizResult;
}
export declare function QuizCard(props: QuizCardProps): React.ReactElement;

export interface ChoiceTileProps {
  title: string;
  description?: string;
  icon?: IconName;
  /** Illustration above the title. */
  art?: React.ReactNode;
  selected?: boolean;
  onChange?: (selected: boolean) => void;
  /** Checkbox behaviour (several on) instead of radio (one on). */
  multiple?: boolean;
  /** e.g. “Bientôt” */
  tag?: string;
  disabled?: boolean;
}
export declare function ChoiceTile(props: ChoiceTileProps): React.ReactElement;

/* Progress ---------------------------------------------------------------- */

export type MasteryLevel = 'unknown' | 'weak' | 'medium' | 'strong';
export interface MasteryTesseraProps {
  level: MasteryLevel;
  size?: number;
  /** Defaults to the French level word; "" when a visible label sits beside it. */
  label?: string;
  palette?: Record<string, string>;
  className?: string;
}
export declare function MasteryTessera(props: MasteryTesseraProps): React.ReactElement;

export interface MasteryRowProps {
  chapter: string;
  level: MasteryLevel;
  attempts?: number;
  solved?: number;
  confusions?: number;
  onOpen?: () => void;
}
export declare function MasteryRow(props: MasteryRowProps): React.ReactElement;

export interface MapTopic { id: string; name: string; level: MasteryLevel; col: number; row: number; requires?: string[] }
export interface ChapterMapProps { topics: MapTopic[]; currentId?: string; onOpen?: (id: string) => void; label?: string }
export declare function ChapterMap(props: ChapterMapProps): React.ReactElement;
export interface TopicNodeProps { name: string; level: MasteryLevel; current?: boolean; onOpen?: () => void }
export declare function TopicNode(props: TopicNodeProps): React.ReactElement;

export interface StudyTimerProps {
  running: boolean;
  /** ms since epoch, from POST /study/start */
  startedAt?: number;
  onStart: () => void;
  onStop: () => void;
  todayMinutes: number;
  weekMinutes: number;
  streakDays: number;
  compact?: boolean;
}
export declare function StudyTimer(props: StudyTimerProps): React.ReactElement;

export interface StreakProps { days: number; showNext?: boolean }
export declare function Streak(props: StreakProps): React.ReactElement;

export type BadgeTier = 'argile' | 'faience' | 'marbre' | 'lapis' | 'or';
export interface AchievementBadgeProps {
  tier: BadgeTier;
  title: string;
  /** What earns it: understanding or consistency, never time spent. */
  criterion: string;
  glyph?: IconName;
  earned?: boolean;
}
export declare function AchievementBadge(props: AchievementBadgeProps): React.ReactElement;

declare global {
  interface Window {
    EdNova: {
      NavRail: typeof NavRail; HomeOverview: typeof HomeOverview;
      Icon: typeof Icon; MathText: typeof MathText; Mascot: typeof Mascot; Mark: typeof Mark; Button: typeof Button; TextField: typeof TextField;
      AiLabel: typeof AiLabel; SourceChip: typeof SourceChip; AnswerBadge: typeof AnswerBadge; StageIndicator: typeof StageIndicator;
      AnswerBubble: typeof AnswerBubble; StudentMessage: typeof StudentMessage; WellbeingMessage: typeof WellbeingMessage;
      BusyBanner: typeof BusyBanner; NextStepChip: typeof NextStepChip; FeedbackControl: typeof FeedbackControl; Receipt: typeof Receipt;
      Composer: typeof Composer; HintLadder: typeof HintLadder; GuidedActionBar: typeof GuidedActionBar; VerdictCard: typeof VerdictCard;
      QuizCard: typeof QuizCard; ChoiceTile: typeof ChoiceTile; MasteryTessera: typeof MasteryTessera; MasteryRow: typeof MasteryRow; ChapterMap: typeof ChapterMap;
      TopicNode: typeof TopicNode; StudyTimer: typeof StudyTimer; Streak: typeof Streak; AchievementBadge: typeof AchievementBadge;
    };
  }
}
