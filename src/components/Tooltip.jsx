"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

/**
 * Hebrew tooltip — hover/tap to show explanation
 * Used inline next to column headers and badges
 */

const TOOLTIPS = {
  rs: {
    title: "RS Score - ציון חוזק יחסי",
    text: "מדד שמשווה את ביצועי המניה מול S&P 500 על פני 3-12 חודשים. ציון 90+ = מניה מובילה בשוק. מנירביני דורש לפחות 70.",
  },
  vcp: {
    title: "VCP - דפוס התכווצות תנודתיות",
    text: "Volatility Contraction Pattern. מניה שהטווח שלה מצטמצם (בסיס צר) עם נפח יורד - סימן שהמוכרים נגמרים ופריצה קרובה.",
  },
  stage2: {
    title: "Stage 2 - שלב 2 של וינשטיין",
    text: "מניה מעל ממוצע 150 ו-200 יום עולים, עם RS גבוה וקרבה לשיא שנתי. זה השלב הרווחי ביותר - כאן קונים.",
  },
  pivot: {
    title: "Pivot - נקודת פריצה",
    text: "השיא האחרון ב-20 ימים. כשמניה שוברת את ה-Pivot בנפח גבוה - זה סיגנל הקנייה. שים פקודת limit ב-Pivot.",
  },
  trailStop: {
    title: "Trail Stop - סטופ נגרר",
    text: "ממוצע 20 יום (SMA 20). מניה בריאה נשארת מעליו. אם נסגרת מתחתיו - שקול למכור.",
  },
  commission: {
    title: "עמלה - בדיקת מיטב טרייד",
    text: "עמלת הלוך-חזור $14 ($7 קנייה + $7 מכירה). אם העמלה עולה על 1% מהפוזיציה - הפוזיציה קטנה מדי.",
  },
};

export default function Tooltip({ id, inline = false }) {
  const [show, setShow] = useState(false);
  const tip = TOOLTIPS[id];

  if (!tip) return null;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      <HelpCircle className={`${inline ? "w-3 h-3" : "w-3.5 h-3.5"} text-slate-500 hover:text-slate-300 cursor-help transition-colors`} />

      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-right" dir="rtl">
          <div className="text-xs font-bold text-emerald-400 mb-1">{tip.title}</div>
          <div className="text-[11px] text-slate-300 leading-relaxed">{tip.text}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45 -mt-1" />
        </div>
      )}
    </span>
  );
}
