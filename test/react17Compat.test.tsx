/** @jest-environment jsdom */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { cleanup, render, screen } from '@testing-library/react';
import { useUid } from '../src/plugin/controls/useUid';

afterEach(cleanup);

// Superset 6.1.0 ships React 17 (superset-frontend/package.json: "react": "^17.0.2"), and the
// plugin runs inside it. These tests run on React 18, so they cannot notice an API that only React
// 18 has: this scan does.
const REACT_18_ONLY =
  /\b(useId|useTransition|useDeferredValue|useSyncExternalStore|useInsertionEffect|startTransition|createRoot|hydrateRoot|flushSync)\b/;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });

describe('React 17 compatibility', () => {
  it('uses no API that only React 18 has in the plugin sources', () => {
    const offenders = sourceFiles(join(__dirname, '..', 'src'))
      .filter(path => REACT_18_ONLY.test(readFileSync(path, 'utf-8')))
      .map(path => path.replace(join(__dirname, '..') + '\\', '').replace(/\\/g, '/'));
    expect(offenders).toEqual([]);
  });
});

describe('useUid', () => {
  const Probe = ({ name }: { name: string }) => <span data-testid={name}>{useUid('t')}</span>;

  it('gives each component instance its own id', () => {
    render(
      <>
        <Probe name="a" />
        <Probe name="b" />
      </>,
    );
    const a = screen.getByTestId('a').textContent;
    const b = screen.getByTestId('b').textContent;
    expect(a).toMatch(/^t-\d+$/);
    expect(a).not.toBe(b);
  });

  it('keeps the same id when the component renders again', () => {
    const { rerender } = render(<Probe name="a" />);
    const first = screen.getByTestId('a').textContent;
    rerender(<Probe name="a" />);
    expect(screen.getByTestId('a').textContent).toBe(first);
  });

  it('builds ids that are safe in a list or for attribute', () => {
    render(<Probe name="a" />);
    expect(screen.getByTestId('a').textContent).not.toMatch(/[:\s]/);
  });
});
