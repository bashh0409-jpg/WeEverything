"use client";

import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import SignInModal from "../components/SignInModal";
import BottomButton from "../components/BottomButton";

const SignInPage = () => {
  const router = useRouter();

  return (
    <>
      <Navbar />
      <BottomButton />
      <SignInModal onClose={() => router.push("/")} />
    </>
  );
};

export default SignInPage;
