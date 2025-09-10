"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
} from "recharts"
import { TrendingUp, Maximize2, Download } from "lucide-react"

interface TimeSeriesData {
  [key: string]: any
  date?: string
  timestamp?: string
}

interface TimeSeriesChartProps {
  data: TimeSeriesData[]
  title?: string
  description?: string
}

type ChartType = "line" | "area" | "scatter"

export function TimeSeriesChart({ data, title = "Time Series Analysis", description }: TimeSeriesChartProps) {
  const [chartType, setChartType] = useState<ChartType>("line")
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [dateColumn, setDateColumn] = useState<string>("")
  const [showBrush, setShowBrush] = useState(true)
  const [showGrid, setShowGrid] = useState(true)

  // Extract columns and detect date/numeric columns
  const { dateColumns, numericColumns, processedData } = useMemo(() => {
    if (!data || data.length === 0) {
      return { dateColumns: [], numericColumns: [], processedData: [] }
    }

    const sampleRow = data[0]
    const allColumns = Object.keys(sampleRow)

    // Detect date columns
    const dateColumns = allColumns.filter((col) => {
      const value = sampleRow[col]
      if (!value) return false

      // Check if it's a date string or timestamp
      const datePatterns = [/^\d{4}-\d{2}-\d{2}$/, /^\d{2}\/\d{2}\/\d{4}$/, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/]

      return (
        datePatterns.some((pattern) => pattern.test(String(value))) ||
        col.toLowerCase().includes("date") ||
        col.toLowerCase().includes("time")
      )
    })

    // Detect numeric columns
    const numericColumns = allColumns.filter((col) => {
      const value = sampleRow[col]
      return typeof value === "number" || (!isNaN(Number(value)) && value !== null && value !== "")
    })

    // Process data for charting
    const processedData = data.map((row, index) => {
      const processed: any = { index }

      // Convert date columns to proper format
      dateColumns.forEach((col) => {
        if (row[col]) {
          processed[col] = new Date(row[col]).getTime()
          processed[`${col}_formatted`] = new Date(row[col]).toLocaleDateString()
        }
      })

      // Convert numeric columns
      numericColumns.forEach((col) => {
        processed[col] = Number(row[col]) || 0
      })

      return processed
    })

    return { dateColumns, numericColumns, processedData }
  }, [data])

  // Set default selections
  useMemo(() => {
    if (dateColumns.length > 0 && !dateColumn) {
      setDateColumn(dateColumns[0])
    }
    if (numericColumns.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns(numericColumns.slice(0, 3)) // Select first 3 numeric columns
    }
  }, [dateColumns, numericColumns, dateColumn, selectedColumns])

  const chartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]

  const formatXAxisTick = (tickItem: any) => {
    if (dateColumn && tickItem) {
      return new Date(tickItem).toLocaleDateString()
    }
    return tickItem
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{dateColumn ? new Date(label).toLocaleDateString() : `Point ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-medium">{entry.dataKey}:</span>
              <span>{typeof entry.value === "number" ? entry.value.toFixed(2) : entry.value}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    const commonProps = {
      data: processedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    }

    const xAxisProps = {
      dataKey: dateColumn || "index",
      tickFormatter: formatXAxisTick,
      type: dateColumn ? ("number" as const) : ("category" as const),
      scale: dateColumn ? ("time" as const) : undefined,
      domain: dateColumn ? ["dataMin", "dataMax"] : undefined,
    }

    switch (chartType) {
      case "area":
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
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
        )

      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis {...xAxisProps} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedColumns.map((column, index) => (
              <Scatter key={column} dataKey={column} fill={chartColors[index % chartColors.length]} />
            ))}
          </ScatterChart>
        )

      default: // line
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis {...xAxisProps} />
            <YAxis />
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
        )
    }
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Data Available</h3>
            <p className="text-muted-foreground">Upload and process a CSV file to see time series visualizations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Maximize2 className="h-4 w-4 mr-2" />
              Fullscreen
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart Controls */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Chart Type:</label>
            <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="scatter">Scatter Plot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateColumns.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Date Column:</label>
              <Select value={dateColumn} onValueChange={setDateColumn}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2">
            <Button variant={showGrid ? "default" : "outline"} size="sm" onClick={() => setShowGrid(!showGrid)}>
              Grid
            </Button>
            <Button variant={showBrush ? "default" : "outline"} size="sm" onClick={() => setShowBrush(!showBrush)}>
              Zoom
            </Button>
          </div>
        </div>

        {/* Column Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Data Series:</label>
          <div className="flex flex-wrap gap-2">
            {numericColumns.map((column) => (
              <Badge
                key={column}
                variant={selectedColumns.includes(column) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  if (selectedColumns.includes(column)) {
                    setSelectedColumns(selectedColumns.filter((col) => col !== column))
                  } else {
                    setSelectedColumns([...selectedColumns, column])
                  }
                }}
              >
                {column}
              </Badge>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {/* Chart Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{processedData.length}</p>
            <p className="text-sm text-muted-foreground">Data Points</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{selectedColumns.length}</p>
            <p className="text-sm text-muted-foreground">Series</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{dateColumns.length}</p>
            <p className="text-sm text-muted-foreground">Date Columns</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{numericColumns.length}</p>
            <p className="text-sm text-muted-foreground">Numeric Columns</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
