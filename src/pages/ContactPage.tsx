import React, { useState, useEffect } from 'react';

interface ContactPageProps {
  onNavigateHome: () => void;
  onNavigate: (path: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigateHome, onNavigate }) => {
  const CONTACT_EMAIL = 'snapfreewebsite@gmail.com';

  const [copied, setCopied] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Contact — SnapFree';
  }, []);

  const handleCopyEmail = () => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(CONTACT_EMAIL).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="w-full max-w-3xl pt-6 sm:pt-10 pb-16 sm:pb-24 px-4 sm:px-0">
      {/* Breadcrumb / Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center text-xs sm:text-sm font-bold text-[#000C3C] hover:text-black py-2 px-3.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs hover:bg-zinc-50 transition-all cursor-pointer"
        >
          &larr; Back to Home
        </button>

        <button
          onClick={() => onNavigate('/#faq')}
          className="inline-flex items-center text-xs text-zinc-500 hover:text-[#000C3C] font-semibold cursor-pointer"
        >
          Need help? Check FAQ
        </button>
      </div>

      {/* Main Card */}
      <article className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-10 shadow-2xs space-y-8">
        <header className="border-b border-zinc-100 pb-6 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-[#000C3C] tracking-tight">
            Contact Snap<span className="text-[#FDBF2D]">Free</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
            Have a question, feedback, or a problem using SnapFree? Email us or send an online inquiry below.
          </p>
        </header>

        {/* Email Highlight Card */}
        <section className="p-5 sm:p-6 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
          <p className="text-xs sm:text-sm font-bold text-[#000C3C]">
            Email us directly:
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-base sm:text-lg font-black text-[#000C3C] hover:text-[#fab416] transition-colors break-all underline decoration-zinc-300 hover:decoration-[#fab416]"
              title="Click to open email client"
            >
              {CONTACT_EMAIL}
            </a>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-xl border border-zinc-300 hover:border-[#000C3C] bg-white text-[#000C3C] transition-colors cursor-pointer shadow-2xs min-h-[40px]"
              >
                {copied ? 'Copied' : 'Copy Address'}
              </button>

              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-xl bg-[#000C3C] text-white hover:bg-zinc-800 transition-colors shadow-2xs min-h-[40px]"
              >
                Write Email
              </a>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Click the email address above to open your default email app, or copy it to your clipboard.
          </p>
        </section>

        {/* Contact Form Section */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              Send an Online Inquiry
            </h2>
            <p className="text-xs text-zinc-500">
              Fill out the form below and we will get back to you as soon as possible.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="name-input" className="text-xs font-bold text-[#000C3C]">
                  Your Name
                </label>
                <input
                  id="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full h-11 px-3.5 bg-white border border-zinc-300 rounded-xl text-xs sm:text-sm text-[#000C3C] focus:outline-none focus:border-[#000C3C] focus:ring-2 focus:ring-[#000C3C]/10"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email-input" className="text-xs font-bold text-[#000C3C]">
                  Your Email Address *
                </label>
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 px-3.5 bg-white border border-zinc-300 rounded-xl text-xs sm:text-sm text-[#000C3C] focus:outline-none focus:border-[#000C3C] focus:ring-2 focus:ring-[#000C3C]/10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="subject-input" className="text-xs font-bold text-[#000C3C]">
                Subject
              </label>
              <input
                id="subject-input"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Question about downloading or general feedback"
                className="w-full h-11 px-3.5 bg-white border border-zinc-300 rounded-xl text-xs sm:text-sm text-[#000C3C] focus:outline-none focus:border-[#000C3C] focus:ring-2 focus:ring-[#000C3C]/10"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="message-input" className="text-xs font-bold text-[#000C3C]">
                Your Message *
              </label>
              <textarea
                id="message-input"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your question, issue, or feedback in detail..."
                className="w-full p-3.5 bg-white border border-zinc-300 rounded-xl text-xs sm:text-sm text-[#000C3C] focus:outline-none focus:border-[#000C3C] focus:ring-2 focus:ring-[#000C3C]/10 resize-y"
              />
            </div>

            {submitted ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800">
                Thank you! Your message has been received. We will respond to your email shortly.
              </div>
            ) : (
              <button
                type="submit"
                className="h-12 px-7 bg-[#000C3C] hover:bg-zinc-800 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center cursor-pointer active:scale-[0.99] shadow-2xs"
              >
                Send Message
              </button>
            )}
          </form>
        </section>

        {/* Bottom Back Button */}
        <div className="pt-6 border-t border-zinc-100 flex justify-between items-center">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center text-xs sm:text-sm font-bold text-[#000C3C] hover:text-black py-2.5 px-5 rounded-xl bg-[#FDBF2D] hover:bg-[#fab416] transition-colors cursor-pointer"
          >
            &larr; Return to Downloader
          </button>

          <button
            onClick={() => onNavigate('/privacy')}
            className="text-xs sm:text-sm font-bold text-zinc-500 hover:text-[#000C3C] transition-colors cursor-pointer"
          >
            Privacy Policy &rarr;
          </button>
        </div>
      </article>
    </div>
  );
};
