import { format, isWithinInterval, parseISO } from "date-fns";

export const QUARTERS = [
  {
    id: "Q1",
    label: "Q1 — Goal Setting",
    opens: "May 1",
    action: "Goal Creation, Submission & Approval",
  },
  {
    id: "Q2",
    label: "Q2 Check-in",
    opens: "July",
    action: "Progress Update — Planned vs. Actual",
  },
  {
    id: "Q3",
    label: "Q3 Check-in",
    opens: "October",
    action: "Progress Update — Planned vs. Actual",
  },
  {
    id: "Q4",
    label: "Q4 / Annual",
    opens: "March / April",
    action: "Final Achievement Capture",
  },
];

export const THRUST_AREAS = [
  "Revenue Growth",
  "Customer Experience",
  "Operational Efficiency",
  "People & Culture",
  "Technology & Innovation",
  "Risk & Compliance",
  "Sustainability",
  "Strategic Partnerships",
];

export const UOM_TYPES = [
  { value: "min_numeric", label: "Min — Numeric (Higher is Better)" },
  { value: "max_numeric", label: "Max — Numeric (Lower is Better)" },
  { value: "min_percent", label: "Min — % (Higher is Better)" },
  { value: "max_percent", label: "Max — % (Lower is Better)" },
  { value: "timeline", label: "Timeline (Date-based)" },
  { value: "zero", label: "Zero-based (0 = Success)" },
];

export const STATUS_OPTIONS = [
  "Not Started",
  "On Track",
  "At Risk",
  "Completed",
];

export function computeScore(uom, target, achievement) {
  if (!target || !achievement) return 0;

  const t = parseFloat(target);
  const a = parseFloat(achievement);

  if (isNaN(t) || isNaN(a) || t === 0) return 0;

  switch (uom) {
    case "min_numeric":
    case "min_percent":
      return Math.min((a / t) * 100, 150);

    case "max_numeric":
    case "max_percent":
      return Math.min((t / a) * 100, 150);

    case "zero":
      return a === 0 ? 100 : 0;

    case "timeline":
      return a <= t ? 100 : Math.max(0, 100 - (a - t) * 10);

    default:
      return 0;
  }
}

export function getScoreColor(score) {
  if (score >= 100) return "text-emerald-400";
  if (score >= 75) return "text-brand-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

export function getScoreBg(score) {
  if (score >= 100)
    return "bg-emerald-400/10 border-emerald-400/20";

  if (score >= 75)
    return "bg-brand-400/10 border-brand-400/20";

  if (score >= 50)
    return "bg-yellow-400/10 border-yellow-400/20";

  return "bg-red-400/10 border-red-400/20";
}

export function getStatusColor(status) {
  const map = {
    "Not Started":
      "bg-slate-700/50 text-slate-400 border-slate-600/30",

    "On Track":
      "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",

    "At Risk":
      "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",

    Completed:
      "bg-brand-500/10 text-brand-400 border-brand-500/20",

    Pending:
      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",

    Approved:
      "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",

    Rejected:
      "bg-red-400/10 text-red-400 border-red-400/20",

    Draft:
      "bg-slate-700/50 text-slate-400 border-slate-600/30",

    Locked:
      "bg-purple-400/10 text-purple-400 border-purple-400/20",
  };

  return (
    map[status] ||
    "bg-slate-700/50 text-slate-400 border-slate-600/30"
  );
}

export function exportToCSV(data, filename) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);

  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function getCurrentQuarter() {
  const month = new Date().getMonth() + 1;

  if (month >= 5 && month <= 6) return "Q1";
  if (month >= 7 && month <= 9) return "Q2";
  if (month >= 10 && month <= 12) return "Q3";

  return "Q4";
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";

  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

export function isDateWithinRange(date, start, end) {
  try {
    return isWithinInterval(parseISO(date), {
      start: parseISO(start),
      end: parseISO(end),
    });
  } catch {
    return false;
  }
}