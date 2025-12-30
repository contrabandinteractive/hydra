"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { COLLAB_DEAL_ABI } from "@/lib/contracts";
import { formatMneeDisplay, shortenAddress, bpsToPercent } from "@/lib/mnee";
import { getAppUrl } from "@/lib/url";

interface PageProps {
  params: Promise<{
    deal: string;
  }>;
}

export default function DealDashboardPage({ params }: PageProps) {
  const { deal: dealAddress } = use(params);
  const { isConnected, address } = useAccount();
  const [copied, setCopied] = useState(false);

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

  const { data: userOwed, refetch: refetchOwed } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "owed",
    args: address ? [address] : undefined,
  });

  // Read owed amounts for all recipients
  const owedContracts = Array.isArray(recipients)
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

  // Withdraw
  const {
    writeContract: writeWithdraw,
    data: withdrawTxHash,
    isPending: isWithdrawPending,
  } = useWriteContract();

  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({
      hash: withdrawTxHash,
    });

  const handleWithdraw = () => {
    writeWithdraw({
      address: dealAddress as `0x${string}`,
      abi: COLLAB_DEAL_ABI,
      functionName: "withdraw",
    });
  };

  const handleCopyCheckoutLink = () => {
    const appUrl = getAppUrl();
    const link = `${appUrl}/checkout/${dealAddress}/0`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCreator = creator && address && creator.toLowerCase() === address.toLowerCase();
  const isRecipient = recipients?.some(
    (r) => r.toLowerCase() === address?.toLowerCase()
  );
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
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{dealName || "Loading..."}</h1>
            <p className="text-gray-400 font-mono text-sm">{dealAddress}</p>
          </div>
          {isCreator && (
            <span className="px-3 py-1 bg-mnee-600/20 text-mnee-400 rounded-full text-sm">
              Creator
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Share</h2>

          <button
            onClick={handleCopyCheckoutLink}
            className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Checkout Link
              </>
            )}
          </button>

          <div className="flex gap-3 mt-4">
            <Link
              href={`/ledger/${dealAddress}`}
              className="btn-secondary flex-1 text-center"
            >
              Public Ledger
            </Link>
            <Link
              href={`/checkout/${dealAddress}/0`}
              className="btn-secondary flex-1 text-center"
            >
              Checkout Page
            </Link>
          </div>
        </div>

        {/* Status */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recoup Progress</h2>
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

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">
                {recouped !== undefined ? formatMneeDisplay(recouped) : "..."} /{" "}
                {recoupTarget ? formatMneeDisplay(recoupTarget) : "..."} MNEE
              </span>
              <span className="text-mnee-400">{progressPercent.toFixed(1)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {!isRecoup && (
            <div className="p-3 bg-mnee-600/10 border border-mnee-600/30 rounded-lg">
              <p className="text-mnee-400 text-sm">
                Mode flipped! Payments now split according to percentages.
              </p>
            </div>
          )}
        </div>

        {/* Withdraw (for recipients) */}
        {isConnected && isRecipient && userOwed !== undefined && userOwed > 0n && (
          <div className="card mb-8 border-mnee-600/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Your Earnings</h2>
                <p className="text-3xl font-bold text-mnee-400 mt-2">
                  {formatMneeDisplay(userOwed)} MNEE
                </p>
              </div>
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawPending || isWithdrawConfirming}
                className="btn-primary py-3 px-8"
              >
                {isWithdrawPending
                  ? "Signing..."
                  : isWithdrawConfirming
                  ? "Withdrawing..."
                  : "Withdraw"}
              </button>
            </div>
            {isWithdrawSuccess && withdrawTxHash && (
              <div className="mt-4 p-3 bg-mnee-600/10 rounded-lg">
                <p className="text-mnee-400 text-sm">
                  Withdrawal successful! TX: {shortenAddress(withdrawTxHash)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Collaborator Payouts */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Collaborator Payouts</h2>

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
                  const isCurrentUser =
                    address && recipient.toLowerCase() === address.toLowerCase();

                  return (
                    <tr
                      key={recipient}
                      className={`border-b border-gray-800 ${
                        isCurrentUser ? "bg-mnee-600/5" : ""
                      }`}
                    >
                      <td className="py-4">
                        <span className="font-mono text-sm">
                          {shortenAddress(recipient)}
                        </span>
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-mnee-400">(You)</span>
                        )}
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
          <div className="card">
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
                  <button
                    onClick={() => {
                      const appUrl = getAppUrl();
                      const link = `${appUrl}/checkout/${dealAddress}/${index}`;
                      navigator.clipboard.writeText(link);
                    }}
                    className="btn-secondary text-sm"
                  >
                    Copy Link
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
