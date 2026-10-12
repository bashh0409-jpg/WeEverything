import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "How to create your profile",
  description:
    "A quick guide to creating, publishing, and sharing your WeEverything profile.",
};

const steps = [
  {
    number: "01",
    title: "Sign in",
    description:
      "Choose Google, Discord, or GitHub. After signing in, you’ll land on your profile page.",
  },
  {
    number: "02",
    title: "Open the profile editor",
    description:
      "Select Update near the top of your profile to add or change your details.",
  },
  {
    number: "03",
    title: "Tell people about your work",
    description:
      "Add your name, location, roles, and a bio of at least 20 words. Add the portfolio, social accounts, and contact details you want people to see. You can also add awards, experience, and custom sections.",
  },
  {
    number: "04",
    title: "Save your changes",
    description:
      "Select Save in the editor. Your profile details and links are saved to your account.",
  },
  {
    number: "05",
    title: "Add a photo and publish",
    description:
      "Upload an image to the first media slot, then select Publish. A bio of at least 20 words and a first-slot image are required to publish your profile publicly.",
  },
  {
    number: "06",
    title: "Share your profile",
    description:
      "Once published, use Share profile on your profile page to copy your link and send it to people or post it on your socials.",
  },
];

export default function HowToPage() {
  return (
    <div>
      <Navbar />

      <div className=" max-w-2xl mx-auto mt-50 geist gap-4 p-4">
        <div>
          <h1 className="text-5xl mt-10 mb-4 tracking-tighter font-semibold">
            How to add your profile
          </h1>
          <p className="text-sm text-justify font-medium tracking-tight text-[#999]">
            Create a profile to show people who you are, what you do, and the
            work you want them to see.
          </p>
        </div>

        <div>
          <div className="mt-8 space-y-6">
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.number}>
                  <h2 className="text-[#999] text-sm mb-2 font-medium tracking-tight">
                    {step.number} — {step.title}
                  </h2>
                  <p className="ml-8 text-justify font-medium text-sm leading-4 tracking-tight">
                    {step.description}
                  </p>
                </div>
              ))}

              <div>
                <h2 className="text-[#999] text-sm mb-2 font-medium tracking-tight">
                  Get started
                </h2>
                <p className="indent-8 mb-20 font-medium text-sm leading-4 tracking-tight">
                  <Link href="/signin" className="underline text-blue-500">
                    Sign in
                  </Link>{" "}
                  to create your profile, or{" "}
                  <Link href="/profile" className="underline text-blue-500">
                    go to your profile
                  </Link>{" "}
                  if you are already signed in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
