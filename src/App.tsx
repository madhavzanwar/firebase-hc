import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoute } from './app/router';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { Help } from './pages/Help';
import { Home } from './pages/Home';
import { Privacy } from './pages/Privacy';
import { ReportPage } from './pages/ReportPage';

const History = lazy(() => import('./pages/History').then((m) => ({ default: m.History })));

export default function App() {
  const route = useRoute();
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col">
      <Header current={route.name} />
      <StatusBar />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 focus:outline-none">
        {route.name === 'home' && <Home />}
        {route.name === 'report' && <ReportPage id={route.id} />}
        {route.name === 'history' && (
          <Suspense fallback={<p className="text-slate-600">…</p>}>
            <History test={route.test} />
          </Suspense>
        )}
        {route.name === 'privacy' && <Privacy />}
        {route.name === 'help' && <Help />}
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-slate-600">
          {t('home.disclaimer')} · Built with Firebase AI Logic hybrid inference · Apache-2.0
        </p>
      </footer>
    </div>
  );
}
