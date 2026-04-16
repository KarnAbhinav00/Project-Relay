"use client";

import { motion } from "framer-motion";

export default function FloatingAuthForm({
  mode,
  setMode,
  username,
  setUsername,
  email,
  setEmail,
  password,
  setPassword,
  authError,
  authLoading,
  onSubmit,
  onPasswordFocus,
  onPasswordBlur,
}) {
  return (
    <div className="relative z-20 flex min-h-screen items-center px-5 sm:px-8 lg:w-[40%] xl:px-14">
      <motion.div
        initial={false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
        className="auth-form-wrap w-full max-w-[400px]"
      >
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.24em] text-[#ffd447]">Project Relay</p>
        <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-[#f7f9fc] sm:text-[2.5rem]">Enter The Relay</h1>
        <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-slate-300/90 sm:text-sm">
          Futuristic, playful and secure. Your credentials float in space while guardians watch over the portal.
        </p>

        <div className="mt-6 flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-3.5 py-1.5 transition-all duration-300 ${
              mode === "login"
                ? "bg-[#35d07f]/25 text-[#d8ffe9] shadow-[0_0_24px_rgba(53,208,127,0.25)]"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-full px-3.5 py-1.5 transition-all duration-300 ${
              mode === "register"
                ? "bg-[#3299ff]/25 text-[#e5f3ff] shadow-[0_0_24px_rgba(50,153,255,0.24)]"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
          {mode === "register" && (
            <motion.input
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className="floating-input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}

          <input
            className="floating-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="floating-input"
            type="password"
            placeholder="Password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={onPasswordFocus}
            onBlur={onPasswordBlur}
            required
          />

          {authError && <p className="text-sm text-red-300">{authError}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="login-glow-btn"
            type="submit"
            disabled={authLoading}
          >
            {authLoading
              ? mode === "login"
                ? "Signing in..."
                : "Making account..."
              : mode === "login"
                ? "Login"
                : "Create Account"}
          </motion.button>
        </form>

        <p className="mt-6 text-sm text-slate-300/85">
          {mode === "login" ? "Need an account?" : "Already registered?"}{" "}
          <button
            className="text-[#ffd447] transition hover:text-[#ffe37a]"
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Register" : "Login"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
