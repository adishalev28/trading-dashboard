"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "tcc_portfolio";

/**
 * Portfolio state — persisted to localStorage
 *
 * Each position:
 * {
 *   id:           string (unique, timestamp-based)
 *   ticker:       string
 *   entryPrice:   number (USD)
 *   shares:       number
 *   stopLoss:     number (USD)
 *   entryDate:    string (ISO date)
 *   notes:        string (optional)
 * }
 */
export default function usePortfolio() {
  const [positions, setPositions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setPositions(JSON.parse(raw));
      }
    } catch {}
    setLoaded(true);
  }, []);

  // Persist to localStorage on every change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch {}
  }, [positions, loaded]);

  const addPosition = useCallback((position) => {
    const newPos = {
      ...position,
      id: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      entryDate: new Date().toISOString().slice(0, 10),
    };
    setPositions((prev) => [...prev, newPos]);
    return newPos;
  }, []);

  const removePosition = useCallback((id) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePosition = useCallback((id, updates) => {
    setPositions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const clearAll = useCallback(() => {
    setPositions([]);
  }, []);

  return { positions, loaded, addPosition, removePosition, updatePosition, clearAll };
}
