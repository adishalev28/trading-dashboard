"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

const REAL_KEY = "tcc_portfolio";
const SIM_KEY  = "tcc_simulated_trades";

/* ── localStorage fallback (when not logged in) ── */

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

/* ── Supabase-backed positions (when logged in) ── */

function useSupabasePositions(isSimulated) {
  const { user } = useAuth();
  const [positions, setPositions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const fetchPositions = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from("trading_positions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_simulated", isSimulated)
      .order("created_at", { ascending: false });

    if (data) {
      setPositions(data.map(row => ({
        id:         row.id,
        ticker:     row.ticker,
        entryPrice: Number(row.entry_price),
        shares:     row.shares,
        stopLoss:   row.stop_loss ? Number(row.stop_loss) : null,
        entryDate:  row.entry_date,
        notes:      row.notes || "",
        status:     row.status,
        exitPrice:  row.exit_price ? Number(row.exit_price) : null,
        exitDate:   row.exit_date,
      })));
    }
    setLoaded(true);
  }, [user, isSimulated]);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  const add = useCallback(async (position) => {
    if (!supabase || !user) return null;
    const { data, error } = await supabase
      .from("trading_positions")
      .insert({
        user_id:     user.id,
        ticker:      position.ticker,
        entry_price: position.entryPrice,
        shares:      position.shares,
        stop_loss:   position.stopLoss,
        entry_date:  position.entryDate || new Date().toISOString().slice(0, 10),
        notes:       position.notes || "",
        is_simulated: isSimulated,
      })
      .select()
      .single();

    if (data) {
      await fetchPositions();
      return data;
    }
    if (error) console.error("Add position error:", error);
    return null;
  }, [user, isSimulated, fetchPositions]);

  const remove = useCallback(async (id) => {
    if (!supabase) return;
    await supabase.from("trading_positions").delete().eq("id", id);
    await fetchPositions();
  }, [fetchPositions]);

  const update = useCallback(async (id, updates) => {
    if (!supabase) return;
    const dbUpdates = {};
    if (updates.stopLoss !== undefined) dbUpdates.stop_loss = updates.stopLoss;
    if (updates.notes !== undefined)    dbUpdates.notes = updates.notes;
    if (updates.status !== undefined)   dbUpdates.status = updates.status;
    if (updates.exitPrice !== undefined) dbUpdates.exit_price = updates.exitPrice;
    if (updates.exitDate !== undefined)  dbUpdates.exit_date = updates.exitDate;

    await supabase.from("trading_positions").update(dbUpdates).eq("id", id);
    await fetchPositions();
  }, [fetchPositions]);

  const clearAll = useCallback(async () => {
    if (!supabase || !user) return;
    await supabase
      .from("trading_positions")
      .delete()
      .eq("user_id", user.id)
      .eq("is_simulated", isSimulated);
    setPositions([]);
  }, [user, isSimulated]);

  return { positions, loaded, add, remove, update, clearAll };
}

/* ── Main hook: auto-picks Supabase or localStorage ── */

export default function usePortfolio() {
  const { user } = useAuth();
  const useCloud = !!supabase && !!user;

  const realLocal = useLocalPositions(REAL_KEY);
  const simLocal  = useLocalPositions(SIM_KEY);
  const realCloud = useSupabasePositions(false);
  const simCloud  = useSupabasePositions(true);

  const real = useCloud ? realCloud : realLocal;
  const sim  = useCloud ? simCloud  : simLocal;

  return {
    isCloud:        useCloud,
    positions:      real.positions,
    loaded:         real.loaded && sim.loaded,
    addPosition:    real.add,
    removePosition: real.remove,
    updatePosition: real.update,
    clearAll:       real.clearAll,

    simPositions:      sim.positions,
    addSimulation:     sim.add,
    removeSimulation:  sim.remove,
    clearSimulations:  sim.clearAll,
  };
}
