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
            Last Update: Oct 1, 2026
          </span>

          <div className="lg:grid-cols-2 grid-cols-1 grid mt-8 gap-4">
            <p className="  text-sm mb-2 font-medium tracking-tight ">
              WeEverything.xyz provides a directory for discovering creative
              professionals, public profiles, profile tools, event listings,
              inquiries, AI-assisted features, and sponsorship checkout. These
              Terms describe use of the service; this page also explains how
              personal information is handled. If you do not agree, do not use
              the service. Mandatory rights under applicable law are not waived
              by these Terms.
            </p>
            <div>
              <span className="flex flex-col  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  1. Accounts, content, and public listings.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Sign-in is provided through Google or GitHub. You are
                  responsible for activity through your account and for keeping
                  access to your sign-in method secure. We receive the account
                  information those providers make available, which may include
                  your email address, name, and avatar. Keep account and profile
                  information accurate and current.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  You keep ownership of content you submit. You grant us a
                  non-exclusive, royalty-free permission to host, store,
                  process, format, and display that content only as needed to
                  provide and operate the service, including displaying it
                  publicly when you publish a profile. Submit only content you
                  own or are authorized to use, and do not include information
                  about another person without a lawful basis or their
                  permission.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Published profile information, media, and social links are
                  visible to the public and may be copied or cached by others.
                  Event suggestions may be added to the event listing. You are
                  responsible for the accuracy and rights for anything you
                  submit. We may remove content or restrict access where
                  reasonably needed for safety, legal compliance, or operation
                  of the service.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  2. Acceptable use and directory disclaimer.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Use the service lawfully. Do not access another account or
                  system without permission, disrupt or overload the service,
                  evade security controls, scrape abusively, send spam, upload
                  malicious code, impersonate others, or submit unlawful,
                  infringing, deceptive, harassing, or privacy-invasive
                  material.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  WeEverything is a directory and does not verify or endorse
                  every profile, event, link, or statement. We do not guarantee
                  a listed person&apos;s identity, qualifications, availability,
                  or suitability. You are responsible for evaluating people and
                  services; communications, work, and agreements are between the
                  people involved.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  You access external links and third-party services at your own
                  discretion. Their operators control their own services, terms,
                  and privacy practices; WeEverything does not control or take
                  responsibility for them.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  3. Usage Data
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Vercel Speed Insights is loaded whenever the site is used to
                  measure performance. Vercel may process technical and
                  performance information such as page or route, referrer,
                  device or browser characteristics, approximate location, and
                  connection or performance measurements under its own privacy
                  terms. This runs independently of the optional analytics
                  choice described below.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Authentication uses session cookies. Vercel Analytics is
                  enabled only if you accept it in the consent notice; the
                  choice is stored in your browser. Rejecting optional analytics
                  does not disable Vercel Speed Insights. You can clear the
                  saved choice in browser storage to be asked again.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Cloudflare Turnstile may be used on inquiry forms to reduce
                  abuse and may process technical or device information for
                  verification. Inquiry rate limiting uses the available
                  forwarded IP address and a hash of the sender email in Upstash
                  keys that expire after about one hour. Cloudflare and other
                  external sites have their own privacy terms.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  External websites linked from profiles operate under their own
                  terms and privacy practices. We do not control those services.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  4. What information do we collect?
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Depending on how you use the service, we process account
                  identifiers and email, name and avatar provided by your
                  sign-in provider; profile details such as handle, role, bio,
                  location, awards, media, and social links; event details you
                  submit; inquiry sender name, email, optional phone, project
                  type, company name, project brief, budget, and timeline; and
                  sponsorship checkout and status information. Do not put
                  sensitive personal information in a public profile or inquiry
                  unless it is necessary and you are entitled to share it.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Published profiles and event listings are public. Inquiry
                  details are stored for delivery and are available to the
                  recipient profile owner; when email is configured, we use
                  Resend to notify that owner and send account welcome emails.
                  Profile owners can archive or delete inquiries. We use
                  information to provide the requested features, secure the
                  service, prevent abuse, and meet legal obligations. We do not
                  sell personal information for targeted advertising.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  We use Supabase for authentication, database, and media
                  storage; Google or GitHub for sign-in; Vercel for hosting,
                  performance measurement, and optional analytics; Cloudflare
                  for Turnstile; Upstash for inquiry rate limits; Resend for
                  email; Polar for checkout and payment processing; and
                  OpenRouter for AI-assisted features. These providers receive
                  information needed for their services and may process it in
                  other countries under their own terms. We may also disclose
                  information when required by law or needed to protect users,
                  the service, or our rights.
                </span>
                <span className="text-[#999] text-sm mb-2 font-medium tracking-tight ">
                  5. AI-assisted features.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  If you use bio enhancement, the bio you submit is sent through
                  OpenRouter using the currently configured Qwen/Qwen3-8B model.
                  Intelligent search sends your query and public candidate
                  profile details (name, role, bio, and location) through
                  OpenRouter for ranking. OpenRouter may route inputs to an
                  underlying model provider, whose data handling and model
                  training practices can vary. Review the{" "}
                  <a
                    href="https://openrouter.ai/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
                    OpenRouter Privacy Policy
                  </a>{" "}
                  and the applicable model provider&apos;s data terms. AI output
                  can be inaccurate; review it before using or publishing it,
                  and do not submit confidential information.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  6. Privacy rights.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Depending on the law that applies, including South
                  Africa&apos;s Protection of Personal Information Act (POPIA),
                  you may have rights to request access to, correction or
                  deletion of your personal information, object to certain
                  processing, or lodge a complaint. We will handle requests
                  subject to identity checks, applicable exceptions, and legal
                  requirements.
                </span>
                <span className="font-medium indent-8 text-sm leading-4 tracking-tight ">
                  Use the contact email in section 7 for privacy requests.
                  Account deletion can also be started from your signed-in
                  profile. We may need to verify your identity before
                  responding.
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
                  7. Operator and contact.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  WeEverything is operated by Wandile Langa in Pietermaritzburg,
                  South Africa. For privacy, legal, payment, or support
                  requests, email{" "}
                  <a
                    href="mailto:info@weeverything.xyz"
                    className="text-blue-500 underline"
                  >
                    info@weeverything.xyz
                  </a>
                  . The governing law and dispute forum have not been selected
                  yet and should be completed after legal review.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  8. Sponsorships and payments.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  A signed-in profile owner may start a one-time sponsorship
                  checkout for an amount from USD 1 to USD 10,000. A paid
                  sponsorship may give the profile priority in the directory for
                  up to 30 days from payment. It does not guarantee a particular
                  position, views, inquiries, or work opportunities.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Polar provides checkout and payment processing. The checkout
                  page states the amount, currency, applicable taxes, payment
                  methods, and Polar&apos;s terms. We store checkout identifiers
                  and payment status information, but do not receive or store
                  your complete payment card number or security code.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  A checkout request uses an idempotency key so that a retry can
                  return the same pending checkout. Payment status may be
                  updated when Polar reports a paid, refunded, or expired
                  checkout.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Cancellation, withdrawal, and refund rights depend on the
                  checkout terms and applicable law. Nothing here excludes a
                  refund or other right that the law requires. For a payment
                  issue, contact the operator and Polar using their applicable
                  support channels. A refunded sponsorship is no longer active.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  9. Account deletion and retention.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  You can request deletion from your signed-in profile. The
                  profile is unpublished immediately and scheduled for deletion
                  after 30 days. A scheduled daily job processes due requests,
                  so final deletion may occur later if processing or a provider
                  is unavailable. The app does not currently provide a
                  self-service cancellation or restore option during this
                  period.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  When the deletion job succeeds, it deletes the account and
                  associated profile data and attempts to remove uploaded
                  profile media. Some information may remain in provider
                  backups, independent provider records, or our records where
                  retention is required or permitted for legal compliance,
                  security, payment disputes, or accounting. Public copies or
                  browser caches held by others may not be retrievable by us.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  10. Cookies and browser storage.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  The site uses authentication session cookies and browser
                  storage for your analytics choice, saved and recently viewed
                  profile IDs, inquiry read status, and a short-lived cache of
                  published profiles. These items are stored on your device;
                  clear browser storage to remove them. The app does not
                  currently write individual profile-view records, even though
                  profile-view totals may be displayed in the account area.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  Blocking session cookies or browser storage may prevent
                  sign-in or make saved profiles, inquiry read status, or other
                  features unavailable. Rejecting optional Vercel Analytics does
                  not disable Vercel Speed Insights as currently implemented.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  11. Availability, warranties, and liability.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  The service is provided as available. We do not promise that
                  it will be uninterrupted, error-free, secure in every
                  circumstance, or that directory information is complete or
                  current. No online service can guarantee absolute security. We
                  may change or suspend features for maintenance, safety, legal
                  compliance, or provider outages.
                </span>
                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  To the extent permitted by applicable law, WeEverything is not
                  liable for indirect or consequential loss arising from use of
                  the service, third-party services, or user-submitted content.
                  Nothing in these Terms limits liability or consumer rights
                  that cannot legally be excluded or limited. You remain
                  responsible for your account security and your use of the
                  service.
                </span>
              </span>
              <span className="flex flex-col mt-4  px-4">
                <span className="text-[#999]  text-sm mb-2 font-medium tracking-tight ">
                  12. Changes to these terms and privacy notice.
                </span>

                <span className="indent-8 font-medium text-sm leading-4 tracking-tight ">
                  We may revise these Terms and this Privacy Notice as the
                  service or law changes. The date above identifies the latest
                  revision. Where notice or consent is required by law, we will
                  provide it; continued use alone does not remove any rights
                  that applicable law gives you.
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
