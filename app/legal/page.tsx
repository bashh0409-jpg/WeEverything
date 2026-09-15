import React from "react";
import Navbar from "../components/Navbar";
import BottomButton from "../components/BottomButton";
import LegalPage from "./LegalPage";

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
