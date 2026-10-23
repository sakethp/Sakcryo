import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return <section className="narrow-wrap"><AuthForm mode="signup" /></section>;
}
