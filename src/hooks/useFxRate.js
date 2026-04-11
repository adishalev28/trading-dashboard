"use client";

import mockData from "@/lib/mockData.json";

/**
 * Returns the current USD → ILS exchange rate
 *
 * MVP: returns static rate from mockData
 * Future: swap to live fetch from Bank of Israel or exchangerate.host
 */
export default function useFxRate() {
  return {
    fxRate: mockData.fxRate,
    loading: false,
    error: null,
  };
}
