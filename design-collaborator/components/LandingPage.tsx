import React from 'react';

type LandingPageProps = {
  onStart: () => void;
};

const featureHighlights = [
  {
    title: 'Comment on any image online',
    body: 'Upload UI mockups, product screenshots, marketing visuals, or photos and gather pixel-perfect comments in seconds.',
  },
  {
    title: 'Threaded design feedback',
    body: 'Start annotation threads, @-style callouts, likes, and resolution markers keep reviewers aligned without long email chains.',
  },
  {
    title: 'Secure share links',
    body: 'www.image-comment.com keeps sessions private with invite-only access, optional passwords, and live activity logs.',
  },
];

const workflow = [
  {
    step: '01',
    title: 'Drop your mockups',
    description: 'Upload up to ten images at once. Thumbnails and zoom-ready views load instantly so reviewers stay in the flow.',
  },
  {
    step: '02',
    title: 'Invite stakeholders',
    description: 'Share a secure link. Viewers join with their email, see the full history, and can be removed at any moment.',
  },
  {
    step: '03',
    title: 'Comment together',
    description: 'Draw a region, type contextual feedback, reply in threads, and mark discussions resolved—everything updates in real time.',
  },
];

const testimonials = [
  {
    quote: 'Image Comment gave our product teams one place to annotate mobile screenshots, discuss fixes, and keep a permanent audit trail.',
    author: 'Sofia F., Product Design Lead',
  },
  {
    quote: 'We replaced messy PDFs with a single browser link. Clients leave precise comments and we respond live on the call.',
    author: 'Marcus T., Creative Director',
  },
];

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-gray-100">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950" aria-hidden="true" />
        <header className="relative z-10 max-w-6xl mx-auto flex flex-col gap-6 px-6 pt-10 pb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Image Comment</p>
              <h1 className="mt-3 text-4xl md:text-5xl font-bold text-white leading-tight">
                Real-time image annotation &amp; design feedback software
              </h1>
              <p className="mt-6 text-lg text-gray-300 max-w-3xl">
                www.image-comment.com is the fastest way to comment on images online. Deliver visual feedback, resolve conversations, and keep every marked-up pixel in one secure workspace.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button
                  onClick={onStart}
                  className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold rounded-full shadow-lg shadow-cyan-500/40 transition-all"
                >
                  Start commenting
                </button>
                <p className="text-sm text-gray-400">
                  No installs • Runs in any browser • Unlimited threaded comments
                </p>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-gray-900/70 border border-gray-800 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6 max-w-sm">
                <p className="text-sm text-gray-400">Trusted for</p>
                <div className="mt-2 text-5xl font-black text-white">
                  1.2M+
                </div>
                <p className="text-sm text-gray-400">live image comments each month</p>
                <ul className="mt-6 space-y-3 text-sm">
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400" />UX reviews and QA sign-off</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400" />Creative agency proofing</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400" />Marketing localization rounds</li>
                </ul>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="relative z-10">
        <section className="max-w-6xl mx-auto px-6 py-16 grid gap-8 md:grid-cols-3">
          {featureHighlights.map((feature) => (
            <article key={feature.title} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur">
              <h2 className="text-xl font-semibold text-white">{feature.title}</h2>
              <p className="mt-3 text-sm text-gray-300 leading-relaxed">{feature.body}</p>
            </article>
          ))}
        </section>

        <section className="bg-gradient-to-b from-slate-950 to-slate-900 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-cyan-300 text-sm tracking-wide uppercase">Workflow</p>
            <h2 className="mt-3 text-3xl font-bold text-white">How teams comment faster with Image Comment</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {workflow.map((item) => (
                <article key={item.step} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                  <div className="text-cyan-400 text-sm font-semibold">{item.step}</div>
                  <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm text-gray-300 leading-relaxed">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid gap-10 md:grid-cols-2">
            {testimonials.map((item) => (
              <blockquote key={item.author} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 text-gray-100 shadow-lg shadow-black/20">
                <p className="text-lg leading-relaxed">“{item.quote}”</p>
                <footer className="mt-4 text-sm text-gray-400">{item.author}</footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section className="bg-slate-900 py-16">
          <div className="max-w-6xl mx-auto px-6 grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-white">SEO-ready marketing copy</h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                Image Comment is built for product designers, QA teams, agencies, and marketers that need a reliable online image annotation tool. Search for “comment on image for free”, “markup screenshots with a team”, or “design feedback platform” and you will find www.image-comment.com because every session loads lightning fast, is secure by default, and keeps stakeholders in sync.
              </p>
              <p className="mt-4 text-gray-300 leading-relaxed">
                Replace back-and-forth screenshots with centralized annotations, threaded replies, likes, and status tracking. Run remote design reviews, approve marketing creative, guide engineering QA, and document accessibility fixes without leaving the browser.
              </p>
            </div>
            <div className="space-y-6">
              <article className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white">What makes Image Comment different?</h3>
                <p className="mt-3 text-sm text-gray-300 leading-relaxed">
                  Your comments sit directly on the pixels you care about. Invite-only sessions, optional passwords, and automatic history mean reviewers can confidently approve every change.
                </p>
              </article>
              <article className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white">Built for modern teams</h3>
                <p className="mt-3 text-sm text-gray-300 leading-relaxed">
                  Whether you’re preparing an investor deck, auditing UX flows, or handing off to development, Image Comment saves notable time on every review loop.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border border-cyan-500/40 rounded-3xl p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-cyan-200">Ready to try?</p>
              <h2 className="mt-3 text-3xl font-bold text-white">Launch Image Comment in seconds</h2>
              <p className="mt-3 text-gray-200 max-w-2xl">
                Click start and drop your first image. A streamlined popup walks you through creating or confirming your profile so you can begin collecting comments immediately.
              </p>
            </div>
            <button
              onClick={onStart}
              className="px-8 py-3 bg-white/90 text-slate-900 font-semibold rounded-full shadow-lg hover:bg-white"
            >
              Start now
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} www.image-comment.com — the modern way to comment on images.
      </footer>
    </div>
  );
};

export default LandingPage;
