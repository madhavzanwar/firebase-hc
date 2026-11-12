import { useEffect, useState } from 'react';

export type Route = { name: 'home' } | { name: 'report'; id: string } | { name: 'history'; test?: string } | { name: 'privacy' } | { name: 'help' };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  if (a === 'r' && b) return { name: 'report', id: decodeURIComponent(b) };
  if (a === 'history') return b ? { name: 'history', test: decodeURIComponent(b) } : { name: 'history' };
  if (a === 'privacy') return { name: 'privacy' };
  if (a === 'help') return { name: 'help' };
  return { name: 'home' };
}

export function href(r: Route): string {
  switch (r.name) {
    case 'home':
      return '#/';
    case 'report':
      return `#/r/${encodeURIComponent(r.id)}`;
    case 'history':
      return r.test ? `#/history/${encodeURIComponent(r.test)}` : '#/history';
    case 'privacy':
      return '#/privacy';
    case 'help':
      return '#/help';
  }
}

export function navigate(r: Route) {
  window.location.hash = href(r);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
