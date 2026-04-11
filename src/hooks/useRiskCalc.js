"use client";

import { useReducer, useMemo } from "react";
import { calcRisk } from "@/lib/screener";
import {
  DEFAULT_FX_RATE,
  DEFAULT_COMMISSION_RT_USD,
  DEFAULT_RISK_PCT,
} from "@/lib/constants";

const initialState = {
  equityIls: 50000,
  riskPct: DEFAULT_RISK_PCT,
  entryUsd: 100,
  stopUsd: 95,
  fxRate: DEFAULT_FX_RATE,
  commissionRoundTripUsd: DEFAULT_COMMISSION_RT_USD,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export default function useRiskCalc(overrides = {}) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, ...overrides });

  const result = useMemo(() => calcRisk(state), [state]);

  const setField = (field, value) => {
    dispatch({ type: "SET_FIELD", field, value });
  };

  const reset = () => dispatch({ type: "RESET" });

  return { state, result, setField, reset };
}
