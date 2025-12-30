"use client";

import Link from "next/link";
import { use, useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits } from "viem";
import { COLLAB_DEAL_ABI, ERC20_ABI } from "@/lib/contracts";
import { getMneeAddress } from "@/lib/chains";
import { formatMneeDisplay, shortenAddress } from "@/lib/mnee";
import { fetchMetadataFromIPFS, type DealMetadata } from "@/lib/ipfs";

interface PageProps {
  params: Promise<{
    deal: string;
    productId: string;
  }>;
}

export default function CheckoutPage({ params }: PageProps) {
  const { deal: dealAddress, productId } = use(params);
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const mneeAddress = getMneeAddress(chainId);

  const [step, setStep] = useState<"approve" | "pay" | "success">("approve");
  const [metadata, setMetadata] = useState<DealMetadata | null>(null);

  // Read deal info
  const { data: dealName } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "name",
  });

  const { data: productPrice } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "productPrices",
    args: [BigInt(productId)],
  });

  const { data: mode } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "mode",
  });

  const { data: recouped } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "recouped",
  });

  const { data: recoupTarget } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "recoupTarget",
  });

  const { data: metadataHash } = useReadContract({
    address: dealAddress as `0x${string}`,
    abi: COLLAB_DEAL_ABI,
    functionName: "metadataHash",
  });

  // Read MNEE balance and allowance
  const { data: mneeBalance } = useReadContract({
    address: mneeAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: mneeAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, dealAddress as `0x${string}`] : undefined,
  });

  // Approve transaction
  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: isApprovePending,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveTxHash,
    });

  // Pay transaction
  const {
    writeContract: writePay,
    data: payTxHash,
    isPending: isPayPending,
    error: payError,
  } = useWriteContract();

  const { isLoading: isPayConfirming, isSuccess: isPaySuccess } =
    useWaitForTransactionReceipt({
      hash: payTxHash,
    });

  // Check if user has enough allowance
  const hasEnoughAllowance =
    typeof productPrice === "bigint" &&
    typeof allowance === "bigint" &&
    allowance >= productPrice;

  useEffect(() => {
    if (hasEnoughAllowance) {
      setStep("pay");
    }
  }, [hasEnoughAllowance]);

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      setStep("pay");
    }
  }, [isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    if (isPaySuccess) {
      setStep("success");
      // Fetch metadata to reveal content URL
      if (typeof metadataHash === "string" && metadataHash !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        fetchMetadataFromIPFS(metadataHash).then((data) => {
          if (data) setMetadata(data);
        }).catch(console.error);
      }
    }
  }, [isPaySuccess, metadataHash]);

  const handleApprove = () => {
    if (!mneeAddress || typeof productPrice !== "bigint") return;

    writeApprove({
      address: mneeAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [dealAddress as `0x${string}`, productPrice],
      gas: 100000n, // Set reasonable gas limit for approve
    });
  };

  const handlePay = () => {
    if (typeof productPrice !== "bigint") return;

    writePay({
      address: dealAddress as `0x${string}`,
      abi: COLLAB_DEAL_ABI,
      functionName: "payProduct",
      args: [
        BigInt(productId),
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      ],
      gas: 300000n, // Set reasonable gas limit (~300k should be plenty)
    });
  };

  const hasEnoughBalance =
    typeof productPrice === "bigint" &&
    typeof mneeBalance === "bigint" &&
    mneeBalance >= productPrice;

  if (!isConnected) {
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
        <div className="max-w-md mx-auto px-4 py-20">
          <div className="card text-center">
            <h1 className="text-2xl font-bold mb-4">Connect to Pay</h1>
            <p className="text-gray-400 mb-6">
              Connect your wallet to purchase with MNEE tokens.
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (step === "success") {
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
        <div className="max-w-md mx-auto px-4 py-20">
          <div className="card text-center">
            <div className="w-16 h-16 bg-mnee-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
            <p className="text-gray-400 mb-6">
              Thank you for your purchase. Your payment has been recorded on-chain.
            </p>

            {/* Content URL - revealed after payment */}
            {metadata?.contentUrl && (
              <div className="p-4 bg-mnee-900/20 border border-mnee-600 rounded-lg mb-6 text-left">
                <p className="text-sm font-semibold text-mnee-400 mb-2">Access Your Content</p>
                <a
                  href={metadata.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-mnee-300 hover:text-mnee-200 break-all underline"
                >
                  {metadata.contentUrl}
                </a>
                <p className="text-xs text-gray-500 mt-2">
                  Click to access your purchased content
                </p>
              </div>
            )}

            <div className="p-4 bg-gray-800 rounded-lg mb-6 text-left">
              <p className="text-sm text-gray-400 mb-1">Transaction Hash</p>
              <a
                href={`https://sepolia.etherscan.io/tx/${payTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-mnee-400 hover:text-mnee-300 break-all"
              >
                {payTxHash}
              </a>
            </div>

            <Link
              href={`/ledger/${dealAddress}`}
              className="btn-primary w-full block"
            >
              View Ledger
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

      <main className="max-w-md mx-auto px-4 py-12">
        <div className="card">
          <h1 className="text-2xl font-bold mb-2">{typeof dealName === "string" ? dealName : "Loading..."}</h1>
          <p className="text-gray-400 text-sm mb-6">
            Deal: {shortenAddress(dealAddress)}
          </p>

          {/* Price */}
          <div className="p-4 bg-gray-800 rounded-lg mb-6">
            <p className="text-sm text-gray-400 mb-1">Price</p>
            <p className="text-3xl font-bold text-mnee-400">
              {typeof productPrice === "bigint" ? formatMneeDisplay(productPrice) : "..."} MNEE
            </p>
          </div>

          {/* Recoup Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Mode</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  mode === 0
                    ? "bg-yellow-600/20 text-yellow-400"
                    : "bg-mnee-600/20 text-mnee-400"
                }`}
              >
                {mode === 0 ? "RECOUP" : "POST-RECOUP"}
              </span>
            </div>
            {mode === 0 && typeof recouped === "bigint" && typeof recoupTarget === "bigint" && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-mnee-400">
                    {formatMneeDisplay(recouped)} / {formatMneeDisplay(recoupTarget)} MNEE
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(
                        (Number(recouped) / Number(recoupTarget)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Balance */}
          <div className="p-3 bg-gray-800/50 rounded-lg mb-6">
            <p className="text-sm text-gray-400">
              Your MNEE Balance:{" "}
              <span className="text-white">
                {typeof mneeBalance === "bigint"
                  ? formatMneeDisplay(mneeBalance)
                  : "..."}
              </span>
            </p>
          </div>

          {!hasEnoughBalance && typeof productPrice === "bigint" && (
            <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg mb-6">
              <p className="text-red-400 text-sm">
                Insufficient MNEE balance. You need{" "}
                {formatMneeDisplay(productPrice)} MNEE.
              </p>
            </div>
          )}

          {payError && (
            <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg mb-6">
              <p className="text-red-400 text-sm">
                {payError.message || "Payment failed"}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {step === "approve" && !hasEnoughAllowance && (
              <button
                onClick={handleApprove}
                disabled={isApprovePending || isApproveConfirming || !hasEnoughBalance}
                className="btn-secondary w-full py-3"
              >
                {isApprovePending
                  ? "Waiting for signature..."
                  : isApproveConfirming
                  ? "Approving..."
                  : "Approve MNEE"}
              </button>
            )}

            <button
              onClick={handlePay}
              disabled={
                !hasEnoughAllowance ||
                !hasEnoughBalance ||
                isPayPending ||
                isPayConfirming
              }
              className="btn-primary w-full py-3"
            >
              {isPayPending
                ? "Waiting for signature..."
                : isPayConfirming
                ? "Processing..."
                : `Pay ${typeof productPrice === "bigint" ? formatMneeDisplay(productPrice) : "..."} MNEE`}
            </button>
          </div>

          <Link
            href={`/ledger/${dealAddress}`}
            className="block text-center text-sm text-gray-400 hover:text-white mt-4"
          >
            View Public Ledger
          </Link>
        </div>
      </main>
    </div>
  );
}
