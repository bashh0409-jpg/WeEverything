import React from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import BottomButton from "../components/BottomButton";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about WeEverything and the people behind the creative directory.",
};

const page = () => {
  return (
    <div>
      <Navbar />
      
    </div>
  );
};

export default page;
