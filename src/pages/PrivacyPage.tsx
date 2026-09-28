import React, { useEffect } from 'react';

interface PrivacyPageProps {
  onNavigateHome: () => void;
  onNavigate: (path: string) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigateHome, onNavigate }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Privacy Policy — SnapFree';
  }, []);

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

        <span className="text-xs text-zinc-400 font-medium">Last updated: September 2026</span>
      </div>

      {/* Main Card */}
      <article className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-10 shadow-2xs space-y-8">
        <header className="border-b border-zinc-100 pb-6 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-[#000C3C] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
            This Privacy Policy explains how SnapFree handles technical information and user privacy when you visit our website or download TikTok content.
          </p>
        </header>

        <section className="space-y-6 text-xs sm:text-sm text-zinc-700 leading-relaxed">
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              1. Information We Collect
            </h2>
            <p>
              SnapFree is built with data minimization as a core principle. We do not require registration, login, account creation, or payment information. We do not ask for or collect personal details such as your name, email address, password, billing address, or phone number.
            </p>
            <p>
              When your browser requests a web page or media download, our web servers automatically receive standard technical transmission logs. These technical logs may include your IP address, browser type, operating system, and request timestamps. This information is processed temporarily in memory solely to manage network rate limits, protect against automated denial-of-service abuse, and maintain server reliability.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              2. Processing of Submitted TikTok Links
            </h2>
            <p>
              When you paste a TikTok URL into the SnapFree input box, our server queries public TikTok endpoints to identify the requested publicly accessible media stream.
            </p>
            <p>
              SnapFree does not permanently store, host, or mirror downloaded videos or photos on its servers. The media files are retrieved and transferred directly to your device via an ephemeral connection. Once the download transmission is finished, the temporary request is terminated. We do not maintain a permanent historical log connecting individual users to the specific media they have downloaded.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              3. Cookies and Local Storage
            </h2>
            <p>
              SnapFree does not set persistent tracking cookies, cross-site trackers, or marketing profile cookies on your device. The web application operates within your browser session and uses temporary browser state only when necessary (for example, reading text from your clipboard when you explicitly click the &quot;Paste&quot; button and rendering download preview cards).
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              4. Third-Party Services and APIs
            </h2>
            <p>
              SnapFree communicates with public TikTok content distribution servers solely to resolve public video and photo downloads on your behalf. We do not share, sell, lease, or distribute user data to any external commercial brokers or marketing entities.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              5. Children&apos;s Privacy
            </h2>
            <p>
              SnapFree is intended for a general audience and is not directed toward children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              6. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect operational, legal, or technical changes. Any revisions will be published on this page with an updated revision date.
            </p>
          </div>

          <div className="space-y-2 border-t border-zinc-100 pt-4">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              7. Contact Us
            </h2>
            <p>
              If you have any questions or feedback regarding this Privacy Policy, please reach out to us through our{' '}
              <button
                onClick={() => onNavigate('/contact')}
                className="text-[#000C3C] font-bold underline hover:text-[#fab416] cursor-pointer"
              >
                Contact Page
              </button>
              .
            </p>
          </div>
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
            onClick={() => onNavigate('/terms')}
            className="text-xs sm:text-sm font-bold text-zinc-500 hover:text-[#000C3C] transition-colors cursor-pointer"
          >
            Read Terms of Service &rarr;
          </button>
        </div>
      </article>
    </div>
  );
};
