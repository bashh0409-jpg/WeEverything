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
              Welcome to WeEverything.xyz, a directory for discovering creative
              professionals and sharing public creative profiles. These Terms
              govern your use of the directory, profile tools, and related
              services. By using the site, you agree to these Terms. If you do
              not agree, please do not use the site.
            </p>
            <div>
              <span className="flex flex-col  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  1. Acceptance of Terms.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  You must provide accurate information when creating an account
                  and are responsible for activity carried out through it. You
                  may use WeEverything to create, manage, and publish a profile
                  for yourself, including a biography, role, location, profile
                  image, work media, and links to external social or portfolio
                  pages.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Do not upload or link to content that you do not have the
                  right to share, that impersonates another person, or that is
                  unlawful, misleading, abusive, invasive of privacy, or
                  harmful. Do not attempt to access another account, disrupt the
                  site, scrape it abusively, or upload malicious code.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  You control whether your profile is published. Published
                  profiles, profile media, and social links may be visible to
                  anyone who visits the directory. We may remove content or
                  restrict an account when reasonably necessary to protect the
                  site, its users, or the rights of others. We may also update
                  these Terms by posting a revised version here.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  2. User responsibilities.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  You agree to use this website only for lawful purposes. You
                  must not attempt to gain unauthorized access to the site, its
                  underlying code, or any systems it connects to, and you must
                  not use the site in a way that could damage, disrupt, or
                  overload it.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  You retain responsibility for the content you submit. You give
                  WeEverything permission to host, store, display, and format
                  that content as needed to operate the directory. You retain
                  ownership of your content, while WeEverything retains rights
                  in its software, branding, and original site content.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  WeEverything is a directory and does not guarantee the
                  quality, availability, identity, or suitability of any listed
                  professional. Any work, communication, or agreement you make
                  with a listed person is between you and that person.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  3. Usage Data
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  This website uses Vercel Speed Insights to measure site
                  performance, such as page load times. It may process technical
                  information about your visit, such as the page URL, referrer,
                  approximate country, device or browser type, and connection
                  information. It is used to improve reliability and does not
                  use advertising cookies or create an advertising profile for
                  you.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  External websites linked from a profile, including social
                  networks and portfolio sites, operate under their own terms
                  and privacy policies. WeEverything is not responsible for how
                  those external services process information.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  4. What information do we collect?
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  We collect information needed to provide the directory and
                  account features. This can include your email address and
                  authentication details, profile name, role, biography,
                  location, avatar, uploaded images or videos, social links,
                  profile publication settings, profile views, sponsorship
                  status, and account deletion status.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  We use this information to authenticate users, create and
                  display profiles when publication is enabled, store uploaded
                  media, show profile view counts, process sponsorships, prevent
                  misuse, respond to requests, and operate and secure the site.
                  We do not sell your personal information for advertising.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Account and profile data is stored using Supabase. Sponsorship
                  payments are handled by Polar; we do not receive or store your
                  full payment card details. We may share information with these
                  service providers only as needed to provide their services,
                  and we may disclose information when required by law or to
                  protect the site and its users.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  5. Your rights (POPIA)
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Where applicable, the Protection of Personal Information Act
                  (POPIA) governs our handling of personal information. You may
                  request access to, correction of, or deletion of personal
                  information we hold about you, and you may object to certain
                  processing or ask questions about how your information is
                  used.
                </span>
                <span className="font-medium indent-8 text-sm leading-4 tracking-tight ">
                  Send privacy or account requests to the contact address used
                  by the WeEverything operator, including the email address
                  associated with your account. We may need to verify your
                  identity before completing a request.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  If POPIA applies to you and you believe your information has
                  been mishandled, you may lodge a complaint with the
                  Information Regulator of South Africa at{" "}
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
                  If you have questions about these Terms or this Privacy
                  Policy, contact the WeEverything operator through the support
                  contact associated with the site or your account. Requests
                  about account deletion can be started from your profile. When
                  deletion is requested, the profile is unpublished and the
                  account is scheduled for permanent deletion after 30 days.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  7. Sponsorships and payments.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  A profile owner may choose a one-time sponsorship amount of
                  USD 5, USD 15, or USD 30. Sponsorship is an optional paid
                  feature that may give the sponsored profile priority in the
                  directory; it does not guarantee a particular position, number
                  of views, enquiries, or work opportunities.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Checkout and payment processing are provided by Polar. The
                  payment amount, currency, checkout terms, taxes where
                  applicable, and available payment methods may be shown by
                  Polar at checkout. We do not store your complete card number
                  or payment security code.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  A checkout request may be retried safely. We use a unique
                  request key so that a retry returns the same pending checkout
                  instead of intentionally creating a second checkout for the
                  same request. Completed, expired, or refunded sponsorships may
                  be recorded so that payment status can be reconciled.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Questions about a charge, refund, or duplicate payment should
                  be raised with the WeEverything operator and may also need to
                  be handled through Polar according to the payment terms shown
                  at checkout. We do not promise refunds except where required
                  by applicable law or expressly agreed by the operator.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  8. Account deletion and data retention.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  You can request deletion from your signed-in profile. When a
                  request is accepted, your profile is unpublished immediately
                  and scheduled for permanent deletion after 30 days. During
                  that period, you may be able to contact the operator to cancel
                  the request or restore the account, subject to the
                  operator&apos;s ability to do so.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  At permanent deletion, the account and associated profile
                  records are removed through the account deletion process, and
                  uploaded profile media is removed from the profile media
                  storage area where the system can do so. We may retain limited
                  information where necessary for legal compliance, fraud
                  prevention, payment reconciliation, dispute handling, or
                  legitimate operational records.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  9. Cookies and browser storage.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  We use browser cookies or similar session technology where it
                  is needed for authentication and account sessions. The site
                  may also use browser session storage to help count a profile
                  view once per browsing session. These technologies are used to
                  operate the site, not to sell advertising profiles.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  You can control cookies and browser storage through your
                  browser settings, but disabling them may prevent sign-in or
                  make parts of the site unavailable.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  10. Availability and security.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  We work to keep WeEverything available and to protect account
                  and profile information, but no online service can guarantee
                  uninterrupted availability or absolute security. The site may
                  be changed, suspended, or unavailable for maintenance,
                  upgrades, provider outages, or circumstances outside our
                  reasonable control.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  You are responsible for keeping access to your email account
                  and sign-in method secure. Tell us promptly if you believe
                  that your account has been accessed without permission.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  11. Changes to these policies.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  We may update these Terms and this Privacy Policy when the
                  site, its providers, or applicable law changes. The date at
                  the top of this page identifies the latest update. Continued
                  use of WeEverything after an update means that you accept the
                  updated terms to the extent permitted by law.
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
