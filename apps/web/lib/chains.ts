import { mainnet, sepolia } from "wagmi/chains";

// MNEE Token addresses - configurable via environment variables
// Defaults: Official MNEE on mainnet, MockMNEE on Sepolia (for testing)
export const MNEE_ADDRESSES = {
  [mainnet.id]: (process.env.NEXT_PUBLIC_MAINNET_MNEE_ADDRESS || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF") as `0x${string}`,
  [sepolia.id]: (process.env.NEXT_PUBLIC_SEPOLIA_MNEE_ADDRESS || "0x4a79b8E7479da267930f3B14f6292c274e7B01b0") as `0x${string}`,
} as const;

// Factory addresses (to be updated after deployment)
export const FACTORY_ADDRESSES = {
  [mainnet.id]: process.env.NEXT_PUBLIC_MAINNET_FACTORY_ADDRESS as `0x${string}` | undefined,
  [sepolia.id]: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS as `0x${string}` | undefined,
} as const;

export const SUPPORTED_CHAINS = [mainnet, sepolia] as const;

export function getMneeAddress(chainId: number): `0x${string}` | undefined {
  return MNEE_ADDRESSES[chainId as keyof typeof MNEE_ADDRESSES];
}

export function getFactoryAddress(chainId: number): `0x${string}` | undefined {
  return FACTORY_ADDRESSES[chainId as keyof typeof FACTORY_ADDRESSES];
}
