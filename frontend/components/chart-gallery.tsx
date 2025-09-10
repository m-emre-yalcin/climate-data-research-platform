"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, ResponsiveContainer } from "recharts"
import { BarChart3, TrendingUp, PieChartIcon, Activity, Plus } from "lucide-react"

interface ChartConfig {
  id: string
  title: string
  type: "bar" | "line" | "area" | "pie"
  dataKey: string
  color: string
}

interface ChartGalleryProps {
  data: any[]
  onCreateChart: (config: ChartConfig) => void
}

export function ChartGallery({ data, onCreateChart }: ChartGalleryProps) {
  const [selectedCharts, setSelectedCharts] = useState<ChartConfig[]>([])

  const sampleCharts: ChartConfig[] = [
    {
      id: "temperature-trend",
      title: "Temperature Trend",
      type: "line",
      dataKey: "temperature",
      color: "hsl(var(--chart-1))",
    },
    {
      id: "precipitation-bars",
      title: "Monthly Precipitation",
      type: "bar",
      dataKey: "precipitation",
      color: "hsl(var(--chart-2))",
    },
    {
      id: "humidity-area",
      title: "Humidity Levels",
      type: "area",
      dataKey: "humidity",
      color: "hsl(var(--chart-3))",
    },
  ]

  const renderMiniChart = (config: ChartConfig) => {
    const chartData = data.slice(0, 10) // Show only first 10 points for preview

    switch (config.type) {
      case "bar":
        return (
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <Bar dataKey={config.dataKey} fill={config.color} />
          </BarChart>
        )
      case "area":
        return (
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <Area
              type="monotone"
              dataKey={config.dataKey}
              stroke={config.color}
              fill={config.color}
              fillOpacity={0.3}
            />
          </AreaChart>
        )
      case "pie":
        return (
          <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <Pie data={chartData} dataKey={config.dataKey} cx="50%" cy="50%" outerRadius={30} fill={config.color} />
          </PieChart>
        )
      default: // line
        return (
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <Line type="monotone" dataKey={config.dataKey} stroke={config.color} strokeWidth={2} dot={false} />
          </LineChart>
        )
    }
  }

  const getChartIcon = (type: string) => {
    switch (type) {
      case "bar":
        return <BarChart3 className="h-4 w-4" />
      case "area":
        return <Activity className="h-4 w-4" />
      case "pie":
        return <PieChartIcon className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Data Available</h3>
            <p className="text-muted-foreground">Upload data to see chart suggestions</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Chart Gallery
        </CardTitle>
        <CardDescription>Quick chart templates based on your data</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="suggested" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="suggested">Suggested Charts</TabsTrigger>
            <TabsTrigger value="custom">Custom Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="suggested" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sampleCharts.map((config) => (
                <Card key={config.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getChartIcon(config.type)}
                        <span className="font-medium text-sm">{config.title}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {config.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-24 mb-3">
                      <ResponsiveContainer width="100%" height="100%">
                        {renderMiniChart(config)}
                      </ResponsiveContainer>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => onCreateChart(config)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Create Chart
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Custom Chart Builder</h3>
              <p className="text-muted-foreground mb-4">Create custom visualizations with advanced options</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Build Custom Chart
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
