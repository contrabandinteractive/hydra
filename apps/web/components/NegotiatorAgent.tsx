"use client";

import { useState } from "react";

interface Collaborator {
  name: string;
  address: string;
  splitPercentage: number;
  reasoning: string;
}

interface NegotiationResult {
  dealName: string;
  productName: string;
  collaborators: Collaborator[];
  recoupRecipient: string;
  recoupTarget: number;
  recoupReasoning: string;
  productPrice: number;
  pricingReasoning: string;
  summary: string;
}

interface NegotiatorAgentProps {
  onAccept: (result: NegotiationResult) => void;
}

export function NegotiatorAgent({ onAccept }: NegotiatorAgentProps) {
  const [description, setDescription] = useState("");
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAgent, setShowAgent] = useState(true);

  const handleNegotiate = async () => {
    if (!description.trim()) return;

    setIsNegotiating(true);
    setError(null);

    try {
      const response = await fetch("/api/negotiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        throw new Error("Failed to negotiate deal terms");
      }

      const negotiation: NegotiationResult = await response.json();
      setResult(negotiation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsNegotiating(false);
    }
  };

  const handleAccept = () => {
    if (result) {
      onAccept(result);
      setShowAgent(false);
    }
  };

  const handleReset = () => {
    setDescription("");
    setResult(null);
    setError(null);
  };

  if (!showAgent) {
    return null;
  }

  return (
    <div className="card mb-8 border-mnee-600/50">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-mnee-100 mb-2">
            🤖 Negotiator Agent
          </h2>
          <p className="text-sm text-mnee-300 font-medium">
            Describe your deal and let AI suggest fair terms
          </p>
        </div>
        <button
          onClick={() => setShowAgent(false)}
          className="text-mnee-400 hover:text-mnee-300 text-sm font-bold"
        >
          Skip
        </button>
      </div>

      {!result ? (
        <>
          <textarea
            placeholder="Example: I'm selling a digital album. I produced the whole thing ($500 in studio costs), my friend mixed it, and another friend designed the album art. We want to sell it to fans."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isNegotiating}
            className="input w-full min-h-32 resize-y font-medium"
          />

          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border-2 border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm font-bold">{error}</p>
            </div>
          )}

          <button
            onClick={handleNegotiate}
            disabled={!description.trim() || isNegotiating}
            className="btn-primary mt-4 w-full"
          >
            {isNegotiating ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Negotiating...
              </span>
            ) : (
              "Generate Fair Terms"
            )}
          </button>
        </>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="p-4 bg-mnee-700/20 border-2 border-mnee-600/50 rounded-lg">
            <h3 className="font-display font-bold text-mnee-100 mb-2">Summary</h3>
            <p className="text-sm text-mnee-200 font-medium">{result.summary}</p>
          </div>

          {/* Deal Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-mnee-400 font-bold mb-1">Deal Name</p>
              <p className="text-mnee-100 font-bold">{result.dealName}</p>
            </div>
            <div>
              <p className="text-xs text-mnee-400 font-bold mb-1">Product</p>
              <p className="text-mnee-100 font-bold">{result.productName}</p>
            </div>
          </div>

          {/* Collaborators */}
          <div>
            <h3 className="font-display font-bold text-mnee-100 mb-3">
              Collaborators ({result.collaborators.length})
            </h3>
            <div className="space-y-2">
              {result.collaborators.map((collab, index) => (
                <div
                  key={index}
                  className="p-3 bg-mnee-800/30 border border-mnee-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-mnee-100">{collab.name}</span>
                    <span className="text-mnee-300 font-bold">
                      {(collab.splitPercentage / 100).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-mnee-400 font-medium">{collab.reasoning}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recoup */}
          <div className="p-4 bg-mnee-600/20 border-2 border-mnee-600/50 rounded-lg">
            <h3 className="font-display font-bold text-mnee-100 mb-2">Recoup Terms</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-mnee-200 font-bold">{result.recoupRecipient}</span>
              <span className="text-mnee-100 font-bold text-lg">
                {result.recoupTarget} MNEE
              </span>
            </div>
            <p className="text-xs text-mnee-300 font-medium">{result.recoupReasoning}</p>
          </div>

          {/* Pricing */}
          <div className="p-4 bg-mnee-700/20 border-2 border-mnee-600/50 rounded-lg">
            <h3 className="font-display font-bold text-mnee-100 mb-2">Product Price</h3>
            <p className="text-2xl font-display font-bold text-mnee-100 mb-2">
              {result.productPrice} MNEE
            </p>
            <p className="text-xs text-mnee-300 font-medium">{result.pricingReasoning}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button onClick={handleReset} className="btn-secondary flex-1">
              Try Again
            </button>
            <button onClick={handleAccept} className="btn-primary flex-1">
              Accept & Fill Form
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
