import React, { useState, Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useLenis } from "./lib/useLenis";
import { Cursor } from "./components/Cursor";
import { LoadSequence } from "./components/LoadSequence";

const Landing      = lazy(() => import("./pages/Landing"));
const Download     = lazy(() => import("./pages/Download"));
const Activate     = lazy(() => import("./pages/Activate"));
const RecoverH     = lazy(() => import("./pages/RecoverH"));
const Gift         = lazy(() => import("./pages/Gift"));
const About        = lazy(() => import("./pages/About"));
const GuideIndex   = lazy(() => import("./pages/GuideIndex"));
const GuidePost    = lazy(() => import("./pages/GuidePost"));
const Support      = lazy(() => import("./pages/Support"));
const Privacy      = lazy(() => import("./pages/Privacy"));
const Terms        = lazy(() => import("./pages/Terms"));
const Refund       = lazy(() => import("./pages/Refund"));
const AcceptableUse = lazy(() => import("./pages/AcceptableUse"));
const Beta         = lazy(() => import("./pages/Beta"));
const Labs         = lazy(() => import("./pages/Labs"));
const LabsHandbook = lazy(() => import("./pages/LabsHandbook"));
const LabsApply    = lazy(() => import("./pages/LabsApply"));
const HeroLab      = lazy(() => import("./pages/HeroLab"));
const NotFound     = lazy(() => import("./pages/NotFound"));
import "./index.css";

function safeSessionGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function safeSessionSet(key: string, val: string): void {
  try { sessionStorage.setItem(key, val); } catch { /* private mode */ }
}

function AppRoot() {
  useLenis();

  const [introComplete, setIntroComplete] = useState(
    () => safeSessionGet('heirvo-intro') === '1'
  );

  const handleIntroComplete = () => {
    safeSessionSet('heirvo-intro', '1');
    setIntroComplete(true);
    window.dispatchEvent(new CustomEvent('heirvo:ready'));
  };

  return (
    <>
      <LoadSequence
        wordmark="Heirvo"
        accentColor="#93c5fd"
        skip={introComplete}
        onComplete={handleIntroComplete}
      />
      <Cursor />
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/download" element={<Download />} />
          <Route path="/activate" element={<Activate />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/support" element={<Support />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/acceptable-use" element={<AcceptableUse />} />
          <Route path="/recover" element={<RecoverH />} />
          <Route path="/recover-h" element={<RecoverH />} />
          <Route path="/gift" element={<Gift />} />
          <Route path="/about" element={<About />} />
          <Route path="/guides" element={<GuideIndex />} />
          <Route path="/guides/:slug" element={<GuidePost />} />
          <Route path="/beta" element={<Beta />} />
          <Route path="/hn" element={<Beta />} />
          <Route path="/labs" element={<Labs />} />
          <Route path="/operators" element={<Labs />} />
          <Route path="/labs/handbook" element={<LabsHandbook />} />
          <Route path="/labs/apply"    element={<LabsApply />} />
          <Route path="/hero-lab"      element={<HeroLab />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { crashed: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { crashed: false };
  }
  componentDidCatch() {
    document.body.style.overflow = '';
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'ui-sans-serif, system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#666', marginBottom: '1rem' }}>Something went wrong loading the page.</div>
          <a href="/" style={{ fontSize: 14, color: '#0A84FF' }}>Reload</a>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AppRoot />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
);
