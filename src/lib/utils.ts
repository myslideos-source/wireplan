import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatArea(squareMeters: number) {
  return `${formatNumber(squareMeters, 2)} m²`;
}

export function formatLength(meters: number) {
  return `${formatNumber(meters, 1)} m`;
}
