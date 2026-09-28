import React, { useEffect } from 'react';

interface TermsPageProps {
  onNavigateHome: () => void;
  onNavigate: (path: string) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onNavigateHome, onNavigate }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Terms of Service — SnapFree';
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
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
            Please read these Terms of Service carefully before using SnapFree to download TikTok content.
          </p>
        </header>

        {/* Neutral TikTok Disclaimer Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 space-y-1.5 text-xs sm:text-sm leading-relaxed">
          <p className="font-bold text-[#000C3C]">Independent Service Disclaimer</p>
          <p>
            SnapFree is an independent third-party service and is not affiliated with, endorsed by, or sponsored by TikTok or ByteDance. Users are responsible for having the necessary rights or permission to download and use content.
          </p>
        </div>

        <section className="space-y-6 text-xs sm:text-sm text-zinc-700 leading-relaxed">
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, or utilizing SnapFree (&quot;we&quot;, &quot;us&quot;, or &quot;the Service&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, you must discontinue using the Service.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              2. Acceptable Use
            </h2>
            <p>
              SnapFree is provided as an online utility for personal, non-commercial downloading of publicly accessible TikTok videos and photos. You agree to use the Service in compliance with all relevant local, national, and international laws and regulations.
            </p>
            <p>
              You agree not to use automated bots, spiders, scripts, scrapers, or other abusive techniques to overload, disrupt, or impair the normal operation and security of the Service.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              3. User Responsibility &amp; Content Rights
            </h2>
            <p>
              You are solely responsible for how you use SnapFree and for any media you download. You acknowledge that content published on TikTok is protected by copyright, trademark, and other intellectual property rights belonging to its respective creators or rights holders.
            </p>
            <p>
              You are responsible for ensuring that you have the appropriate rights, licenses, or permissions from the respective content creator before downloading, sharing, re-uploading, or redistributing any media. SnapFree does not grant you any ownership, copyright license, or redistribution permissions for third-party media.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              4. Copyright and Intellectual Property
            </h2>
            <p>
              All trademarks, video assets, photos, sounds, and media belonging to third parties remain the exclusive property of their respective owners. SnapFree claims no proprietary interest in or intellectual property rights over any videos or photos retrieved through our tool.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              5. Third-Party Content
            </h2>
            <p>
              SnapFree serves as a conduit to retrieve publicly available streams hosted on third-party servers. We do not monitor, endorse, control, or take responsibility for the accuracy, legality, copyright compliance, or nature of third-party content uploaded by TikTok users.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              6. Service Availability &amp; Modifications
            </h2>
            <p>
              SnapFree is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We strive to maintain continuous and reliable uptime, but we do not warrant that the Service will operate without interruption, delays, or errors. We reserve the right to alter, enhance, suspend, or discontinue any aspect of the Service at any time without prior notice.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              7. Unsupported or Unavailable TikTok Links
            </h2>
            <p>
              SnapFree can only process public TikTok media. We do not guarantee that every submitted link will be retrievable. Videos or photos cannot be downloaded if they are:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-600">
              <li>Marked as private or restricted to friends only by the creator;</li>
              <li>Deleted or removed by the author or TikTok;</li>
              <li>Subject to regional restrictions or age-verification filters;</li>
              <li>Protected by technical changes implemented by third-party platforms.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              8. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by applicable law, SnapFree, its operators, affiliates, and partners shall not be liable for any direct, indirect, incidental, consequential, special, or exemplary damages arising out of your access to, use of, or inability to use the Service or any downloaded media.
            </p>
          </div>

          <div className="space-y-2 border-t border-zinc-100 pt-4">
            <h2 className="text-base sm:text-lg font-bold text-[#000C3C]">
              9. Contact Information
            </h2>
            <p>
              If you have any questions concerning these Terms of Service, please visit our{' '}
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
            onClick={() => onNavigate('/privacy')}
            className="text-xs sm:text-sm font-bold text-zinc-500 hover:text-[#000C3C] transition-colors cursor-pointer"
          >
            Read Privacy Policy &rarr;
          </button>
        </div>
      </article>
    </div>
  );
};
