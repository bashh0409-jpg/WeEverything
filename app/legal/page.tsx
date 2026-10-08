import React from "react";
import type { Metadata } from "next";
import LegalPage from "./LegalPage";

export const metadata: Metadata = {
  title: "Legal",
  description: "Read the legal information and policies for WeEverything.",
};

const page = () => {
  return (
    <div>
    

      <LegalPage />
    </div>
  );
};

export default page;
