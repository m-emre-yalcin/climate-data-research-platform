"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { backend } from "@/lib/fetch";

interface TimeSeriesChartProps {
  title?: string;
  type?: string;
}

type ChartType = "line" | "area" | "scatter";

export function TimeSeriesChart({
  title = "Time Series Analysis",
  type,
}: TimeSeriesChartProps) {
  const [chartType, setChartType] = useState<ChartType>("line");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [dateColumn, setDateColumn] = useState<string>("");
  const [showBrush, setShowBrush] = useState(true);
  const [filters, setFilters] = useState({
    model: "",
    scenario: "",
    region: "",
  });
  const [pendingFilters, setPendingFilters] = useState(filters);
  const [filterOptions, setFilterOptions] = useState({
    models: [],
    scenarios: [],
    regions: [],
  });
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load saved filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem("timeSeriesFilters");
    if (savedFilters) {
      const parsedFilters = JSON.parse(savedFilters);
      setFilters(parsedFilters);
      setPendingFilters(parsedFilters);
    }
  }, []);

  // Save filters to localStorage when they are applied
  useEffect(() => {
    localStorage.setItem("timeSeriesFilters", JSON.stringify(filters));
  }, [filters]);

  // Fetch data based on applied filters and selected columns
  useEffect(() => {
    if (type !== "csv") return;

    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams();

      // Append all defined filters to the request:
      for (const filterKey of Object.keys(filters)) {
        const filterValue = filters[filterKey as keyof typeof filters] as any;
        if (filterValue) {
          params.append(filterKey, filterValue);
        }
      }

      selectedColumns.forEach((col) => params.append("columns", col));
      const endpoint = `/data/visualization/timeseries?${params.toString()}`;
      const response = await backend(endpoint);

      if (response?.ok) {
        const resData = response.data;
        const reconstructedData = resData.x_axis.map((x: string, i: number) => {
          const row: any = { [resData.x_label]: x };
          resData.y_labels.forEach((col: string) => {
            row[col] = resData.y_axes[col][i];
          });
          return row;
        });

        setChartData(reconstructedData);
        setAvailableColumns(resData.available_columns);
        setFilterOptions(resData.filter_options);
        if (!dateColumn) setDateColumn(resData.x_label);
        if (selectedColumns.length === 0) {
          setSelectedColumns(resData.y_labels);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [type, filters, selectedColumns, dateColumn]);

  // Process data for charting
  const { dateColumns, numericColumns, processedData } = useMemo(() => {
    if (chartData.length === 0) {
      return { dateColumns: [], numericColumns: [], processedData: [] };
    }

    const sampleRow = chartData[0];
    const allColumns = Object.keys(sampleRow);

    const dateColumns = allColumns.filter((col) => {
      const value = sampleRow[col];
      if (!value) return false;
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/,
        /^\d{2}\/\d{2}\/\d{4}$/,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      ];
      return (
        datePatterns.some((pattern) => pattern.test(String(value))) ||
        col.toLowerCase().includes("date") ||
        col.toLowerCase().includes("time")
      );
    });

    const numericColumns = availableColumns;
    const processedData = chartData.map((row, index) => {
      const processed: any = { index };
      dateColumns.forEach((col) => {
        if (row[col]) {
          processed[col] = new Date(row[col]).getTime();
          processed[`${col}_formatted`] = new Date(
            row[col]
          ).toLocaleDateString();
        }
      });
      numericColumns.forEach((col) => {
        processed[col] = Number(row[col]) || 0;
      });
      return processed;
    });

    return { dateColumns, numericColumns, processedData };
  }, [chartData, availableColumns]);

  const chartColors = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const formatXAxisTick = (tickItem: any) => {
    if (dateColumn && tickItem) {
      return new Date(tickItem).toLocaleDateString();
    }
    return tickItem;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">
            {dateColumn
              ? new Date(label).toLocaleDateString()
              : `Point ${label}`}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium">{entry.dataKey}:</span>
              <span>
                {typeof entry.value === "number"
                  ? entry.value.toFixed(2)
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: processedData,
      margin: { top: 5, right: 20, left: 10, bottom: 5 },
    };

    const xAxisProps = {
      dataKey: dateColumn || "index",
      tickFormatter: formatXAxisTick,
      type: dateColumn ? ("number" as const) : ("category" as const),
      scale: dateColumn ? ("time" as const) : undefined,
      domain: dateColumn ? ["dataMin", "dataMax"] : undefined,
    };

    switch (chartType) {
      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis {...xAxisProps} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedColumns.map((column, index) => (
              <Area
                key={column}
                type="monotone"
                dataKey={column}
                stroke={chartColors[index % chartColors.length]}
                fill={chartColors[index % chartColors.length]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
            {showBrush && <Brush dataKey={dateColumn || "index"} height={30} />}
          </AreaChart>
        );

      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis {...xAxisProps} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedColumns.map((column, index) => (
              <Scatter
                key={column}
                dataKey={column}
                fill={chartColors[index % chartColors.length]}
              />
            ))}
          </ScatterChart>
        );

      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis {...xAxisProps} />
            <YAxis fontSize={8} allowDataOverflow />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedColumns.map((column, index) => (
              <Line
                key={column}
                type="monotone"
                dataKey={column}
                stroke={chartColors[index % chartColors.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
            {showBrush && <Brush dataKey={dateColumn || "index"} height={30} />}
          </LineChart>
        );
    }
  };

  const handleApplyFilters = () => {
    setFilters(pendingFilters);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-80">
          <div className="text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-base">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Chart:</label>
            <Select
              value={chartType}
              onValueChange={(value: ChartType) => setChartType(value)}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="scatter">Scatter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic filter rendering */}
          {Object.entries(filterOptions).map(([filterKey, options]) => (
            <div key={filterKey} className="flex items-center gap-2">
              <label className="text-sm font-medium capitalize">
                {filterKey}:
              </label>

              <Select
                value={pendingFilters[filterKey as keyof typeof pendingFilters]}
                onValueChange={(value) =>
                  setPendingFilters({ ...pendingFilters, [filterKey]: value })
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={filterKey} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key={null} value={undefined}>
                    Empty
                  </SelectItem>
                  {(options as string[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <Button
            size="sm"
            onClick={handleApplyFilters}
            disabled={
              JSON.stringify(filters) === JSON.stringify(pendingFilters)
            }
          >
            Apply
          </Button>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Zoom:</label>
            <input
              type="checkbox"
              checked={showBrush}
              onChange={() => setShowBrush(!showBrush)}
              className="h-4 w-4"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Series:</label>
          <div className="flex flex-wrap gap-2">
            {availableColumns.map((column) => (
              <Badge
                key={column}
                variant={
                  selectedColumns.includes(column) ? "default" : "outline"
                }
                className="cursor-pointer"
                onClick={() =>
                  setSelectedColumns(
                    selectedColumns.includes(column)
                      ? selectedColumns.filter((col) => col !== column)
                      : [...selectedColumns, column]
                  )
                }
              >
                {column}
              </Badge>
            ))}
          </div>
        </div>
        {chartData.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-80">
              <div className="text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-base">No Data Available</p>
                <p className="text-sm text-muted-foreground">
                  Adjust filters or check data source
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
