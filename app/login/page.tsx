"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-black">
      <form onSubmit={handleLogin} className="w-full max-w-sm">
        <h1 className="mb-12 text-sm font-semibold tracking-[0.18em]">
          EYE RELICS
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-5 w-full border-b border-black/20 py-3 outline-none focus:border-black"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-8 w-full border-b border-black/20 py-3 outline-none focus:border-black"
        />

        <button
          type="submit"
          className="text-xs font-medium uppercase tracking-[0.18em] hover:opacity-40"
        >
          Login
        </button>

        {message && (
          <p className="mt-6 text-xs text-black/50">{message}</p>
        )}
      </form>
    </main>
  );
}
