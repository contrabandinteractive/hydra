"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

export default function HomePage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b-2 border-mnee-700/50 backdrop-blur-sm bg-mnee-900/50">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <Link href="/" className="text-3xl font-display font-bold text-mnee-200 hover:text-mnee-100 transition-colors">
            Hydra
          </Link>
          <ConnectButton />
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center space-y-8">
          <h1 className="text-6xl md:text-7xl font-display font-bold text-mnee-100">
            Collab Checkout with{" "}
            <span className="text-mnee-600 bg-gradient-to-r from-mnee-600 to-mnee-500 bg-clip-text text-transparent">Programmable Recoup</span>
          </h1>

          <p className="text-xl text-mnee-300 max-w-2xl mx-auto font-medium">
            Create payment links that automatically pay collaborators. One contributor
            gets paid back first, then splits switch automatically.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            {isConnected ? (
              <Link href="/create" className="btn-primary text-lg px-8 py-3">
                Create a Deal
              </Link>
            ) : (
              <ConnectButton />
            )}
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-32 grid md:grid-cols-3 gap-8">
          <div className="card text-center hover:border-mnee-600 transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-mnee-600 to-mnee-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-2xl font-display font-bold text-mnee-50">1</span>
            </div>
            <h3 className="text-2xl font-display font-bold mb-3 text-mnee-100">Create a Deal</h3>
            <p className="text-mnee-300 font-medium">
              Set up collaborators, splits, and a recoup target. One person gets paid
              first until the target is hit.
            </p>
          </div>

          <div className="card text-center hover:border-mnee-600 transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-mnee-600 to-mnee-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-2xl font-display font-bold text-mnee-50">2</span>
            </div>
            <h3 className="text-2xl font-display font-bold mb-3 text-mnee-100">Share Checkout Link</h3>
            <p className="text-mnee-300 font-medium">
              Fans pay with MNEE tokens. Progress is tracked transparently on the
              public ledger.
            </p>
          </div>

          <div className="card text-center hover:border-mnee-600 transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-mnee-600 to-mnee-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-2xl font-display font-bold text-mnee-50">3</span>
            </div>
            <h3 className="text-2xl font-display font-bold mb-3 text-mnee-100">Auto-Split Payments</h3>
            <p className="text-mnee-300 font-medium">
              When recoup hits, splits flip automatically. Collaborators withdraw
              their earned MNEE anytime.
            </p>
          </div>
        </div>

        {/* Mode Flip Animation */}
        <div className="mt-32 card max-w-2xl mx-auto">
          <h3 className="text-3xl font-display font-bold text-center mb-8 text-mnee-100">The Magic Moment</h3>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-mnee-300 font-bold">Mode</span>
              <span className="px-4 py-2 bg-mnee-500/30 text-mnee-200 rounded-lg text-sm font-bold border border-mnee-500/50">
                RECOUP
              </span>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-mnee-300 font-bold">Progress</span>
                <span className="text-mnee-200 font-bold">29 / 30 MNEE</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "97%" }} />
              </div>
            </div>

            <div className="border-t-2 border-mnee-700/50 pt-6">
              <p className="text-center text-mnee-300 mb-4 font-medium">
                Next payment of 10 MNEE crosses the threshold...
              </p>

              <div className="flex items-center justify-center gap-4">
                <span className="px-4 py-2 bg-mnee-500/30 text-mnee-200 rounded-lg text-sm font-bold border border-mnee-500/50">
                  RECOUP
                </span>
                <span className="text-mnee-400 text-xl">→</span>
                <span className="px-4 py-2 bg-mnee-600/30 text-mnee-100 rounded-lg text-sm font-bold border border-mnee-600/50">
                  POST-RECOUP
                </span>
              </div>

              <p className="text-center text-sm text-mnee-400 mt-4 font-bold">
                Splits now apply: 70% / 20% / 10%
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-mnee-700/50 mt-32 bg-mnee-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-mnee-400">
          <p className="font-bold">
            Built for MNEE Hackathon • Powered by{" "}
            <span className="text-mnee-600 font-display">MNEE</span> ERC-20
          </p>
        </div>
      </footer>
    </div>
  );
}
