"use client";

import Navbar from "../components/Navbar";

const Page = () => {
  return (
    <div>
      <Navbar />

      <div className=" max-w-2xl mx-auto mt-50 geist  gap-4 p-4">
        <div>
          {" "}
          <h1 className="text-5xl mt-10 mb-4 tracking-tighter text- font-semibold">
            About WeEverything
          </h1>
        </div>
        <div>
          <div className="mt-8 space-y-6">
            <p className="text-sm text-justify font-medium tracking-tight text-[#999]">
              WeEverything is a simple place for creative people to show who
              they are, what they do, and the work they want the world to see.
            </p>

            <div className="space-y-4">
              <div>
                <h2 className="text-[#999] text-sm mb-2 font-medium tracking-tight">
                  Built for creatives
                </h2>
                <p className="indent-8 font-medium text-sm leading-4 tracking-tight">
                  WeEverything helps artists, designers, writers, makers, and
                  founders share a profile, portfolio links, and a public
                  presence in one place.
                </p>
              </div>

              <div>
                <h2 className="text-[#999] text-sm mb-2 font-medium tracking-tight">
                  One profile, many connections
                </h2>
                <p className="indent-8 font-medium text-sm leading-4 tracking-tight">
                  From bios and media to social links and contact details,
                  profiles are designed to make creative work easier to discover
                  and easier to connect with.
                </p>
              </div>

              <div>
                <h2 className="text-[#999] text-sm mb-2 font-medium tracking-tight">
                  Discover and connect
                </h2>
                <p className="indent-8 font-medium text-sm leading-4 tracking-tight">
                  The goal is simple: help people find creative talent, explore
                  new work, and build meaningful opportunities around it.
                </p>
              </div>
              <div>
                <h2 className="text-[#999] text-sm mb-2 font-medium tracking-tight">
                  Legal
                </h2>
                <p className="indent-8 mb-20 font-medium text-sm leading-4 tracking-tight">
                  See our <a href="/legal" className="underline text-blue-500">legal page</a> for more information about our terms of service, privacy policy, and other legal matters.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
