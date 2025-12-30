"use client";

import Link from "next/link";
import { use } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { COLLAB_DEAL_ABI } from "@/lib/contracts";
import { formatMneeDisplay, shortenAddress, bpsToPercent } from "@/lib/mnee";
import { useAppUrl } from "@/lib/url";

interface PageProps {
  params: Promise<{
    deal: string;
  }>;
}

export default function LedgerPage({ params }: PageProps) {
  const { deal: dealAddress } = use(params);
  const appUrl = useAppUrl();

  // Read deal info
  const { data: dealName } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "name",
  });

  const { data: creator } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "creator",
  });

  const { data: recipients } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "getRecipients",
  });

  const { data: bpsAfter } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "getBpsAfter",
  });

  const { data: recoupIndex } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "recoupIndex",
  });

  const { data: recoupTarget } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "recoupTarget",
  });

  const { data: recouped } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "recouped",
  });

  const { data: mode } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "mode",
  });

  const { data: productPrices } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "getProductPrices",
  });

  // Read owed amounts for each recipient
  const owedContracts = recipients
    ? recipients.map((recipient) => ({
        address: dealAddress as `0x${string}`,
        abi: COLLAB_DEAL_ABI,
        functionName: "owed" as const,
        args: [recipient] as const,
      }))
    : [];

  const { data: owedData } = useReadContracts({
    contracts: owedContracts,
  });

  const isRecoup = mode === 0;
  const progressPercent =
    recouped !== undefined && recoupTarget
      ? Math.min((Number(recouped) / Number(recoupTarget)) * 100, 100)
      : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-mnee-500">
            Hydra
          </Link>
          <span className="text-sm text-gray-400">Public Ledger</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{dealName || "Loading..."}</h1>
          <p className="text-gray-400 font-mono text-sm">
            Deal: {dealAddress}
          </p>
          {creator && (
            <p className="text-gray-500 text-sm mt-1">
              Created by {shortenAddress(creator)}
            </p>
          )}
        </div>

        {/* Mode & Progress */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Status</h2>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isRecoup
                  ? "bg-yellow-600/20 text-yellow-400"
                  : "bg-mnee-600/20 text-mnee-400"
              }`}
            >
              {isRecoup ? "RECOUP" : "POST-RECOUP"}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Recoup Progress</span>
              <span className="text-mnee-400">
                {recouped !== undefined ? formatMneeDisplay(recouped) : "..."} /{" "}
                {recoupTarget ? formatMneeDisplay(recoupTarget) : "..."} MNEE
              </span>
            </div>
            <div className="progress-bar relative">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
              {progressPercent >= 100 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow">
                    COMPLETE
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Mode flip indicator */}
          {!isRecoup && (
            <div className="p-3 bg-mnee-600/10 border border-mnee-600/30 rounded-lg">
              <p className="text-mnee-400 text-sm">
                Recoup target reached! Payments now split according to configured percentages.
              </p>
            </div>
          )}
        </div>

        {/* Collaborators */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Collaborators</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3">Address</th>
                  <th className="pb-3 text-center">Role</th>
                  <th className="pb-3 text-right">Split</th>
                  <th className="pb-3 text-right">Owed</th>
                </tr>
              </thead>
              <tbody>
                {recipients?.map((recipient, index) => {
                  const isRecoupRecipient = recoupIndex === index;
                  const owed = owedData?.[index]?.result as bigint | undefined;
                  const split = bpsAfter?.[index];

                  return (
                    <tr key={recipient} className="border-b border-gray-800">
                      <td className="py-4">
                        <span className="font-mono text-sm">
                          {shortenAddress(recipient)}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        {isRecoupRecipient && (
                          <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-xs">
                            Recoup
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right text-gray-400">
                        {split !== undefined ? `${bpsToPercent(split)}%` : "..."}
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-mnee-400 font-medium">
                          {owed !== undefined ? formatMneeDisplay(owed) : "..."} MNEE
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Products */}
        {productPrices && productPrices.length > 0 && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold mb-4">Products</h2>

            <div className="space-y-3">
              {productPrices.map((price, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="font-medium">Product #{index}</p>
                    <p className="text-sm text-gray-400">
                      {formatMneeDisplay(price)} MNEE
                    </p>
                  </div>
                  <Link
                    href={`/checkout/${dealAddress}/${index}`}
                    className="btn-primary text-sm"
                  >
                    Buy Now
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Links</h2>

          <div className="space-y-3">
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Checkout Link</p>
              <p className="font-mono text-sm break-all">
                {appUrl ? `${appUrl}/checkout/${dealAddress}/0` : `/checkout/${dealAddress}/0`}
              </p>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Ledger Link</p>
              <p className="font-mono text-sm break-all">
                {appUrl ? `${appUrl}/ledger/${dealAddress}` : `/ledger/${dealAddress}`}
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>
            This ledger is read-only and displays on-chain data transparently.
          </p>
        </div>
      </footer>
    </div>
  );
}
