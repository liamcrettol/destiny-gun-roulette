"use client";

import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn("bungie")}
      className="w-full bg-bungie-blue hover:opacity-90 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
      </svg>
      Sign in with Bungie.net
    </button>
  );
}
