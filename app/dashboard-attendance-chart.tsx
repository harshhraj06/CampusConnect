"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

export type DashboardAttendanceChartItem = {
  subject: string;
  attendance: number;
  attended: number;
  total: number;
};

export function DashboardAttendanceChart({
  data,
}: {
  data: DashboardAttendanceChartItem[];
}) {
  const subjectColors = [
    "#3159d9",
    "#7657c8",
    "#258b87",
    "#c58a32",
    "#b95d72",
    "#5367b8",
    "#3d8b67",
    "#9b6d4f",
    "#547c9a",
    "#95688c",
  ];

  return (
    <div className="dashboardAttendanceChart">
      <ResponsiveContainer
        width="100%"
        height={290}
      >
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 15,
            bottom: 45,
            left: -12,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#edf0f5"
          />

          <XAxis
            dataKey="subject"
            interval={0}
            angle={-14}
            textAnchor="end"
            height={65}
            tick={{
              fontSize: 9,
              fill: "#7c8798",
            }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            domain={[0, 100]}
            tickFormatter={value =>
              `${value}%`
            }
            tick={{
              fontSize: 9,
              fill: "#8b95a5",
            }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            cursor={{
              fill:
                "rgba(49,89,217,.035)",
            }}
            formatter={value => [
              `${String(value)}%`,
              "Attendance",
            ]}
          />

          <ReferenceLine
            y={85}
            stroke="#d9a441"
            strokeDasharray="5 5"
            label={{
              value: "85% minimum",
              position:
                "insideTopRight",
              fill: "#9a731e",
              fontSize: 9,
            }}
          />

          <Bar
            dataKey="attendance"
            name="Attendance"
            radius={[7, 7, 2, 2]}
            maxBarSize={44}
            minPointSize={6}
          >
            {data.map(
              (entry, index) => (
                <Cell
                  key={
                    `attendance-bar-${entry.subject}`
                  }
                  fill={
                    subjectColors[
                      index %
                        subjectColors.length
                    ]
                  }
                />
              )
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
