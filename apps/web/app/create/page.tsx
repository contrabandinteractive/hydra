"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { parseUnits, isAddress, decodeEventLog } from "viem";
import { useCreateDealStore } from "@/lib/store";
import { COLLAB_DEAL_FACTORY_ABI } from "@/lib/contracts";
import { getFactoryAddress } from "@/lib/chains";
import { bpsToPercent, percentToBps } from "@/lib/mnee";
import { uploadMetadataToIPFS, storeMetadataLocally, cidToBytes32 } from "@/lib/ipfs";
import { NegotiatorAgent } from "@/components/NegotiatorAgent";
import { useAppUrl } from "@/lib/url";

export default function CreatePage() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const factoryAddress = getFactoryAddress(chainId);

  const {
    form,
    setName,
    addRecipient,
    removeRecipient,
    updateRecipient,
    setRecipients,
    setRecoupIndex,
    setRecoupTarget,
    setProductName,
    setProductPrice,
    setContentUrl,
    totalBps,
    resetForm,
  } = useCreateDealStore();

  const [createdDeal, setCreatedDeal] = useState<string | null>(null);
  const appUrl = useAppUrl();
  const [isUploadingMetadata, setIsUploadingMetadata] = useState(false);
  const publicClient = usePublicClient();

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Extract deal address from transaction receipt
  useEffect(() => {
    if (isSuccess && receipt && !createdDeal) {
      // Find the DealCreated event log
      const dealCreatedLog = receipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: COLLAB_DEAL_FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === "DealCreated";
        } catch {
          return false;
        }
      });

      if (dealCreatedLog) {
        const decoded = decodeEventLog({
          abi: COLLAB_DEAL_FACTORY_ABI,
          data: dealCreatedLog.data,
          topics: dealCreatedLog.topics,
        }) as { args: { deal: string } };

        setCreatedDeal(decoded.args.deal);
      }
    }
  }, [isSuccess, receipt, createdDeal]);

  const isValidForm = () => {
    if (!form.name.trim()) return false;
    if (form.recipients.length < 2) return false;
    if (form.recipients.some((r) => !isAddress(r.address))) return false;
    if (totalBps() !== 10000) return false;
    if (!form.recoupTarget || parseFloat(form.recoupTarget) <= 0) return false;
    if (!form.productPrice || parseFloat(form.productPrice) <= 0) return false;
    return true;
  };

  const handleNegotiationAccept = (result: any) => {
    // Set deal name and product
    setName(result.dealName);
    setProductName(result.productName);
    setProductPrice(result.productPrice.toString());
    setRecoupTarget(result.recoupTarget.toString());

    // Set recipients
    const recipients = result.collaborators.map((collab: any) => ({
      address: collab.address,
      label: collab.name,
      bps: collab.splitPercentage,
    }));
    setRecipients(recipients);

    // Find recoup recipient index
    const recoupIndex = result.collaborators.findIndex(
      (collab: any) => collab.name === result.recoupRecipient
    );
    if (recoupIndex !== -1) {
      setRecoupIndex(recoupIndex);
    }
  };

  const handleCreate = async () => {
    if (!factoryAddress || !isValidForm()) return;

    try {
      setIsUploadingMetadata(true);

      // Upload metadata to IPFS
      const metadata = {
        dealName: form.name,
        productName: form.productName,
        contentUrl: form.contentUrl || "",
        createdAt: new Date().toISOString(),
        version: "1.0.0",
      };

      const metadataHash = await uploadMetadataToIPFS(metadata);
      const hashBytes32 = cidToBytes32(metadataHash);

      // Store locally as backup
      storeMetadataLocally(hashBytes32, metadata);

      setIsUploadingMetadata(false);

      // Create deal with IPFS metadata hash
      const recipients = form.recipients.map((r) => r.address as `0x${string}`);
      const bpsAfter = form.recipients.map((r) => r.bps);
      const recoupTarget = parseUnits(form.recoupTarget, 18);
      const productPrices = [parseUnits(form.productPrice, 18)];

      writeContract({
        address: factoryAddress,
        abi: COLLAB_DEAL_FACTORY_ABI,
        functionName: "createDeal",
        args: [
          form.name,
          recipients,
          bpsAfter,
          form.recoupIndex,
          recoupTarget,
          productPrices,
          hashBytes32,
        ],
      });
    } catch (error) {
      console.error("Failed to upload metadata:", error);
      setIsUploadingMetadata(false);
      // Could show error to user here
    }
  };

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
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Connect Wallet</h1>
          <p className="text-gray-400 mb-8">
            Please connect your wallet to create a deal.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (!factoryAddress) {
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
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Factory Not Deployed</h1>
          <p className="text-gray-400">
            The CollabDealFactory is not deployed on this network yet. Please
            switch to a supported network or deploy the contract.
          </p>
        </div>
      </div>
    );
  }

  if (isSuccess && txHash) {
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
        <div className="max-w-2xl mx-auto px-4 py-20">
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
            <h1 className="text-3xl font-bold mb-4">Deal Created!</h1>
            <p className="text-gray-400 mb-8">
              Your collaborative checkout is ready. Share the links below with
              your collaborators and fans.
            </p>

            <div className="space-y-4 text-left">
              {createdDeal ? (
                <>
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Deal Address</p>
                    <p className="font-mono text-sm break-all">{createdDeal}</p>
                  </div>

                  <div className="p-4 bg-mnee-900/20 border border-mnee-600 rounded-lg">
                    <p className="text-sm font-semibold text-mnee-400 mb-3">🔗 Payment Link</p>
                    <p className="text-xs text-gray-400 mb-2">Share this link with buyers:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={appUrl ? `${appUrl}/checkout/${createdDeal}/0` : `/checkout/${createdDeal}/0`}
                        className="input text-xs flex-1 font-mono"
                        onClick={(e) => e.currentTarget.select()}
                      />
                      <button
                        onClick={() => {
                          const link = appUrl ? `${appUrl}/checkout/${createdDeal}/0` : `/checkout/${createdDeal}/0`;
                          navigator.clipboard.writeText(link);
                        }}
                        className="btn-secondary text-xs px-3 py-2"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Link
                      href={`/deal/${createdDeal}`}
                      className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <p className="text-sm font-semibold mb-1">📊 Creator Dashboard</p>
                      <p className="text-xs text-gray-400">Manage & withdraw funds</p>
                    </Link>
                    <Link
                      href={`/ledger/${createdDeal}`}
                      className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <p className="text-sm font-semibold mb-1">📖 Public Ledger</p>
                      <p className="text-xs text-gray-400">View all payments</p>
                    </Link>
                  </div>

                  <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Transaction Hash</p>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-mnee-400 hover:text-mnee-300 break-all"
                    >
                      {txHash}
                    </a>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-gray-800 rounded-lg text-center">
                  <p className="text-sm text-gray-400">
                    Extracting deal address from transaction...
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  resetForm();
                  window.location.reload();
                }}
                className="btn-secondary flex-1"
              >
                Create Another
              </button>
              <Link href="/" className="btn-primary flex-1 text-center">
                Go Home
              </Link>
            </div>
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

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold mb-8 text-mnee-100">Create a Deal</h1>

        {/* Negotiator Agent */}
        <NegotiatorAgent onAccept={handleNegotiationAccept} />

        <div className="space-y-8">
          {/* Deal Name */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Deal Name</h2>
            <input
              type="text"
              placeholder="e.g., Single Drop"
              value={form.name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Recipients */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Collaborators</h2>
              <button
                onClick={addRecipient}
                disabled={form.recipients.length >= 10}
                className="btn-secondary text-sm"
              >
                + Add
              </button>
            </div>

            <div className="space-y-4">
              {form.recipients.map((recipient, index) => (
                <div key={index} className="p-4 bg-gray-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      placeholder="Role (e.g., Artist, Producer)"
                      value={recipient.label}
                      onChange={(e) =>
                        updateRecipient(index, "label", e.target.value)
                      }
                      className="input w-40"
                    />
                    {form.recipients.length > 2 && (
                      <button
                        onClick={() => removeRecipient(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Wallet address (0x...)"
                    value={recipient.address}
                    onChange={(e) =>
                      updateRecipient(index, "address", e.target.value)
                    }
                    className={`input w-full font-mono text-sm ${
                      recipient.address && !isAddress(recipient.address)
                        ? "border-red-500"
                        : ""
                    }`}
                  />

                  <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-400">
                      Post-recoup split:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={bpsToPercent(recipient.bps)}
                        onChange={(e) =>
                          updateRecipient(
                            index,
                            "bps",
                            percentToBps(parseFloat(e.target.value) || 0)
                          )
                        }
                        className="input w-24"
                      />
                      <span className="text-gray-400">%</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recoupRecipient"
                      checked={form.recoupIndex === index}
                      onChange={() => setRecoupIndex(index)}
                      className="accent-mnee-500"
                    />
                    <span className="text-sm text-gray-400">
                      Recoup recipient (gets 100% until target is met)
                    </span>
                  </label>
                </div>
              ))}
            </div>

            {totalBps() !== 10000 && (
              <p className="mt-4 text-yellow-400 text-sm">
                Total split: {bpsToPercent(totalBps())}% (must equal 100%)
              </p>
            )}
          </div>

          {/* Recoup Target */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Recoup Target</h2>
            <p className="text-gray-400 text-sm mb-4">
              The selected recipient receives 100% of payments until this amount
              is reached.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 50"
                value={form.recoupTarget}
                onChange={(e) => setRecoupTarget(e.target.value)}
                className="input w-full"
              />
              <span className="text-gray-400 font-medium">MNEE</span>
            </div>
          </div>

          {/* Product */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Product</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Product name"
                value={form.productName}
                onChange={(e) => setProductName(e.target.value)}
                className="input w-full"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  value={form.productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  className="input w-full"
                />
                <span className="text-gray-400 font-medium">MNEE</span>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Content URL (optional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or ipfs://..."
                  value={form.contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  className="input w-full font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Link to digital content (download, access code, etc.) - revealed after payment
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg">
                <p className="text-red-400 text-sm">
                  {error.message || "Transaction failed"}
                </p>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={!isValidForm() || isPending || isConfirming || isUploadingMetadata}
              className="btn-primary w-full py-4 text-lg"
            >
              {isUploadingMetadata
                ? "Uploading to IPFS..."
                : isPending
                ? "Waiting for signature..."
                : isConfirming
                ? "Creating deal..."
                : "Create Deal"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
