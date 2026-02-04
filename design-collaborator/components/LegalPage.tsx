import React from 'react';

type LegalPageProps = {
  variant: 'privacy' | 'terms';
};

const content = {
  privacy: {
    title: 'Image Comment Privacy Policy',
    intro: 'Summary of how we handle data when you use Image Comment.',
    sections: [
      {
        heading: 'Data Collection',
        body: 'We do not require an account to participate in a session. We collect email addresses only for session identification and notification.',
      },
      {
        heading: 'Image Security',
        body: 'Uploaded images are stored temporarily and encrypted.',
      },
      {
        heading: 'Cookies',
        body: 'We use functional cookies only to maintain your session state. No third-party tracking.',
      },
    ],
  },
  terms: {
    title: 'Image Comment Terms of Service',
    intro: 'Summary of the terms for using Image Comment.',
    sections: [
      {
        heading: 'Usage',
        body: 'Users are responsible for the content they upload. No illegal or harmful material.',
      },
      {
        heading: 'Availability',
        body: 'This tool is provided "as is." We reserve the right to delete sessions older than 30 days.',
      },
      {
        heading: 'Ownership',
        body: 'Users retain all rights to their uploaded images.',
      },
    ],
  },
};

const LegalPage: React.FC<LegalPageProps> = ({ variant }) => {
  const page = content[variant];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="border-b border-slate-900">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-3">
          <a href="/" className="text-sm uppercase tracking-[0.35em] text-cyan-300">
            Image Comment
          </a>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{page.title}</h1>
          <p className="text-slate-400 text-base">{page.intro}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-6">
          {page.sections.map((section) => (
            <section key={section.heading} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white">{section.heading}</h2>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 text-sm text-slate-400">
          <a href="/" className="text-cyan-300 hover:text-cyan-200">Return to home</a>
        </div>
      </main>
    </div>
  );
};

export default LegalPage;
