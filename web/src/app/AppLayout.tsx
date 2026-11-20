import * as stylex from '@stylexjs/stylex';
import {AppShell} from '@astryxdesign/core/AppShell';
import {useAnimator, useMediaQuery} from '@astryxdesign/core/hooks';
import type {IconType} from '@astryxdesign/core/Icon';
import {SideNav, SideNavHeading, SideNavItem} from '@astryxdesign/core/SideNav';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import type {MessageDescriptor} from '@lingui/core';
import {lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type SVGProps} from 'react';
import {Link, Outlet, useLocation, useNavigate} from 'react-router';
import {createRoomsStore} from '../lib/rooms-store';
import {en} from '../theme/ednova.stylex';
import {Icon, type IconName} from '../ui/icons';
import {Glyph} from '../ui/icons/Glyph';
import {Mark} from '../ui/Mark';
import {PlanChip} from '../screens/plans/PlanChip';
import {useSession} from './session';
import {ThemeToggle} from './ThemeToggle';

interface NavEntry {
  to: string;
  icon: IconName;
  glyph: IconType;
  label: MessageDescriptor;
  /** The phone bar's visible label; the full label stays the accessible name. */
  short?: MessageDescriptor;
}

// Stable component per icon, so SideNavItem colours and sizes it like its own glyphs.
const glyphOf = (name: IconName): IconType =>
  function NavGlyph({className}: SVGProps<SVGSVGElement>) {
    return <Glyph name={name} size="1em" className={className} />;
  };

const entry = (to: string, icon: IconName, label: MessageDescriptor, short?: MessageDescriptor): NavEntry => ({
  to,
  icon,
  glyph: glyphOf(icon),
  label,
  short,
});

// Copy and order from ui-preview's rail: five destinations, then Réglages apart.
const MAIN: readonly NavEntry[] = [
  entry('/accueil', 'tesserae', msg`Accueil`),
  entry('/tuteur', 'chat', msg`Tuteur`),
  entry('/carte', 'map', msg`Carte des chapitres`, msg`Carte`),
  entry('/seances', 'clock', msg`Temps d’étude`, msg`Temps`),
  entry('/salle', 'users', msg`Salle d’étude`, msg`Salle`),
];
const FOOT: readonly NavEntry[] = [entry('/reglages', 'settings', msg`Réglages`)];

// Loaded apart: the popover code is heavy and the shell paints before the timer does.
const FloatingTimer = lazy(() => import('./FloatingTimer').then(module => ({default: module.FloatingTimer})));

const PHONE = '(width < 640px)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const isCurrent = (pathname: string, to: string) => pathname === to || pathname.startsWith(`${to}/`);

const styles = stylex.create({
  // The shell paints no ground of its own, so the mosaic ground behind it shows through.
  shell: {display: 'contents', '--color-background-body': 'transparent'},
  frame: {
    boxSizing: 'border-box',
    inlineSize: '100%',
    maxInlineSize: 1240,
    marginInline: 'auto',
    paddingInline: {default: en.space8, '@media (width < 640px)': en.space4},
    paddingBlockStart: {default: en.space2, '@media (width < 640px)': en.space3},
    // Room for the phone bar and the home indicator under it.
    paddingBlockEnd: {
      default: en.space12,
      '@media (width < 640px)': `calc(${en.space16} + ${en.space8} + env(safe-area-inset-bottom, 0px))`,
    },
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: en.space2,
    minBlockSize: en.sizeTouch,
    marginBlockEnd: {default: en.space4, '@media (width < 640px)': en.space3},
  },
  actions: {display: 'flex', alignItems: 'center', gap: en.space1, marginInlineStart: 'auto'},
  screen: {display: 'grid', gap: en.space6, minInlineSize: 0},
  // The rail stays plain ground: nav labels never sit on grout lines.
  sideNav: {inlineSize: en.widthRail, backgroundColor: en.ground},
  bar: {
    position: 'fixed',
    insetInline: 0,
    insetBlockEnd: 0,
    zIndex: 10,
    paddingBlockStart: en.space2,
    paddingBlockEnd: `calc(${en.space2} + env(safe-area-inset-bottom, 0px))`,
    paddingInline: `max(${en.space1}, env(safe-area-inset-left, 0px))`,
    backgroundColor: en.surface,
    borderBlockStartWidth: 1,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: en.line,
  },
  barList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gap: 0,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  barItem: {
    display: 'grid',
    justifyItems: 'center',
    alignContent: 'center',
    gap: 2,
    minBlockSize: 52,
    paddingInline: 0,
    borderRadius: en.radiusMd,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: 600,
    textDecoration: 'none',
    WebkitTapHighlightColor: 'transparent',
    transitionProperty: 'background-color, color',
    transitionDuration: en.dur1,
    transitionTimingFunction: en.ease,
    outline: {default: '0 none', ':focus-visible': `2px solid ${en.focus}`},
    outlineOffset: 2,
  },
  barItemCurrent: {backgroundColor: en.surfaceSunken, color: en.ink},
  barLabel: {maxInlineSize: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'},
});

function SideNavigation({pathname}: {pathname: string}) {
  const {i18n, t} = useLingui();
  const item = (nav: NavEntry) => (
    <SideNavItem
      key={nav.to}
      href={nav.to}
      label={i18n._(nav.label)}
      icon={nav.glyph}
      isSelected={isCurrent(pathname, nav.to)}
    />
  );
  return (
    <SideNav
      aria-label={t`Navigation principale`}
      header={<SideNavHeading heading="Nova" icon={<Mark size={28} label="" />} />}
      footer={FOOT.map(item)}
      xstyle={styles.sideNav}>
      {MAIN.map(item)}
    </SideNav>
  );
}

function PhoneBar({pathname}: {pathname: string}) {
  const {i18n, t} = useLingui();
  return (
    <nav aria-label={t`Navigation principale`} {...stylex.props(styles.bar)}>
      <ul {...stylex.props(styles.barList)}>
        {[...MAIN, ...FOOT].map(nav => {
          const current = isCurrent(pathname, nav.to);
          const label = i18n._(nav.label);
          return (
            <li key={nav.to}>
              <Link
                to={nav.to}
                aria-label={nav.short ? label : undefined}
                aria-current={current ? 'page' : undefined}
                {...stylex.props(styles.barItem, current && styles.barItemCurrent)}>
                <Icon name={nav.icon} size={24} />
                <span {...stylex.props(styles.barLabel)}>{nav.short ? i18n._(nav.short) : label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Each screen settles in with a short rise; under reduced motion it just appears. */
function useScreenEntrance(pathname: string) {
  const ref = useRef<HTMLDivElement>(null);
  const animator = useAnimator(ref);
  const reduced = useMediaQuery(REDUCED_MOTION);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    animator.set({opacity: 0, y: 8});
    animator.animate({opacity: 1, y: 0}).catch(() => animator.set({opacity: 1, y: 0}));
  }, [pathname, animator, reduced]);
  return ref;
}

/** An invite link waits for sign-in; once the app is open, take the learner to the rooms (once). */
function usePendingInvite() {
  const {api} = useSession();
  const navigate = useNavigate();
  const [rooms] = useState(() => createRoomsStore(api));
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (rooms.hasPendingCode()) void navigate('/salle', {replace: true});
  }, [rooms, navigate]);
}

export function AppLayout(): React.JSX.Element {
  const {pathname} = useLocation();
  const phone = useMediaQuery(PHONE);
  const screenRef = useScreenEntrance(pathname);
  usePendingInvite();
  return (
    <div {...stylex.props(styles.shell)}>
      <AppShell
        height="auto"
        variant="wash"
        contentPadding={0}
        mobileNav={{breakpoint: 'sm', hasToggle: false}}
        sideNav={phone ? undefined : <SideNavigation pathname={pathname} />}>
        <div {...stylex.props(styles.frame)}>
          <div {...stylex.props(styles.toolbar)}>
            {phone && <Mark size={28} />}
            <div {...stylex.props(styles.actions)}>
              <PlanChip />
              <ThemeToggle />
              <Suspense fallback={null}>
                <FloatingTimer />
              </Suspense>
            </div>
          </div>
          <div ref={screenRef} {...stylex.props(styles.screen)}>
            <Outlet />
          </div>
        </div>
      </AppShell>
      {phone && <PhoneBar pathname={pathname} />}
    </div>
  );
}
