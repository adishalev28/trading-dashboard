"use client";

import { useState } from "react";
import { X } from "lucide-react";

/**
 * Click-to-Explain — tap any label/metric to see a Hebrew explanation
 *
 * Usage:
 *   <Explainer id="stage2">Stage 2 Count</Explainer>
 *   <Explainer id="rs" inline>RS Score</Explainer>
 *
 * The explanation pops up as a card overlay. Tap again or X to close.
 */

const EXPLANATIONS = {
  // ── Overview cards ──
  topSector: {
    title: "Top Sector - הסקטור המוביל",
    text: "הסקטור עם ציון החוזק הגבוה ביותר. חוזק נמדד לפי ביצועים של 63 ימים מול ה-S&P 500. סקטור חזק = כסף מוסדי נכנס לשם. עדיף לקנות מניות בסקטורים חזקים.",
  },
  stage2count: {
    title: "Stage 2 Count - כמה מניות עוברות את המבחנים",
    text: "הסקרינר סורק מעל 1,000 מניות מהבורסה האמריקאית ובודק כמה עומדות ב-3 תנאים:\n\n1. מחיר מעל ממוצע 150 יום שמעל ממוצע 200 יום (מגמה עולה)\n2. ציון RS (חוזק יחסי) מעל 70\n3. פחות מ-25% מתחת לשיא השנתי\n\nאם מעט מניות עוברות — השוק חלש. הרבה מניות = שוק בריא.",
  },
  strongestTicker: {
    title: "Strongest Ticker - המניה הכי חזקה",
    text: "המניה עם ציון RS (חוזק יחסי) הגבוה ביותר מכל המניות שעברו את המסננים. RS גבוה אומר שהמניה מכה את ה-S&P 500 ב-3 עד 12 החודשים האחרונים.\n\nהסקרינר סורק 1,000+ מניות — רק הטובות ביותר מגיעות לכאן.",
  },
  sectorLeader: {
    title: "Sector Leader - מוביל הסקטור",
    text: "המניה עם ה-RS הגבוה ביותר בתוך הסקטור המוביל. אם Energy הסקטור הכי חזק, זו המניה הכי חזקה באנרגיה.\n\nמתוך כל המניות שעברו את מסנני Stage 2 — לא רק רשימה קבועה.",
  },
  marketBreadth: {
    title: "Market Breadth - רוחב השוק",
    text: "ממוצע השינוי של כל 11 הסקטורים. חיובי = רוב הסקטורים ירוקים (שוק בריא). שלילי = רוב הסקטורים אדומים (שוק חולה). מספר קטן אבל מאוד משמעותי.",
  },
  spyContext: {
    title: "S&P 500 (SPY) - מצב השוק הכללי",
    text: "ה-SPY הוא תעודת סל שעוקבת אחרי 500 המניות הגדולות בארה\"ב. אם המחיר שלו מעל ממוצע 200 יום = BULLISH (מגמה עולה, בטוח לקנות). מתחת = BEARISH (מגמה יורדת, סכנה).",
  },

  // ── System Health ──
  systemHealth: {
    title: "System Health - בריאות השוק",
    text: "4 בדיקות בינאריות (כן/לא) שבודקות אם השוק מתאים לקניית מניות היום.\n\nכמו בדיקת מזג אוויר לפני טיסה — אם 4/4 ירוק, אפשר להמריא. אם אדום — נשארים על הקרקע.\n\n4/4 = קנה\n2-3 = רק טריידים סלקטיביים\n0-1 = אל תקנה כלום",
  },
  spyTrend: {
    title: "SPY Trend - מגמת המדד",
    text: "בודק אם ה-S&P 500 מעל ממוצע 200 יום. זה המבחן הכי בסיסי. אם המדד הגדול ביותר בעולם יורד — 80% מהמניות ירדו איתו. לא קונים בשוק יורד.",
  },
  leadSector: {
    title: "Lead Sector - הסקטור המוביל",
    text: "בודק אם הסקטור הכי חזק חיובי היום. אם אפילו הסקטור המוביל אדום — יום חלש. אם הוא ירוק — יש סיכוי למצוא הזדמנויות.",
  },
  vcpTightCheck: {
    title: "VCP Tight - דפוסי התכווצות",
    text: "בודק אם יש מניות עם VCP Tight (דפוס מחיר צפוף). VCP Tight אומר שהמוכרים נגמרו — כל קנייה קטנה תזיז את המחיר למעלה. בלי VCP Tight = אין הזדמנויות איכותיות.",
  },
  breadthCheck: {
    title: "Breadth - רוחב שוק",
    text: "בודק אם לפחות 5 מניות עומדות בכל תנאי Stage 2. אם פחות מ-5 — השוק צר מדי, אין מספיק בחירה, ואתה עלול להיתפס במניות גרועות.\n\nהסקרינר סורק מעל 1,000 מניות, אז אם פחות מ-5 עוברות — זה באמת שוק בעייתי.",
  },

  // ── Potential Breakouts ──
  breakouts: {
    title: "Potential Breakouts - מניות על סף פריצה",
    text: "הקטע הכי חשוב בדאשבורד! מציג מניות שעומדות בכל 3 התנאים בו-זמנית:\n\n1. Stage 2 (מגמה עולה מאושרת)\n2. RS מעל 80 (מהמניות החזקות ב-20% העליונים)\n3. פחות מ-2% מתחת ל-Pivot (נקודת הקנייה)\n\nאלו המניות שהכי קרובות לסיגנל קנייה. מוצגות 3 הקרובות ביותר לפריצה.\n\nמה עושים?\n• אם כתוב BREAKOUT — המניה כבר פרצה! בדוק שהווליום מעל 120% ותכנס.\n• אם כתוב IMMINENT — שים פקודת limit ב-Pivot ב-Meitav Trade.\n• תמיד צלב-בדוק עם Vol% בטבלת ה-Watchlist למטה.",
  },
  breakoutStatus: {
    title: "Breakout / Imminent - סטטוס פריצה",
    text: "BREAKOUT (ירוק זוהר) = המחיר כבר שבר את ה-Pivot (שיא 20 יום). אם הווליום גבוה מ-120% — זה סיגנל קנייה חזק. לך למחשבון הסיכון ותחשב כמות מניות.\n\nIMMINENT (גבול ירוק) = פחות מ-0.5% מה-Pivot. המניה \"מרחרחת\" את ההתנגדות. שים פקודת limit במחיר ה-Pivot.\n\nAT PIVOT = המניה בדיוק על נקודת הפריצה. רגע המכירה/קנייה.\n\nX.X% = עוד כמה אחוזים חסר לפריצה.",
  },

  // ── Volume Surge ──
  volumeSurge: {
    title: "Volume Surge - זינוק בנפח מסחר",
    text: "מזהה ימים עם נפח מסחר חריג — סימן שכסף מוסדי (קרנות גדולות) נכנס למניה.\n\nSURGE (ירוק זוהר) = נפח מעל 150% מהממוצע + יום ירוק (מחיר עלה). זה הסיגנל הכי חזק — מישהו גדול קונה.\n\nRISING (ירוק) = נפח מעל 120% + יום ירוק. מעניין אבל פחות דרמטי.\n\nללא תג = נפח רגיל.\n\nשילוב מנצח: Volume Surge + קרבה ל-Pivot = פריצה אמיתית (לא פריצת שווא).",
  },

  // ── Sector ──
  sectorStrength: {
    title: "Strength Score - ציון חוזק סקטור",
    text: "ציון 1-99 שמודד כמה הסקטור חזק ביחס ל-S&P 500 ב-63 ימים האחרונים (רבעון).\n\n80+ = סקטור מוביל, כסף מוסדי זורם לשם\n50-79 = ממוצע, לא בולט\nמתחת ל-50 = סקטור חלש, כסף יוצא משם\n\nהכלל: קנה מניות חזקות בסקטורים חזקים. מניה חזקה בסקטור חלש = סיכון.\n\n11 הסקטורים מבוססים על SPDR ETFs — אותם סקטורים שמוסדות משתמשים בהם.",
  },
  sectorHeatmap: {
    title: "Sector Rotation - רוטציית סקטורים",
    text: "מפת החום של 11 הסקטורים של הבורסה האמריקאית.\n\nרוטציה = תנועת כסף בין סקטורים. כשכסף יוצא מטכנולוגיה ונכנס לאנרגיה — רואים את זה כאן.\n\nמה מחפשים?\n• סקטורים עם Strength גבוה + ירוק = מובילים\n• סקטורים עם Strength נמוך + אדום = חלשים, לא קונים שם\n• 2-3 סקטורים מובילים = שוק בריא עם רוטציה\n• סקטור אחד בלבד מוביל = שוק צר, סיכון גבוה",
  },

  // ── Watchlist columns ──
  rs: {
    title: "RS Score - ציון חוזק יחסי",
    text: "מדד 1-99 שמשווה את ביצועי המניה מול ה-S&P 500 על פני 3 עד 12 חודשים.\n\n90+ = מניה בין 10% הטובות בשוק (מעולה)\n80-89 = חזקה\n70-79 = בסדר (מינימום ל-Stage 2)\nמתחת ל-70 = חלשה, לא קונים",
  },
  vcp: {
    title: "VCP - דפוס התכווצות תנודתיות",
    text: "Volatility Contraction Pattern. כשמניה עושה בסיס — הטווח היומי שלה מצטמצם ונפח המסחר יורד. זה אומר שהמוכרים נגמרים.\n\nTight = טווח צר מאוד + נפח נמוך (הכי טוב)\nLoose = בסיס רחב יותר (בסדר)\nNone = אין דפוס (לא אידיאלי)",
  },
  stage2: {
    title: "Stage 2 - שלב 2 של וינשטיין",
    text: "סטן וינשטיין חילק את חיי המניה ל-4 שלבים:\n\nStage 1: בסיס (משעמם)\nStage 2: עלייה (כאן קונים!)\nStage 3: שיא (מסוכן)\nStage 4: ירידה (לא נוגעים)\n\nStage 2 = מחיר מעל ממוצעי 150 ו-200 יום העולים. זה השלב היחיד שבו כדאי לקנות.",
  },
  pivot: {
    title: "Pivot - נקודת הפריצה/קנייה",
    text: "השיא של 20 ימי המסחר האחרונים. זו \"נקודת ההתנגדות\" — המחיר שהמניה לא הצליחה לעבור.\n\nכשהמניה שוברת את ה-Pivot בנפח גבוה (Vol% מעל 120%) — זה סיגנל קנייה.\n\nDistance: כמה אחוזים חסר לפריצה. 0% = בדיוק ב-Pivot.",
  },
  trend: {
    title: "Trend - מגמה",
    text: "Stage 2 (ירוק): מחיר > SMA150 > SMA200 (הכל עולה, מושלם)\nWarning (כתום): מחיר מעל SMA200 אבל לא מלא Stage 2\nAvoid (אדום): מחיר מתחת ל-SMA200 (מגמה יורדת, לא לקנות)",
  },
  volume: {
    title: "Vol % - נפח מסחר",
    text: "נפח המסחר של היום ביחס לממוצע 50 יום.\n\n120%+ (ירוק) = נפח גבוה מהרגיל. אם זה קורה ליד ה-Pivot — פריצה!\n80-120% = נפח רגיל\nמתחת ל-80% (כתום) = נפח נמוך. ב-VCP זה דווקא טוב (התכווצות)",
  },
  dist52w: {
    title: "Dist 52W - מרחק מהשיא השנתי",
    text: "כמה אחוזים המניה מתחת לשיא של 52 השבועות האחרונים.\n\n0-5% (ירוק) = קרוב לשיא (מעולה, מניה חזקה)\n5-15% (כתום) = ריחוק סביר\n15%+ (אדום) = רחוק מהשיא (חולשה)",
  },
  sparkline: {
    title: "30D - גרף 30 יום",
    text: "גרף מיני שמראה את מגמת המחיר ב-30 הימים האחרונים.\n\nירוק = מגמה עולה (המחיר היום גבוה מלפני 30 יום)\nאדום = מגמה יורדת\n\nמחפשים: קו שעולה בהדרגה עם התכווצות (בסיס צר) — זה VCP מושלם.",
  },
  fundamentals: {
    title: "Growth - צמיחת רווח ומכירות (YoY)",
    text: "ה-C ב-CANSLIM של ויליאם אוניל ומינרוויני: לא קונים מניה רק כי הגרף יפה — צריך גם רווחים אמיתיים מתחת למכסה.\n\nEPS = רווח למניה. Rev = הכנסות.\n\nההשוואה: הרבעון האחרון מול אותו רבעון בשנה שעברה (Year-over-Year).\n\nצבעים:\n• ירוק (25%+) = איכות מינרוויני\n• כתום (10-25%) = סביר, לעקוב\n• אפור (0-10%) = חולשה, לדלג\n• אדום (שלילי) = דגל אדום, לא נכנסים\n\nכלל אצבע: גם EPS וגם Rev בירוק = מנוע אמיתי לפריצה. EPS גבוה אבל Rev נמוך = יתכן רווחים מסיבות חד-פעמיות (Buybacks, חיסכון בעלויות).",
  },

  // ── Risk Calculator ──
  commission: {
    title: "Commission Check - בדיקת עמלה",
    text: "מיטב טרייד גובה $7 לכל פעולה. קנייה + מכירה = $14.\n\nSAFE (ירוק): עמלה פחות מ-0.5% מהפוזיציה\nCAUTION (כתום): 0.5-1%\nDANGER (אדום): מעל 1%. הפוזיציה קטנה מדי — העמלה תאכל את הרווח!\n\nפתרון: הגדל את הפוזיציה או דלג על הטרייד.",
  },
  riskPct: {
    title: "Risk % - אחוז סיכון לטרייד",
    text: "כמה אחוז מסך ההון שלך אתה מוכן להפסיד בטרייד אחד.\n\n1% = מומלץ (אחרי 10 הפסדים רצופים עדיין יש לך 90%)\n0.5% = שמרני מאוד\n2% = אגרסיבי (לא מומלץ למתחילים)\n\nהנוסחה: (הון x אחוז סיכון) / (מחיר כניסה - סטופ) = כמות מניות",
  },
  trailingStop: {
    title: "Trailing Stop - סטופ נגרר",
    text: "ממוצע נע של 20 יום (SMA 20). מניה בריאה נשארת מעליו.\n\nכל עוד המחיר מעל SMA 20 — מחזיקים.\nאם נסגר מתחתיו — שוקלים למכור.\n\nהסטופ \"נגרר\" כי הממוצע עולה עם המניה, כך שהסטופ שלך עולה אוטומטית.",
  },

  // ── Portfolio ──
  pnl: {
    title: "P&L - רווח והפסד",
    text: "Profit & Loss. ההפרש בין מחיר הכניסה למחיר הנוכחי, כפול כמות המניות.\n\nירוק = מרוויח\nאדום = מפסיד\n\nהאחוז מראה כמה הרווחת/הפסדת ביחס למחיר הכניסה.",
  },
  rMultiple: {
    title: "R-Multiple - יחס רווח/סיכון",
    text: "כמה פעמים הרווח (או ההפסד) ביחס לסיכון המקורי.\n\nR = (מחיר כניסה - סטופ). אם סיכנת $5 למניה:\n1R = הרווחת $5 (יחס 1:1)\n3R = הרווחת $15 (יחס 3:1)\n-1R = הפסדת את מה שתכננת\n\n3R+ = TARGET HIT! הגעת ליעד.",
  },
  winRate: {
    title: "Win Rate - אחוז הצלחה",
    text: "כמה אחוז מהטריידים שלך רווחיים.\n\n50%+ = טוב (מרוויח יותר מפעמים ממפסיד)\n40% = עדיין יכול להיות רווחי אם ה-Avg Win גדול מה-Avg Loss\n\nWin Rate לבד לא מספיק — צריך גם Avg R חיובי.",
  },
  expectancy: {
    title: "Expectancy - תוחלת רווח",
    text: "המספר הכי חשוב! כמה R (יחידות סיכון) אתה צפוי להרוויח בכל טרייד בממוצע.\n\nחיובי = מערכת רווחית\nמעל 0.5R = מערכת חזקה מאוד\nשלילי = מערכת מפסידה, צריך לשנות\n\nנוסחה: (Win% x AvgWinR) + (Loss% x AvgLossR)",
  },
  profitFactor: {
    title: "Profit Factor - יחס רווחיות",
    text: "סה\"כ רווחים חלקי סה\"כ הפסדים.\n\n1.0 = איזון (לא מרוויח, לא מפסיד)\n1.5+ = edge חזק\n2.0+ = מעולה\nמתחת ל-1.0 = מפסיד כסף",
  },
  equityCurve: {
    title: "Equity Curve - קו העושר",
    text: "גרף שמראה את שווי הפורטפוליו שלך לאורך 30 יום.\n\nקו עולה = האסטרטגיה עובדת, ממשיכים\nקו יורד = משהו לא עובד, צריך לבדוק\nקו שטוח = אין תנועה\n\nהמטרה: קו שעולה בהדרגה עם ירידות קטנות (drawdowns מוגבלים).",
  },
  sectorExposure: {
    title: "Sector Exposure - חשיפה סקטוריאלית",
    text: "כמה אחוז מהפורטפוליו שלך בכל סקטור.\n\nאם סקטור אחד מעל 30% — יש ריכוז סיכון. אם הסקטור הזה נפגע, כל הפורטפוליו סובל.\n\nפתרון: פזר בין 3-4 סקטורים לפחות.",
  },
};

export default function Explainer({ id, children, inline = false, className = "" }) {
  const [open, setOpen] = useState(false);
  const explanation = EXPLANATIONS[id];

  if (!explanation) return <span className={className}>{children}</span>;

  return (
    <>
      <span
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`cursor-help border-b border-dotted border-slate-600 hover:border-emerald-500 transition-colors ${className}`}
      >
        {children}
      </span>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Card */}
          <div
            className="relative bg-slate-800 border border-slate-600 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-0 sm:mx-4 p-5 shadow-2xl z-10 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 left-3 w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title */}
            <h3 className="text-base font-bold text-emerald-400 mb-3 pr-0 pl-8">
              {explanation.title}
            </h3>

            {/* Body */}
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {explanation.text}
            </div>

            {/* Dismiss hint */}
            <div className="mt-4 pt-3 border-t border-slate-700 text-center">
              <span className="text-[10px] text-slate-500">לחץ בכל מקום לסגירה</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
