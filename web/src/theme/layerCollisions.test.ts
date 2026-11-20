import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

// An app style that repeats an Astryx base declaration shares its atomic class, which then also lands in the
// `ednova` layer and overrides the Tesselle theme (secondary button borders, field focus rings). See tesselle.components.ts.
const COLLIDING = [/\bborderWidth: 0\b/, /\boutline: 'none'/, /\boutline: \{default: 'none'/];

const sources = (dir: string): string[] =>
  readdirSync(dir, {withFileTypes: true}).flatMap(entry =>
    entry.isDirectory() ? sources(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : [],
  );

describe('theme layer collisions', () => {
  it('no app style restates an Astryx base declaration the theme overrides', () => {
    const offenders = sources(join(__dirname, '..')).flatMap(file =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) => (!/^\s*(\/\/|\*)/.test(line) && COLLIDING.some(pattern => pattern.test(line)) ? [`${file}:${index + 1}`] : [])),
    );
    expect(offenders).toStrictEqual([]);
  });
});
