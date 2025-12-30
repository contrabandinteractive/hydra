/**
 * IPFS utilities for storing deal metadata
 * Uses Pinata for reliable decentralized storage
 */

import { PinataSDK } from "pinata";

export interface DealMetadata {
  dealName: string;
  productName: string;
  contentUrl: string;
  createdAt: string;
  version: string;
}

/**
 * Upload deal metadata to IPFS via Pinata
 * Returns CID (content identifier) hash
 */
export async function uploadMetadataToIPFS(metadata: DealMetadata): Promise<string> {
  const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;

  // Fallback: If no Pinata JWT, use localStorage for demo
  if (!pinataJwt) {
    console.warn("No Pinata JWT found, using localStorage fallback");
    const hash = generateLocalHash(metadata);
    storeMetadataLocally(hash, metadata);
    return hash;
  }

  try {
    // Initialize Pinata SDK
    const pinataGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
    const pinata = new PinataSDK({
      pinataJwt,
      ...(pinataGateway && { pinataGateway }),
    });

    // Upload JSON metadata to IPFS
    const upload = await pinata.upload.json(metadata);

    // Return the CID
    return upload.cid;
  } catch (error) {
    console.error("Pinata upload failed:", error);

    // Fallback to localStorage on error
    const hash = generateLocalHash(metadata);
    storeMetadataLocally(hash, metadata);
    return hash;
  }
}

/**
 * Fetch metadata from IPFS given a CID or hash
 */
export async function fetchMetadataFromIPFS(cidOrHash: string): Promise<DealMetadata | null> {
  // If it's a local hash (starts with 0x), retrieve from localStorage
  if (cidOrHash.startsWith("0x")) {
    return fetchFromLocalStorage(cidOrHash);
  }

  try {
    const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    const pinataGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;

    // If Pinata is configured, use it for fetching
    if (pinataJwt) {
      const pinata = new PinataSDK({
        pinataJwt,
        ...(pinataGateway && { pinataGateway }),
      });

      try {
        const data = await pinata.gateways.get(cidOrHash);
        return data.data as DealMetadata;
      } catch (pinataError) {
        console.warn("Pinata gateway fetch failed, trying public gateway:", pinataError);
      }
    }

    // Fallback to public IPFS gateway
    const publicGateway = `https://ipfs.io/ipfs/${cidOrHash}`;
    const response = await fetch(publicGateway, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Public gateway failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch from IPFS:", error);
    return null;
  }
}

/**
 * Store metadata locally as fallback (for demo)
 */
export function storeMetadataLocally(hash: string, metadata: DealMetadata): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(`ipfs_${hash}`, JSON.stringify(metadata));
  }
}

/**
 * Fetch metadata from localStorage
 */
function fetchFromLocalStorage(hash: string): DealMetadata | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(`ipfs_${hash}`);
  return stored ? JSON.parse(stored) : null;
}

/**
 * Generate local hash for demo purposes (fallback when no Pinata JWT)
 */
function generateLocalHash(metadata: DealMetadata): string {
  const str = JSON.stringify(metadata);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Format as hex with 0x prefix
  const hashHex = Math.abs(hash).toString(16).padStart(64, "0");
  return `0x${hashHex}`;
}

/**
 * Convert IPFS CID to bytes32 for Solidity
 */
export function cidToBytes32(cid: string): `0x${string}` {
  if (cid.startsWith("0x")) {
    return cid as `0x${string}`;
  }

  // For real IPFS CIDs, convert to bytes32
  // Note: This is a simplified conversion for demo purposes
  // Production apps should use proper CID decoding (e.g., multiformats library)
  const encoder = new TextEncoder();
  const data = encoder.encode(cid);

  // Create a simple hash from the CID string
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data[i];
    hash = hash & hash;
  }

  const hashHex = Math.abs(hash).toString(16).padStart(64, "0");
  return `0x${hashHex}` as `0x${string}`;
}
