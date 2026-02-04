import React, { useState } from 'react';

type LandingPageProps = {
  onStart: () => void;
};

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [activeTab, setActiveTab] = useState<'features' | 'how-to' | 'faq'>('features');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="border-b border-slate-900 sticky top-0 bg-slate-950/90 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-xs">IC</div>
            Image Comment
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
            <button onClick={() => setActiveTab('features')} className={activeTab === 'features' ? 'text-indigo-400' : 'hover:text-white transition'}>Features</button>
            <button onClick={() => setActiveTab('how-to')} className={activeTab === 'how-to' ? 'text-indigo-400' : 'hover:text-white transition'}>How it Works</button>
            <button onClick={() => setActiveTab('faq')} className={activeTab === 'faq' ? 'text-indigo-400' : 'hover:text-white transition'}>FAQ</button>
          </div>
          <button onClick={onStart} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8">
          The Hub for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Visual Feedback.</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Annotate screenshots, collect design feedback, and comment on images online. Professional collaboration for developers and designers.
        </p>
        <button onClick={onStart} className="bg-white text-slate-950 px-10 py-4 rounded-2xl text-lg font-bold hover:bg-slate-100 transition-transform active:scale-95 shadow-xl">
          Start New Session
        </button>
      </header>

      {/* Content Section (The SEO/GEO engine) */}
      <main className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-sm">
          
          {activeTab === 'features' && (
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                <h3 className="text-indigo-400 font-bold mb-3">Threaded Comments</h3>
                <p className="text-sm text-slate-400">Keep discussions organized directly on the image coordinates. No more ambiguity.</p>
              </div>
              <div className="p-6 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                <h3 className="text-indigo-400 font-bold mb-3">Region Highlights</h3>
                <p className="text-sm text-slate-400">Draw boxes to emphasize specific UI elements for pixel-perfect reviews.</p>
              </div>
              <div className="p-6 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                <h3 className="text-indigo-400 font-bold mb-3">Instant Sharing</h3>
                <p className="text-sm text-slate-400">Generate secure URLs to share with clients or stakeholders instantly.</p>
              </div>
            </div>
          )}

          {activeTab === 'how-to' && (
            <div className="max-w-2xl mx-auto space-y-10">
              <div className="flex gap-6">
                <div className="text-3xl font-black text-slate-800">01</div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">Upload Asset</h4>
                  <p className="text-slate-400">Drag and drop any mockup or screenshot into the workspace.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-3xl font-black text-slate-800">02</div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">Drop a Pin</h4>
                  <p className="text-slate-400">Click anywhere to start a discussion thread on that specific point.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-3xl font-black text-slate-800">03</div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">Share Link</h4>
                  <p className="text-slate-400">Send the unique URL to your team. No signup required for them to join.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <details className="group bg-slate-800/20 p-5 rounded-2xl border border-slate-700 cursor-pointer">
                <summary className="font-bold text-white group-open:text-indigo-400">Is visual feedback faster than email?</summary>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">Yes. Visual feedback reduces revision cycles by up to 50% by removing the need for descriptive emails about UI changes.</p>
              </details>
              <details className="group bg-slate-800/20 p-5 rounded-2xl border border-slate-700 cursor-pointer">
                <summary className="font-bold text-white group-open:text-indigo-400">How many images can I upload?</summary>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">You can upload up to 10 images per session to handle full UI flow reviews.</p>
              </details>
            </div>
          )}
        </div>
      </main>

      <footer className="py-12 border-t border-slate-900 text-center">
  <div className="flex justify-center gap-6 mb-4 text-xs font-medium text-slate-500">
    <a href="/privacy" className="hover:text-white transition">Privacy Policy</a>
    <a href="/terms" className="hover:text-white transition">Terms of Service</a>
  </div>
  <p className="text-slate-600 text-[10px] tracking-widest uppercase">
    &copy; {new Date().getFullYear()} Image Comment &bull; Professional Visual Annotation
  </p>
</footer>
    </div>
  );
};

export default LandingPage;
