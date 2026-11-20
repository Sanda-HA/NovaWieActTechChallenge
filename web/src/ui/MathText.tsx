import * as stylex from '@stylexjs/stylex';
import katex from 'katex';
import {Fragment, useMemo, type ReactNode} from 'react';

export interface MathTextProps {
  /** Text with formulas between $…$ (inline) or $$…$$ (display); \$ is a literal dollar. */
  text: string;
}

type Part = {text: string} | {tex: string; display: boolean};

const styles = stylex.create({
  math: {unicodeBidi: 'isolate'},
  display: {display: 'block', marginBlock: '0.75rem', paddingBlock: '2px', overflowX: 'auto', overflowY: 'hidden'},
  glue: {whiteSpace: 'nowrap'},
  wrap: {whiteSpace: 'normal'},
  tail: {whiteSpace: 'nowrap'},
});

const className = (style: stylex.StyleXStyles): string => stylex.props(style).className ?? '';
const WRAP = className(styles.wrap);
const TAIL = className(styles.tail);

export function splitMath(source: string): Part[] {
  const parts: Part[] = [];
  const pattern = /\$\$([\s\S]+?)\$\$|(?<!\\)\$((?:\\\$|[^$])+?)\$/g;
  let last = 0;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    if (match.index > last) parts.push({text: source.slice(last, match.index).replace(/\\\$/g, '$')});
    parts.push(match[1] != null ? {tex: match[1].trim(), display: true} : {tex: (match[2] ?? '').trim(), display: false});
    last = pattern.lastIndex;
  }
  if (last < source.length) parts.push({text: source.slice(last).replace(/\\\$/g, '$')});
  return parts;
}

function typeset(tex: string, display: boolean): string {
  return katex.renderToString(tex, {displayMode: display, throwOnError: false, trust: false, strict: 'ignore', output: 'htmlAndMathml'});
}

/** Lets the formula wrap inside, but keeps its last piece on the line of the punctuation that follows. */
function withTail(html: string): string {
  const markup = html.replace('class="katex-html"', `class="katex-html ${WRAP}"`);
  const start = markup.lastIndexOf('<span class="base">');
  const end = markup.lastIndexOf('</span></span>');
  if (start < 0 || end < start) return markup;
  return `${markup.slice(0, start)}<span class="${TAIL}">${markup.slice(start, end)}</span>${markup.slice(end)}`;
}

function Formula({tex, display, trailing}: {tex: string; display: boolean; trailing?: string}) {
  const html = useMemo(() => typeset(tex, display), [tex, display]);
  if (trailing) {
    return (
      <span {...stylex.props(styles.glue)}>
        <span dir="ltr" {...stylex.props(styles.math)} dangerouslySetInnerHTML={{__html: withTail(html)}} />
        {trailing}
      </span>
    );
  }
  return <span dir="ltr" {...stylex.props(styles.math, display && styles.display)} dangerouslySetInnerHTML={{__html: html}} />;
}

const PUNCTUATION = /^(?:[  ]?[.,;:!?)\]»…])+/;

/** Text with KaTeX maths. Formulas stay left to right inside right-to-left text. */
export function MathText({text}: MathTextProps): React.JSX.Element {
  const parts = splitMath(text);
  const nodes: ReactNode[] = [];
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (!part) continue;
    if ('text' in part) {
      nodes.push(<Fragment key={index}>{part.text}</Fragment>);
      continue;
    }
    const after = parts[index + 1];
    const trailing = !part.display && after && 'text' in after ? PUNCTUATION.exec(after.text)?.[0] : undefined;
    nodes.push(<Formula key={index} tex={part.tex} display={part.display} trailing={trailing} />);
    if (trailing && after && 'text' in after) {
      if (after.text.length > trailing.length) nodes.push(<Fragment key={index + 1}>{after.text.slice(trailing.length)}</Fragment>);
      index++;
    }
  }
  return <span>{nodes}</span>;
}
