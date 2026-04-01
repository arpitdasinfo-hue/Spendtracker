"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFinance } from "@/components/finance/FinanceProvider";
import { MetricCard, MotionPanel, PageHeader, SegmentedControl } from "@/components/finance/Primitives";
import { buildFinanceSnapshot, formatCurrency } from "@/lib/finance";

type AnalysisMode = "spend" | "cashflow";

function formatTooltipValue(value: unknown) {
  if (Array.isArray(value)) {
    return formatCurrency(Number(value[0] ?? 0));
  }

  return formatCurrency(Number(value ?? 0));
}

export default function AnalysisPage() {
  const { state } = useFinance();
  const snapshot = buildFinanceSnapshot(state);
  const [mode, setMode] = useState<AnalysisMode>("spend");

  const totalSpendOrCash = mode === "spend" ? snapshot.monthSummary.expense : snapshot.monthSummary.cashOutflow;

  return (
    <main className="page">
      <PageHeader
        eyebrow="Readable analytics"
        title="Behavior, liquidity, and liability in one story."
        subtitle="This view separates how you spend from when cash actually moves. That gives users better decisions on category control, liquidity planning, and card repayment timing."
      />

      <div className="split-grid">
        <MotionPanel className="section-pad stack-md" delay={0.05}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Analysis lens</h2>
              <p className="panel-subtitle">Use spend view for habits and cash flow view for bank pressure.</p>
            </div>
          </div>
          <SegmentedControl
            value={mode}
            onChange={(value) => setMode(value as AnalysisMode)}
            items={[
              { value: "spend", label: "Spend view" },
              { value: "cashflow", label: "Cash flow view" },
            ]}
          />
          <div className="flow-note">
            Spend view counts expenses on the purchase date. Cash flow view adds bank-backed spend and card repayments so you can see cash leaving the system.
          </div>
        </MotionPanel>

        <div className="metric-grid">
          <MetricCard
            label={mode === "spend" ? "Tracked spend" : "Cash outflow"}
            value={formatCurrency(totalSpendOrCash)}
            hint={mode === "spend" ? "Behavioral spend this month." : "Liquidity outflow this month."}
            tone="accent"
          />
          <MetricCard
            label="Income"
            value={formatCurrency(snapshot.monthSummary.income)}
            hint="Supports savings-rate and runway calculation."
            tone="good"
          />
          <MetricCard
            label="Card outstanding"
            value={formatCurrency(snapshot.liabilitiesTotal)}
            hint="Future cash pressure on cards."
            tone="danger"
          />
          <MetricCard
            label="Utilization"
            value={`${snapshot.utilization}%`}
            hint="Across all tracked cards."
          />
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="split-grid">
        <MotionPanel className="section-pad-lg stack-md" delay={0.1}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Six-month rhythm</h2>
              <p className="panel-subtitle">Spend and cash flow are similar, but not identical. That delta matters when cards are involved.</p>
            </div>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={snapshot.monthSeries}>
                <defs>
                  <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0f9d8a" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#0f9d8a" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="spendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#d66843" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#d66843" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="cashFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2954d1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2954d1" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(23,33,43,0.08)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(value) => formatTooltipValue(value)} />
                <Area type="monotone" dataKey="income" stroke="#0f9d8a" strokeWidth={2.6} fill="url(#incomeFill)" />
                <Area
                  type="monotone"
                  dataKey={mode === "spend" ? "spend" : "cashOut"}
                  stroke={mode === "spend" ? "#d66843" : "#2954d1"}
                  strokeWidth={2.6}
                  fill={mode === "spend" ? "url(#spendFill)" : "url(#cashFill)"}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </MotionPanel>

        <MotionPanel className="section-pad-lg stack-md" delay={0.15}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Payment rail share</h2>
              <p className="panel-subtitle">UPI tells you how people pay. Funding source tells you what balance actually changed.</p>
            </div>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={snapshot.spendingByRail}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={68}
                  outerRadius={106}
                  paddingAngle={4}
                >
                  {snapshot.spendingByRail.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatTooltipValue(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </MotionPanel>
      </div>

      <div style={{ height: 16 }} />

      <div className="split-grid">
        <MotionPanel className="section-pad-lg stack-md" delay={0.2}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Category concentration</h2>
              <p className="panel-subtitle">A category-heavy month shows up faster than a top-line total.</p>
            </div>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={snapshot.spendingByCategory.slice(0, 6)}>
                <CartesianGrid vertical={false} stroke="rgba(23,33,43,0.08)" />
                <XAxis dataKey="category" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(value) => formatTooltipValue(value)} />
                <Bar dataKey="value" radius={[14, 14, 6, 6]} fill="#0f9d8a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MotionPanel>

        <MotionPanel className="section-pad-lg stack-md" delay={0.25}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">What this means</h2>
              <p className="panel-subtitle">Turn the charts into product guidance for the user.</p>
            </div>
          </div>
          <div className="flow-note">
            UPI can sit on top of bank or card funding. That is why rail share is helpful for experience design, but balances should still be computed using the underlying source account.
          </div>
          <div className="flow-note">
            If card-funded spend rises while cash outflow stays flat, the user is deferring cash pressure into a future repayment window. The app should nudge before statement date, not after due date.
          </div>
          <div className="flow-note">
            When repayments spike, cash flow view catches the pain without corrupting spend view. That separation is what makes the product feel trustworthy.
          </div>
        </MotionPanel>
      </div>
    </main>
  );
}
