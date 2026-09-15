import React from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import BottomButton from "../components/BottomButton";
import LegalPage from "./LegalPage";

export const metadata: Metadata = {
  title: "Legal",
  description: "Read the legal information and policies for WeEverything.",
};

const page = () => {
  return (
    <div>
      <Navbar />
      <BottomButton />
      <LegalPage />
    </div>
  );
};

export default page;
