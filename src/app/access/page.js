"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";

export default function AccessPage() {
  const [token, setToken] = useState("");
  const [dept, setDept] = useState("Logistics");

  const handleEnter = () => {
    if (!token || !dept) return;
    // We redirect to the internal Next.js route
    window.location.href = `/plan/${token}?scope=${dept.toLowerCase()}`;
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      {/* Tilted Grid background */}
      <div className="tilted-grid opacity-40" aria-hidden="true" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="floating-card p-8 md:p-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/5 text-primary mb-2">
              <Lock size={24} />
            </div>
            <h1 className="text-3xl font-serif text-foreground">
              Enter Workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Access your event plan with a secure token and department scope.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="label-caps px-1">Access Token</label>
              <input
                className="input-recessed w-full"
                placeholder="Enter Token (e.g. FsKzXYix)"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="label-caps px-1">Department</label>
              <div className="relative">
                <select
                  className="input-recessed w-full appearance-none cursor-pointer"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                >
                  <option>Logistics</option>
                  <option>Marketing</option>
                  <option>Technical</option>
                  <option>Operations</option>
                  <option value="full">Full Access (Admin)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl text-xs font-bold uppercase tracking-[0.1em] mt-2 shadow-lg shadow-primary/10"
              onClick={handleEnter}
            >
              Enter Workspace
            </motion.button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground/60 uppercase tracking-widest pt-4 border-t border-border/50">
            Powered by Planora AI
          </p>
        </div>
      </motion.div>
    </div>
  );
}
