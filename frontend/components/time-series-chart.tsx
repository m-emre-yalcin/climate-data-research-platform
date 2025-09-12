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
import {
  TrendingUp,
  Filter,
  Download,
  Eye,
  RotateCcw,
  Info,
} from "lucide-react";
import { backend } from "@/lib/fetch";

interface TimeSeriesChartProps {
  filename?: string;
  title?: string;
  type?: string;
  subtitle?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
}

type ChartType = "line" | "area" | "scatter";

export function TimeSeriesChart({
  filename,
  type,
  title = "Time Series Analysis",
  subtitle = "Temporal data visualization with advanced filtering",
  yAxisLabel = "Value",
  xAxisLabel = "Time",
}: TimeSeriesChartProps) {
  const [chartType, setChartType] = useState<ChartType>("line");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [dateColumn, setDateColumn] = useState<string>("");
  const [showBrush, setShowBrush] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [lineWidth, setLineWidth] = useState(2);
  const [showDataPoints, setShowDataPoints] = useState(false);
  const [filters, setFilters] = useState({});
  const [pendingFilters, setPendingFilters] = useState(filters);
  const [filterOptions, setFilterOptions] = useState({});
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [dataStats, setDataStats] = useState<any>({});

  // Load saved preferences
  useEffect(() => {
    const savedFilters = localStorage.getItem("timeSeriesFilters");
    const savedPreferences = localStorage.getItem("chartPreferences");

    if (savedFilters) {
      const parsedFilters = JSON.parse(savedFilters);
      setFilters(parsedFilters);
      setPendingFilters(parsedFilters);
    }

    if (savedPreferences) {
      const prefs = JSON.parse(savedPreferences);
      setChartType(prefs.chartType || "line");
      setShowBrush(prefs.showBrush ?? true);
      setShowGrid(prefs.showGrid ?? true);
      setShowLegend(prefs.showLegend ?? true);
      setLineWidth(prefs.lineWidth || 2);
      setShowDataPoints(prefs.showDataPoints || false);
    }
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem("timeSeriesFilters", JSON.stringify(filters));
    localStorage.setItem(
      "chartPreferences",
      JSON.stringify({
        chartType,
        showBrush,
        showGrid,
        showLegend,
        lineWidth,
        showDataPoints,
      })
    );
  }, [
    filters,
    chartType,
    showBrush,
    showGrid,
    showLegend,
    lineWidth,
    showDataPoints,
  ]);

  // Fetch data
  useEffect(() => {
    if (type !== "csv" || !filename) return;

    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams();

      for (const filterKey of Object.keys(filters)) {
        const filterValue = filters[filterKey as keyof typeof filters] as any;
        if (filterValue) {
          params.append(filterKey, filterValue);
        }
      }

      selectedColumns.forEach((col) => params.append("columns", col));
      const endpoint = `/data/visualization/csv/timeseries/${filename}?${params.toString()}`;
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

        // Calculate statistics
        const stats: any = {};
        resData.y_labels.forEach((col: string) => {
          const values = resData.y_axes[col].filter((v: any) => v != null);
          stats[col] = {
            min: Math.min(...values),
            max: Math.max(...values),
            mean:
              values.reduce((a: number, b: number) => a + b, 0) / values.length,
            count: values.length,
          };
        });
        setDataStats(stats);

        if (!dateColumn) setDateColumn(resData.x_label);
        if (selectedColumns.length === 0) {
          setSelectedColumns(resData.y_labels.slice(0, 3)); // Limit initial selection
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [filename, type, filters, dateColumn]);

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
        /^\d{4}-\d{2}$/,
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

  // Enhanced color palette for scientific visualization
  const chartColors = ["#1B62B7", "#1f8d5fff"];

  const filteredColumns = availableColumns.filter((col) =>
    col.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatXAxisTick = (tickItem: any) => {
    if (dateColumn && tickItem) {
      const date = new Date(tickItem);
      return date.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      });
    }
    return tickItem;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-xl">
          <p className="font-semibold mb-3 text-gray-800">
            {dateColumn
              ? new Date(label).toLocaleDateString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : `Data Point ${label}`}
          </p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="font-medium text-gray-700">
                    {entry.dataKey}:
                  </span>
                </div>
                <span className="font-semibold text-gray-900">
                  {typeof entry.value === "number"
                    ? entry.value.toFixed(3)
                    : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = (loading: boolean) => {
    const commonProps = {
      data: processedData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    const xAxisProps = {
      dataKey: dateColumn || "index",
      tickFormatter: formatXAxisTick,
      type: dateColumn ? ("number" as const) : ("category" as const),
      scale: dateColumn ? ("time" as const) : undefined,
      domain: dateColumn ? ["dataMin", "dataMax"] : undefined,
      fontSize: 12,
      tick: { fill: "#6b7280" },
      label: {
        value: xAxisLabel,
        position: "insideBottom",
        offset: -10,
        style: { textAnchor: "middle" },
      },
    };

    const yAxisProps = {
      fontSize: 12,
      tick: { fill: "#6b7280" },
      label: {
        value: yAxisLabel,
        angle: -90,
        position: "insideLeft",
        style: { textAnchor: "middle" },
      },
    };

    if (loading)
      return (
        <Card className="border-2">
          <CardContent className="flex items-center justify-center h-80">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <div>
                <p className="text-lg font-medium text-gray-700">
                  Loading Data
                </p>
                <p className="text-sm text-gray-500">
                  Processing time series data...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );

    switch (chartType) {
      case "area":
        return (
          <AreaChart {...commonProps}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="2 2"
                stroke="#e5e7eb"
                strokeOpacity={0.5}
              />
            )}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ paddingTop: "20px" }} />}
            {selectedColumns.map((column, index) => (
              <Area
                key={column}
                type="monotone"
                dataKey={column}
                stroke={chartColors[index % chartColors.length]}
                fill={chartColors[index % chartColors.length]}
                fillOpacity={0.2}
                strokeWidth={lineWidth}
                dot={showDataPoints ? { r: 3, strokeWidth: 1 } : false}
              />
            ))}
            {showBrush && (
              <Brush
                dataKey={dateColumn || "index"}
                height={40}
                stroke="#1B62B7"
                tickFormatter={formatXAxisTick}
              />
            )}
          </AreaChart>
        );

      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="2 2"
                stroke="#e5e7eb"
                strokeOpacity={0.5}
              />
            )}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ paddingTop: "20px" }} />}
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
            {showGrid && (
              <CartesianGrid
                strokeDasharray="2 2"
                stroke="#e5e7eb"
                strokeOpacity={0.5}
              />
            )}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ paddingTop: "20px" }} />}
            {selectedColumns.map((column, index) => (
              <Line
                key={column}
                type="monotone"
                dataKey={column}
                stroke={chartColors[index % chartColors.length]}
                strokeWidth={lineWidth}
                dot={showDataPoints ? { r: 3, strokeWidth: 1 } : false}
                activeDot={{
                  r: 5,
                  stroke: chartColors[index % chartColors.length],
                  strokeWidth: 2,
                  fill: "#fff",
                }}
              />
            ))}
            {showBrush && (
              <Brush
                dataKey={dateColumn || "index"}
                height={40}
                stroke="#1B62B7"
                tickFormatter={formatXAxisTick}
              />
            )}
          </LineChart>
        );
    }
  };

  const handleApplyFilters = () => {
    setFilters(pendingFilters);
  };

  const handleResetFilters = () => {
    const resetFilters = {};
    setPendingFilters(resetFilters);
    setFilters(resetFilters);
  };

  const exportData = () => {
    const csvContent = [
      [dateColumn, ...selectedColumns].join(","),
      ...processedData.map((row) =>
        [
          row[dateColumn] ? new Date(row[dateColumn]).toISOString() : row.index,
          ...selectedColumns.map((col) => row[col] || ""),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_").toLowerCase()}_data.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const hasActiveFilters = Object.values(pendingFilters).some((v) => v !== "");
  const filtersChanged =
    JSON.stringify(filters) !== JSON.stringify(pendingFilters);

  // Auto apply filter changes
  useEffect(() => {
    if (filtersChanged) {
      handleApplyFilters();
    }
  }, [filtersChanged]);

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              {title}
            </CardTitle>
            <p className="text-sm text-gray-600">{subtitle}</p>
            {selectedColumns.length > 0 && (
              <p className="text-xs text-gray-500">
                Showing {selectedColumns.length} series • {processedData.length}{" "}
                data points
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8"
            >
              <Filter className="h-4 w-4 mr-1" />
              {showFilters ? "Hide" : "Show"} Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
              disabled={chartData.length === 0}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter Panel */}
        {showFilters && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">Data Filters</h3>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-7 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(filterOptions).map(([filterKey, options]) => (
                <div key={filterKey} className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 capitalize">
                    {filterKey.replace(/s$/, "")}
                  </label>
                  <Select
                    value={
                      pendingFilters[filterKey as keyof typeof pendingFilters]
                    }
                    onValueChange={(value) =>
                      setPendingFilters({
                        ...pendingFilters,
                        [filterKey]: value,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue
                        placeholder={`Select ${filterKey.replace(/s$/, "")}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key={null} value={undefined as any}>
                        All {filterKey}
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
            </div>
          </div>
        )}

        {/* Chart Controls */}
        <div className="border rounded-lg p-4 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-800">
              Visualization Settings
            </h3>
            <div className="flex items-center gap-4 text-sm">
              {Object.entries(dataStats).length > 0 && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Info className="h-4 w-4" />
                  <span>
                    Data loaded: {Object.keys(dataStats).length} variables
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Chart Type
              </label>
              <Select
                value={chartType}
                onValueChange={(value: ChartType) => setChartType(value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                  <SelectItem value="scatter">Scatter Plot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Line Width
              </label>
              <Select
                value={lineWidth.toString()}
                onValueChange={(value) => setLineWidth(Number(value))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Thin (1px)</SelectItem>
                  <SelectItem value="2">Normal (2px)</SelectItem>
                  <SelectItem value="3">Thick (3px)</SelectItem>
                  <SelectItem value="4">Extra Thick (4px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Display Options
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={showDataPoints}
                    onChange={() => setShowDataPoints(!showDataPoints)}
                    className="h-3 w-3"
                  />
                  Points
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={() => setShowGrid(!showGrid)}
                    className="h-3 w-3"
                  />
                  Grid
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={showLegend}
                    onChange={() => setShowLegend(!showLegend)}
                    className="h-3 w-3"
                  />
                  Legend
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={showBrush}
                    onChange={() => setShowBrush(!showBrush)}
                    className="h-3 w-3"
                  />
                  Zoom
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Series Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-800">
              Data Series
            </label>
          </div>

          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {filteredColumns.map((column) => {
              const isSelected = selectedColumns.includes(column);
              const stats = dataStats[column];
              return (
                <Badge
                  key={column}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer hover:shadow-sm transition-all text-xs px-2 py-1 flex items-center gap-2"
                  onClick={() =>
                    setSelectedColumns(
                      isSelected
                        ? selectedColumns.filter((col) => col !== column)
                        : [...selectedColumns, column]
                    )
                  }
                >
                  <span>{column}</span>
                  {stats && isSelected && (
                    <span className="text-xs opacity-75">
                      ({stats.min.toFixed(1)}–{stats.max.toFixed(1)})
                    </span>
                  )}
                </Badge>
              );
            })}
          </div>

          {selectedColumns.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border-l-4 border-amber-400">
              Select at least one data series to display the chart
            </p>
          )}
        </div>

        {/* Chart Display */}
        {chartData.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex items-center justify-center h-80">
              <div className="text-center space-y-3">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-600">
                    No Data Available
                  </p>
                  <p className="text-sm text-gray-500">
                    Try adjusting your filters or check your data source
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : selectedColumns.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex items-center justify-center h-80">
              <div className="text-center space-y-3">
                <Eye className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-600">
                    Select Data Series
                  </p>
                  <p className="text-sm text-gray-500">
                    Choose one or more variables to visualize
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="h-96 border rounded-lg bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(loading)}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
