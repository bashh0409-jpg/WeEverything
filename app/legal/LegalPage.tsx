"use client";

import React, { useEffect } from "react";

import Lenis from "lenis";
import Navbar from "../components/Navbar";

const Page = () => {
  useEffect(() => {
    const lenis = new Lenis();
    let frameId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    };

    frameId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, []);

  return (
    <div>
      <Navbar />

      <div className="grid  mt-50 geist grid-cols-1 md:grid-cols-2 gap-4 p-4">
        <div>
          {" "}
          <h1 className="text-5xl mt-10 mb-4 tracking-tighter text-[#999] font-semibold">
            Terms / Privacy Policy
          </h1>
        </div>
        <div>
          <span className="text-[#999] font-medium tracking-tight ">
            Last Update: Sep 15, 2026
          </span>

          <div className="lg:grid-cols-2 grid-cols-1 grid mt-8 gap-4">
                  <p className="  text-sm mb-2 font-medium tracking-tight ">
              Welcome to WeEverything.xyz. These Terms of Service (“Terms”)
              govern your use of our website, products, and services. By
              accessing or using our services, you agree to comply with these
              Terms. If you do not agree, please do not use our website.
            </p>
            <div>
              <span className="flex flex-col  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  1. Acceptance of Terms
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  By using our services, you acknowledge that you have read,
                  understood, and agreed to these Terms. If you are using our
                  services on behalf of a company or organization, you represent
                  that you have the authority to bind them to these Terms.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  We reserve the right to update, modify, or change these Terms
                  at any time. Changes will be effective upon posting on our
                  website. Continued use of our services after changes are
                  posted constitutes acceptance of the updated Terms.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  If you do not agree to the modified Terms, you must stop using
                  our services. We encourage you to review these Terms
                  periodically to stay informed of any updates.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  2. User responsibilities
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  You agree to use this website only for lawful purposes. You
                  must not attempt to gain unauthorized access to the site, its
                  underlying code, or any systems it connects to, and you must
                  not use the site in a way that could damage, disrupt, or
                  overload it.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  All content on this website — including case studies, project
                  imagery, branding, and copy — is the intellectual property of
                  WeEverything.xyz or its clients and may not be reproduced or
                  distributed without permission.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Misuse of this website, including attempting unauthorized
                  access or distributing harmful software, may result in legal
                  action.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  3. Usage Data
                </span>

                {/* Vercel Speed Insights is enabled — it collects performance metrics
                    (page URL, referrer, country, device/browser type, connection speed)
                    without cookies or personal identifiers. Still needs disclosure since
                    it is passive data collection from every visitor, POPIA-relevant even
                    if anonymized. Update again if PII-collecting analytics gets added. */}
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  This website uses Vercel Speed Insights to measure site
                  performance, such as page load times. This tool does not use
                  cookies and does not collect information that identifies you
                  personally — it records anonymized technical data like your
                  general location (country), device type, and browser, purely
                  to help us keep the site fast.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  The “Consult” button on this website links to Google
                  Calendar’s booking tool. If you book a consultation, the
                  personal information you provide (such as your name, email,
                  and meeting details) is collected directly by Google, subject
                  to Google’s own privacy policy, not ours.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  4. What information do we collect?
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  We only collect personal information that you choose to send
                  us directly — for example, when you email us at{" "}
                  <a
                    className="text-blue-500 underline"
                    href="mailto:info@thewisestudio.xyz"
                  >
                    info@thewisestudio.xyz
                  </a>
                  , when you call us on the number listed on this site. This may
                  include your name, contact details, and the content of your
                  message.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  We use this information solely to respond to your enquiry,
                  discuss potential work, or process a job application. We do
                  not sell, rent, or share your personal information with third
                  parties for marketing purposes.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  We may update our Privacy Policy from time to time and will
                  notify users of any changes by posting the new Privacy Policy
                  on this page. You are advised to revisit this page and review
                  our Privacy Policy periodically for any changes.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  5. Your rights (POPIA)
                </span>

                {/* WeEverything.xyz is South Africa-registered, so POPIA governs this
                    site's data processing — not GDPR/CCPA. This section is the
                    minimum POPIA requires: named Information Officer + data
                    subject rights + Regulator complaint route. Replace the
                    Information Officer name below with whoever is actually
                    designated — POPIA requires this role be filled by a real
                    person, not left as a role title. */}
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  As a South African small business, we process personal
                  information in accordance with the Protection of Personal
                  Information Act (POPIA). You have the right to request access
                  to, correction of, or deletion of any personal information we
                  hold about you, and to object to its processing.
                </span>
                <span className="font-medium indent-8 text-sm leading-4 tracking-tight ">
                  Our Information Officer can be reached at{" "}
                  <a
                    className="text-blue-500 underline"
                    href="mailto:info@thewisestudio.xyz"
                  >
                    info@thewisestudio.xyz
                  </a>
                  , for any requests relating to your personal information.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  If you believe your information has been mishandled, you may
                  lodge a complaint with the Information Regulator of South
                  Africa at{" "}
                  <a
                    href="https://inforegulator.org.za"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
                    inforegulator.org.za
                  </a>
                  .
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  6. Contact us?
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  If you have any questions about this Privacy Policy, You can
                  contact us by email:{" "}
                  <a
                    className="text-blue-500 underline"
                    href="mailto:info@thewisestudio.xyz"
                  >
                    info@thewisestudio.xyz
                  </a>
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
