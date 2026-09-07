export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const STORE_KEY = "brw-companion-v1";

export const RISK_STATEMENTS = [
  "I would not sell if my portfolio dropped 20% in a month",
  "My income is stable and unlikely to be disrupted by a recession",
  "I will not need this specific money for at least 10 years",
  "I have a fully funded emergency fund separate from this money",
  "I have experienced a real market downturn before without selling",
];

export const ACTION_PLAN = [
  "Complete the Net Worth and Cash Flow worksheets. Confirm your emergency fund and high-interest debt status.",
  "Capture the full employer 401(k) match if you aren't already. Complete your account inventory.",
  "Choose Traditional vs. Roth IRA and set up or confirm automatic contributions.",
  "Complete your risk assessment and set a target allocation.",
  "Audit current fund expense ratios; replace any high-cost funds if appropriate.",
  "Review asset location across accounts against your tax strategy.",
  "Mid-year rebalancing check — compare current allocation to target.",
  "Evaluate whether a backdoor Roth or mega backdoor Roth applies to you.",
  "If self-employed, compare SEP-IRA vs. Solo 401(k) before year-end deadlines.",
  "Complete or update your Investment Policy Statement.",
  "Run the advisor-vetting checklist if you're considering professional help.",
  "Beneficiary audit. Recalculate net worth and compare it to month 1.",
];

export const ASSET_FIELDS = [
  ["checking", "Checking / savings"],
  ["emergency", "Emergency fund"],
  ["retirement", "401(k)/403(b)"],
  ["ira", "IRA(s)"],
  ["taxable", "Taxable brokerage"],
  ["hsa", "HSA"],
  ["realestate", "Real estate (market value)"],
  ["business", "Business equity"],
  ["other", "Other assets"],
];

export const LIAB_FIELDS = [
  ["creditcard", "Credit card balances"],
  ["auto", "Auto loans"],
  ["student", "Student loans"],
  ["personal", "Personal loans"],
  ["mortgage", "Mortgage balance"],
  ["otherdebt", "Other debt"],
];

export const ALLOC_LABELS = {
  us: "U.S. stocks",
  intl: "International stocks",
  bonds: "Bonds",
  alt: "Alternatives (REITs, etc.)",
  cash: "Cash / equivalents",
};

export const ALLOC_COLORS = {
  us: "#1B2E52",
  intl: "#2E4576",
  bonds: "#B68A35",
  alt: "#8A6423",
  cash: "#C9BFA0",
};

export const DEFAULT_DATA = {
  networth: { snapshots: [] },
  cashflow: { year: new Date().getFullYear(), months: {} },
  allocation: {
    target: { us: 42, intl: 18, bonds: 15, alt: 10, cash: 15 },
    current: { us: 0, intl: 0, bonds: 0, alt: 0, cash: 0 },
    risk: { answers: [null, null, null, null, null] },
    quarters: {},
  },
  contributions: {
    year: 2026,
    accounts: {
      k401: { label: "401(k) / 403(b)", limit: 24500, months: Array(12).fill(0) },
      ira: { label: "IRA (Trad. + Roth)", limit: 7500, months: Array(12).fill(0) },
      hsa: { label: "HSA", limit: 4400, months: Array(12).fill(0) },
    },
  },
  goals: {
    retirement: {
      targetAge: "",
      incomeNeeded: "",
      yearsLeft: "",
      currentBalance: "",
      currentMonthly: "",
      targetMonthly: "",
    },
    items: [],
  },
  actionPlan: { done: {} },
};

export function deepMerge(base, incoming) {
  if (Array.isArray(base)) return incoming !== undefined ? incoming : base;
  if (typeof base === "object" && base !== null) {
    const out = { ...base };
    if (incoming && typeof incoming === "object") {
      Object.keys(incoming).forEach((k) => {
        out[k] = k in base ? deepMerge(base[k], incoming[k]) : incoming[k];
      });
    }
    return out;
  }
  return incoming !== undefined ? incoming : base;
}
