import {Button} from '@astryxdesign/core/Button';
import {useLingui} from '@lingui/react/macro';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {useSession} from '../../app/session';
import {isProRequired, planOf} from '../../lib/plans';
import type {ApiError, StudentPlan} from '../../lib/types';
import {useProfile} from '../accueil/queries';
import {LockedNotice} from '../plans/LockedNotice';
import './MindMaps.css';

type Subject = 'math' | 'physics' | 'svt';
interface Chapter {topic: string; subject: Subject; title: string}
interface MapNode {id: string; label: string; children: MapNode[]}
interface SavedMap {
  subject: Subject;
  reply_language: 'fr' | 'en' | 'ar';
  source_revision: number;
  root: MapNode;
}
interface MapResult {map: SavedMap | null; update_available: boolean}
interface MapActions {
  onAsk: (subject: Subject, message: string) => void;
  onRevision?: () => void;
}

const path = '/learning/mind-maps';
const width = 225;
const height = 86;

function layout(root: MapNode, expanded: Set<string>, rtl: boolean) {
  const nodes: {node: MapNode; x: number; y: number}[] = [];
  const edges: {from: typeof nodes[number]; to: typeof nodes[number]}[] = [];
  let row = 0;
  let maxDepth = 0;
  function place(node: MapNode, depth: number) {
    const pos = {node, x: 12 + depth * 285, y: 0};
    nodes.push(pos);
    maxDepth = Math.max(maxDepth, depth);
    const children = node.id === 'root' || expanded.has(node.id) ? node.children.map(child => place(child, depth + 1)) : [];
    const first = children[0];
    const last = children.at(-1);
    pos.y = first && last ? (first.y + last.y) / 2 : 12 + row++ * 106;
    for (const child of children) edges.push({from: pos, to: child});
    return pos;
  }
  place(root, 0);
  const totalWidth = 24 + maxDepth * 285 + width;
  if (rtl) {
    for (const pos of nodes) pos.x = totalWidth - pos.x - width;
  }
  return {nodes, edges, totalWidth, totalHeight: 24 + (row - 1) * 106 + height};
}

function findPath(node: MapNode, id: string): MapNode[] | undefined {
  if (node.id === id) return [node];
  for (const child of node.children) {
    const found = findPath(child, id);
    if (found) return [node, ...found];
  }
}

function prompt(language: SavedMap['reply_language'], chapter: string, concept?: string, parent?: string) {
  if (language === 'en') return concept === undefined ? `Explain ${chapter} with a short example.`
    : `In ${chapter}, explain ${concept}${parent ? ` under ${parent}` : ''} with a short example.`;
  if (language === 'ar') return concept === undefined ? `اشرح ${chapter} مع مثال قصير.`
    : `في درس ${chapter}، اشرح ${concept}${parent ? ` ضمن ${parent}` : ''} مع مثال قصير.`;
  return concept === undefined ? `Explique ${chapter} avec un exemple court.`
    : `Dans le chapitre « ${chapter} », explique « ${concept} »${parent ? ` dans la partie « ${parent} »` : ''} avec un exemple court.`;
}

function MapTree({map, reading, onAsk, onRevision}: MapActions & {map: SavedMap; reading: boolean}) {
  const {t} = useLingui();
  const [view, setView] = useState<'graph' | 'outline' | null>(null);
  const [compact, setCompact] = useState(() => window.matchMedia?.('(max-width: 767px)').matches ?? false);
  const [expanded, setExpanded] = useState(new Set<string>());
  const [selected, setSelected] = useState(map.root.id);
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const reset = useRef(false);
  const outline = view ? view === 'outline' : compact || reading;
  const rtl = map.reply_language === 'ar';
  const selectedPath = findPath(map.root, selected) ?? [map.root];
  const {nodes, edges, totalWidth, totalHeight} = layout(map.root, expanded, rtl);

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 767px)');
    if (!media) return;
    const update = (event: MediaQueryListEvent) => setCompact(event.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useLayoutEffect(() => {
    if (viewport.current) viewport.current.scrollLeft = rtl ? viewport.current.scrollWidth : 0;
  }, [outline, rtl]);
  useLayoutEffect(() => {
    if (!reset.current || !viewport.current) return;
    reset.current = false;
    viewport.current.scrollTo({left: rtl ? viewport.current.scrollWidth : 0, top: 0});
  }, [rtl, zoom]);

  function controls(node: MapNode) {
    const open = expanded.has(node.id);
    const label = node.label;
    return (
      <div className="mind-map-node">
        <button type="button" className="mind-map-label" lang={map.reply_language} dir="auto"
          aria-pressed={selected === node.id} onClick={() => setSelected(node.id)}>{node.label}</button>
        {node.id !== map.root.id && node.children.length > 0 && (
          <button type="button" className="mind-map-toggle" aria-expanded={open}
            aria-label={open ? t`Replier ${label}` : t`Développer ${label}`}
            onClick={event => {
              const next = new Set(expanded);
              if (next.delete(node.id)) {
                if (selected !== node.id && selectedPath.includes(node)) {
                  setSelected(node.id);
                  event.currentTarget.focus();
                }
              } else next.add(node.id);
              setExpanded(next);
            }}>{open ? '−' : '+'}</button>
        )}
      </div>
    );
  }

  function outlineItem(node: MapNode) {
    return (
      <li key={node.id}>{controls(node)}
        {(node.id === map.root.id || expanded.has(node.id)) && node.children.length > 0 && <ul>{node.children.map(outlineItem)}</ul>}
      </li>
    );
  }

  return (
    <>
      <div className="mind-map-actions" role="group" aria-label={t`Affichage de la carte`}>
        <button type="button" aria-pressed={!outline} onClick={() => setView('graph')}>{t`Carte`}</button>
        <button type="button" aria-pressed={outline} onClick={() => setView('outline')}>{t`Plan`}</button>
        {!outline && (
          <>
            <Button variant="ghost" label={t`Zoom arrière`} isDisabled={zoom <= .75} onClick={() => setZoom(zoom - .25)} />
            <Button variant="ghost" label={t`Zoom avant`} isDisabled={zoom >= 1.5} onClick={() => setZoom(zoom + .25)} />
            <Button variant="ghost" label={t`Réinitialiser le zoom`} onClick={() => {
              if (zoom === 1 && viewport.current) viewport.current.scrollTo({left: rtl ? viewport.current.scrollWidth : 0, top: 0});
              else {reset.current = true; setZoom(1);}
            }} />
          </>
        )}
        <Button variant="ghost" label={t`Demander à Nova`} onClick={() => onAsk(map.subject, prompt(
          map.reply_language, map.root.label, selectedPath.length > 1 ? selectedPath.at(-1)?.label : undefined,
          selectedPath.length > 2 ? selectedPath.at(-2)?.label : undefined,
        ))} />
        {onRevision && <Button variant="ghost" label={t`Ouvrir la fiche de révision`} onClick={onRevision} />}
      </div>
      {outline ? <ul className="mind-map-outline" dir={rtl ? 'rtl' : 'ltr'}>{outlineItem(map.root)}</ul> : (
        <div ref={viewport} className="mind-map-viewport" role="region" aria-label={t`Carte des notions`} tabIndex={0}>
          <div className="mind-map-scroll" style={{width: totalWidth * zoom, height: totalHeight * zoom}}>
            <div className="mind-map-plane" style={{width: totalWidth, height: totalHeight, transform: `scale(${zoom})`}}>
              <svg width={totalWidth} height={totalHeight} aria-hidden="true" focusable="false">
                {edges.map(({from, to}) => {
                  const x1 = from.x + (rtl ? 0 : width);
                  const x2 = to.x + (rtl ? width : 0);
                  const y1 = from.y + height / 2;
                  const y2 = to.y + height / 2;
                  const mid = (x1 + x2) / 2;
                  return <path key={to.node.id} d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`} />;
                })}
              </svg>
              {nodes.map(({node, x, y}) => (
                <div key={node.id} className="mind-map-position" style={{left: x, top: y, width, height}}>{controls(node)}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MapCard({scope, chapter, plan, reading, onAsk, onRevision}: MapActions & {
  scope: string; chapter: Chapter; plan: StudentPlan | null; reading: boolean;
}) {
  const {t} = useLingui();
  const {api} = useSession();
  const client = useQueryClient();
  const key = ['mind-map', scope, chapter.topic] as const;
  const endpoint = path + '/' + encodeURIComponent(chapter.topic);
  const saved = useQuery({
    queryKey: key, queryFn: ({signal}) => api.request<MapResult>('GET', endpoint, {signal}), retry: false,
  });
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [availableAt, setAvailableAt] = useState(0);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (plan === 'pro') setFailure(previous => isProRequired(previous) ? null : previous);
  }, [plan]);
  useEffect(() => {
    if (!availableAt) return;
    const timer = setTimeout(() => setAvailableAt(0), Math.max(0, availableAt - Date.now()));
    return () => clearTimeout(timer);
  }, [availableAt]);

  async function generate() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setFailure(null);
    try {
      const result = await api.request<MapResult>('POST', endpoint, {signal: controller.signal});
      if (!controller.signal.aborted) client.setQueryData(key, result);
    } catch (error) {
      if (controller.signal.aborted || (error as Error).name === 'AbortError') return;
      const apiError = error as ApiError;
      setFailure(apiError);
      const delay = apiError.retryAfter ?? 0;
      if (delay > 0) setAvailableAt(Date.now() + delay * 1000);
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (!controller.signal.aborted) setBusy(false);
      }
    }
  }

  const seconds = Math.ceil(failure?.retryAfter ?? 0);
  const map = saved.data?.map;
  const missing = saved.data && (!map || saved.data.update_available);
  return (
    <>
      {saved.isPending && <p role="status">{t`Chargement de la carte…`}</p>}
      {busy && <p role="status">{t`Nova prépare ta carte…`}</p>}
      {saved.isError && (
        <div role="alert">
          <p>{t`La carte est indisponible.`}</p>
          <Button label={t`Réessayer`} variant="secondary" onClick={() => void saved.refetch()} />
        </div>
      )}
      {failure && !isProRequired(failure) && (
        <p role="alert">{failure.code === 'not_in_course' ? t`Les sources du cours sont indisponibles pour cette carte.`
          : availableAt ? t`Nova est très sollicitée. Réessaie dans ${seconds} s.`
          : t`La carte est indisponible. Tu peux réessayer.`}</p>
      )}
      {missing && (plan === 'free' || isProRequired(failure)) && <LockedNotice title={t`Cartes mentales`} />}
      {missing && plan === 'pro' && !isProRequired(failure) && (
        <div>
          <Button variant="primary" label={map ? t`Mettre à jour la carte` : t`Générer la carte`}
            isLoading={busy} isDisabled={busy || Boolean(availableAt)} onClick={() => void generate()} />
        </div>
      )}
      {map && <MapTree key={map.source_revision} map={map} reading={reading} onAsk={onAsk}
        onRevision={chapter.topic === 'derivabilite' && plan === 'pro' ? onRevision : undefined} />}
    </>
  );
}

export function MindMaps({subject, selected, onSelect, onAsk, onRevision}: MapActions & {
  subject: string; selected?: string; onSelect?: (chapter: string) => void;
}) {
  const {t} = useLingui();
  const {api, pseudo} = useSession();
  const profile = useProfile().data;
  const supported = subject === 'math' || subject === 'physics' || subject === 'svt';
  const [choice, setChoice] = useState('');
  const title = useId();
  const scope = JSON.stringify([pseudo, profile?.grade, profile?.section, profile?.reply_language]);
  const chapters = useQuery({
    queryKey: ['mind-map-chapters', scope], enabled: supported && Boolean(profile),
    queryFn: ({signal}) => api.request<{chapters: Chapter[]}>('GET', path, {signal}), retry: false,
  });
  const options = (chapters.data?.chapters ?? []).filter(chapter => chapter.subject === subject);
  const chapter = options.find(item => item.topic === (selected ?? choice));
  if (!supported || (!chapters.isError && options.length === 0)) return null;
  return (
    <section className="mind-map-card" aria-labelledby={title}>
      <h2 id={title}>{t`Cartes mentales`}</h2>
      {chapters.isError ? <Button variant="secondary" label={t`Réessayer`} onClick={() => void chapters.refetch()} /> : (
        <>
          <label>{t`Chapitre`}{' '}
            <select value={chapter?.topic ?? ''} onChange={event => (onSelect ?? setChoice)(event.target.value)}>
              <option value="">{t`Choisir un chapitre`}</option>
              {options.map(item => <option key={item.topic} value={item.topic} dir="auto">{item.title}</option>)}
            </select>
          </label>
          {chapter && (
            <MapCard key={scope + chapter.topic} scope={scope} chapter={chapter} plan={planOf(profile)}
              reading={profile?.presentation === 'reading'} onAsk={onAsk} onRevision={onRevision} />
          )}
        </>
      )}
    </section>
  );
}
