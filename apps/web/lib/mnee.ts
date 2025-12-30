import { formatUnits, parseUnits } from "viem";

export const MNEE_DECIMALS = 18;

export function formatMnee(amount: bigint): string {
  return formatUnits(amount, MNEE_DECIMALS);
}

export function parseMnee(amount: string): bigint {
  return parseUnits(amount, MNEE_DECIMALS);
}

export function formatMneeDisplay(amount: bigint, decimals = 2): string {
  const formatted = formatMnee(amount);
  const num = parseFloat(formatted);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function bpsToPercent(bps: number): number {
  return bps / 100;
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
