"use client";

import { useSignIn } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const LoginPage = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signIn, setActive } = useSignIn();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn && user?.publicMetadata.role) {
      router.push('/home');
    }
  }, [isLoaded, isSignedIn, user, router]);

  // Eğer sayfa yüklenmemişse loading gösterebiliriz
  if (!isLoaded) {
    return null;
  }

  // Kullanıcı giriş yapmışsa ve yönlendirme bekleniyorsa
  if (isSignedIn) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await signIn.create({
        identifier: username,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push('/home');
      }
    } catch (err) {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="grid h-screen w-full grid-cols-1 md:grid-cols-2">
      {/* Left side with form */}
      <div className="flex items-center justify-center bg-zinc-100 px-4 sm:px-8">
        <div className="w-full space-y-6 rounded-2xl bg-white px-4 py-10 shadow-md ring-1 ring-black/5 sm:w-96 sm:px-8">
          <header className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/logo/vd-transport-logo.png"
                alt="Van Dijle Logo"
                className="h-15 w-auto"
              />
            </div>
          </header>
          {error && (
            <div className="text-sm text-red-400 text-center">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-950">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md bg-white px-3.5 py-2 text-sm outline-none ring-1 ring-inset ring-zinc-300 hover:ring-zinc-400 focus:ring-[1.5px] focus:ring-[#18608F] data-[invalid]:ring-red-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-950">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md bg-white px-3.5 py-2 text-sm outline-none ring-1 ring-inset ring-zinc-300 hover:ring-zinc-400 focus:ring-[1.5px] focus:ring-[#18608F] data-[invalid]:ring-red-400"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-[#18608F] px-3.5 py-2.5 text-center text-sm font-medium text-white shadow outline-none ring-1 ring-inset ring-[#18608F] hover:bg-[#145e7d] hover:ring-[#145e7d] focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-[#145e7d] active:text-white/70 transition-all duration-300 ease-in-out"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>

      {/* Right side with image */}
      <div className="hidden md:flex h-screen items-center justify-center bg-zinc-950 clip-path-diagonal-bottom">
        <img
          src="/img/truck-image.jpg"
          alt="Transport Management"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
};

export default LoginPage;