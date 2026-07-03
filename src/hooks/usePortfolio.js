"use client";

import { useState, useEffect, useCallback } from "react";

const REAL_KEY = "tcc_portfolio";
const SIM_KEY  = "tcc_simulated_trades";

/* ── localStorage-backed positions (single-user mode) ── */

function useLocalPositions(storageKey) {
  const [positions, setPositions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setPositions(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(positions));
    } catch {}
  }, [positions, loaded, storageKey]);

  const add = useCallback((position) => {
    const newPos = {
      ...position,
      id: `${storageKey}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      entryDate: position.entryDate || new Date().toISOString().slice(0, 10),
    };
    setPositions((prev) => [...prev, newPos]);
    return newPos;
  }, [storageKey]);

  const remove = useCallback((id) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const update = useCallback((id, updates) => {
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const clearAll = useCallback(() => setPositions([]), []);

  return { positions, loaded, add, remove, update, clearAll };
}

/* ── Main hook ── */

export default function usePortfolio() {
  const real = useLocalPositions(REAL_KEY);
  const sim  = useLocalPositions(SIM_KEY);

  return {
    isCloud:        false,
    positions:      real.positions,
    loaded:         real.loaded && sim.loaded,
    addPosition:    real.add,
    removePosition: real.remove,
    updatePosition: real.update,
    clearAll:       real.clearAll,

    simPositions:      sim.positions,
    addSimulation:     sim.add,
    removeSimulation:  sim.remove,
    updateSimulation:  sim.update,
    clearSimulations:  sim.clearAll,
  };
}
