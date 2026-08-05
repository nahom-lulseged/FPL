import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface SparklineChartProps {
  data: number[];
  color?: 'purple' | 'green';
}

const strokeColors = {
  purple: '#37003c',
  green: '#00ff87',
};

export function SparklineChart({ data, color = 'purple' }: SparklineChartProps) {
  if (data.length === 0) {
    return null;
  }

  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColors[color]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
