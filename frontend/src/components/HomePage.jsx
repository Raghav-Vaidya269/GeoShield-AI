import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight, Layers3, MapPinned, Mountain, Route, Shield, Sparkles } from 'lucide-react';
import heroImage from './image.png';

const NAV_ITEMS = [
  { id: 'risk-map', label: 'Risk Map', icon: MapPinned },
  { id: 'simulation', label: 'Simulation', icon: Mountain },
];

const featureCards = [
  {
    title: 'Landslide Risk Prediction',
    description: 'AI models score terrain, rainfall, and exposure to surface the highest-risk zones early.',
    icon: Shield,
  },
  {
    title: 'Safe Route Planning',
    description: 'Route intelligence highlights safer corridors before people or goods enter dangerous segments.',
    icon: Route,
  },
  {
    title: 'Environmental Simulation',
    description: 'A climate-aware workflow helps teams understand how conditions may shift over time.',
    icon: Layers3,
  },
];

const impactMetrics = [
  { value: '83.8%', label: 'Model Accuracy' },
  { value: '24', label: 'Critical Hotspots Detected' },
  { value: 'Sindhupalchok', label: 'Coverage' },
];

function sectionLinkClass(active) {
  return [
    'group relative inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300',
    active
      ? 'bg-emerald-50 text-[#166534] shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_0_22px_rgba(16,185,129,0.12)]'
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
    'after:absolute after:left-4 after:top-1/2 after:h-8 after:w-1 after:-translate-y-1/2 after:rounded-full after:bg-gradient-to-b after:from-emerald-400 after:to-emerald-700 after:shadow-[0_0_18px_rgba(22,101,52,0.35)] after:transition-transform after:duration-300',
    active ? 'after:scale-y-100' : 'after:scale-y-0 group-hover:after:scale-y-100',
  ].join(' ');
}

export default function HomePage({ onOpenMap }) {
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target?.id) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      {
        rootMargin: '-30% 0px -55% 0px',
        threshold: [0.15, 0.3, 0.5, 0.75],
      },
    );

    NAV_ITEMS.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen h-screen bg-white text-slate-950 overflow-y-auto w-full scroll-smooth">

      <main className="mx-auto max-w-7xl px-6 pb-20 pt-20 lg:px-8">
        <section id="home" className="scroll-mt-32 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-emerald-200 bg-white/80 px-4 py-3 shadow-[0_14px_40px_rgba(16,185,129,0.10)] backdrop-blur-sm">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-700 to-emerald-950 text-white shadow-[0_18px_40px_rgba(16,185,129,0.28)]">
                <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_55%)]" />
                <Shield className="h-6 w-6" />
                <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-emerald-200" />
              </div>
              <div>
                <div className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg">GeoShield AI</div>
                <div className="text-[11px] font-medium uppercase tracking-[0.32em] text-emerald-700/75">
                  Landslide Risk Intelligence Platform
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800 shadow-[0_8px_24px_rgba(16,185,129,0.08)]">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Landslide Intelligence
            </div>

            <p className="mt-5 text-xs font-mono uppercase tracking-[0.38em] text-emerald-700/80">Sindhupalchok District · Nepal</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Predicting Landslides Before They Happen
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              GeoShield AI turns environmental signals into clear action, helping teams detect risk, plan safer travel,
              and protect communities across vulnerable terrain.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={onOpenMap}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-800 px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(16,185,129,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01]"
              >
                Explore Risk Map <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center lg:scale-105 transition-transform duration-500 hover:scale-[1.08]">
            <img
              src={heroImage}
              alt="Sindhupalchok landslide intelligence illustration"
              className="w-full max-w-[1100px] object-contain drop-shadow-[0_30px_55px_rgba(16,185,129,0.22)]"
            />
          </div>
        </section>

        <section id="risk-map" className="scroll-mt-32 mt-16 rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,#f8fffb_0%,#ffffff_100%)] px-6 py-8 shadow-[0_20px_60px_rgba(16,185,129,0.06)] lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700/70">Risk Map</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">District-level intelligence built for fast decisions</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600">
              The platform blends terrain, rainfall, and exposure signals into a single view that highlights where to act first.
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {impactMetrics.map(({ value, label }) => (
              <div key={label} className="rounded-[1.5rem] border border-emerald-100 bg-white p-5">
                <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.28em] text-emerald-700/70">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="simulation" className="scroll-mt-32 mt-16 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          <div className="rounded-[2rem] border border-emerald-100 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700/70">Simulation</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Scenario planning for changing terrain conditions</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Teams can stress-test rainfall spikes, slope changes, and route conditions before they become operational risks.
            </p>
          </div>

          <div className="grid gap-4 rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f5fff8_100%)] p-6 shadow-[0_20px_60px_rgba(16,185,129,0.06)] sm:grid-cols-3">
            {['Rainfall surge', 'Slope pressure', 'Route exposure'].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-emerald-100 bg-white p-5">
                <div className="text-sm font-semibold text-slate-950">{item}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">Test how the model reacts under different environmental shifts.</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-5 md:grid-cols-3">
          {featureCards.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="group rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_24px_70px_rgba(16,185,129,0.08)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition-transform duration-300 group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-7 text-slate-600">{description}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
