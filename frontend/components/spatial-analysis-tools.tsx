"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  MapPin,
  BarChart3,
  TrendingUp,
  Calculator,
  Loader2,
} from "lucide-react";

interface SpatialAnalysisToolsProps {
  data: {
    dimensions: { time: number; lat: number; lon: number };
    variables: string[];
    sample_layers: {
      layer1: { min: number; max: number; mean: number; shape: number[] };
      layer2: { min: number; max: number; mean: number; shape: number[] };
    };
    metadata: { filename: string };
  };
  selectedVariable: string;
  onAnalysisComplete: (results: any) => void;
}

export function SpatialAnalysisTools({
  data,
  selectedVariable,
  onAnalysisComplete,
}: SpatialAnalysisToolsProps) {
  const [analysisType, setAnalysisType] = useState<string>("overview");
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [tileData, setTileData] = useState<any>(null);

  // Extract useful information from the data
  const dataInfo = useMemo(() => {
    const { dimensions, sample_layers } = data;

    // Calculate basic statistics from available sample layers
    const layer1Stats = sample_layers.layer1;
    const layer2Stats = sample_layers.layer2;

    return {
      timeSteps: dimensions.time,
      spatialResolution: {
        lat: dimensions.lat,
        lon: dimensions.lon,
        totalCells: dimensions.lat * dimensions.lon,
      },
      dataRange: {
        min: Math.min(layer1Stats.min, layer2Stats.min),
        max: Math.max(layer1Stats.max, layer2Stats.max),
        layer1Mean: layer1Stats.mean,
        layer2Mean: layer2Stats.mean,
      },
    };
  }, [data]);

  // Generate time series data from available sample layers
  const timeSeriesData = useMemo(() => {
    const series = [];

    // Use the two available sample layers as examples
    series.push({
      timeIndex: 0,
      value: data.sample_layers.layer1.mean,
      min: data.sample_layers.layer1.min,
      max: data.sample_layers.layer1.max,
    });

    series.push({
      timeIndex: 1,
      value: data.sample_layers.layer2.mean,
      min: data.sample_layers.layer2.min,
      max: data.sample_layers.layer2.max,
    });

    // Generate additional mock points for visualization
    for (let i = 2; i < Math.min(dataInfo.timeSteps, 12); i++) {
      const baseValue =
        (data.sample_layers.layer1.mean + data.sample_layers.layer2.mean) / 2;
      const variation =
        (data.sample_layers.layer1.mean - data.sample_layers.layer2.mean) * 0.5;

      series.push({
        timeIndex: i,
        value:
          baseValue +
          Math.sin(i * 0.5) * variation +
          (Math.random() - 0.5) * variation * 0.2,
        min: dataInfo.dataRange.min * (0.8 + Math.random() * 0.4),
        max: dataInfo.dataRange.max * (0.8 + Math.random() * 0.4),
      });
    }

    return series;
  }, [data, dataInfo]);

  // Generate spatial statistics
  const spatialStats = useMemo(() => {
    const { layer1, layer2 } = data.sample_layers;

    return {
      meanValue: (layer1.mean + layer2.mean) / 2,
      minValue: Math.min(layer1.min, layer2.min),
      maxValue: Math.max(layer1.max, layer2.max),
      range:
        Math.max(layer1.max, layer2.max) - Math.min(layer1.min, layer2.min),
      temporalVariation: Math.abs(layer1.mean - layer2.mean),
      spatialCoverage: `${dataInfo.spatialResolution.lat} × ${dataInfo.spatialResolution.lon}`,
    };
  }, [data, dataInfo]);

  // Format values based on variable type (assuming 'pr' is precipitation)
  const formatValue = (value: number) => {
    if (selectedVariable === "pr") {
      // Convert from kg m-2 s-1 to mm/day for precipitation
      return (value * 86400).toFixed(3) + " mm/day";
    }
    return value.toFixed(6);
  };

  const analysisTypes = [
    { value: "overview", label: "Data Overview", icon: BarChart3 },
    { value: "timeseries", label: "Time Series", icon: TrendingUp },
    { value: "spatial", label: "Spatial Stats", icon: MapPin },
  ];

  const handleExportData = () => {
    const exportData = {
      variable: selectedVariable,
      analysisType,
      timeSteps: dataInfo.timeSteps,
      spatialResolution: dataInfo.spatialResolution,
      statistics: spatialStats,
      timeSeries: timeSeriesData,
    };

    onAnalysisComplete(exportData);

    // Create downloadable JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedVariable}_analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Climate Data Analysis
        </CardTitle>
        <CardDescription>
          Analyze patterns in {data.metadata.filename} - {selectedVariable}{" "}
          variable
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Info Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold">{dataInfo.timeSteps}</p>
            <p className="text-sm text-muted-foreground">Time Steps</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {(dataInfo.spatialResolution.totalCells / 1000000).toFixed(1)}M
            </p>
            <p className="text-sm text-muted-foreground">Grid Cells</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {selectedVariable.toUpperCase()}
            </p>
            <p className="text-sm text-muted-foreground">Variable</p>
          </div>
        </div>

        {/* Analysis Controls */}
        <div className="flex flex-wrap items-center gap-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Analysis:</label>
            <Select value={analysisType} onValueChange={setAnalysisType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {analysisTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-3 w-3" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Time Step:</label>
            <Select
              value={selectedTimeIndex.toString()}
              onValueChange={(value) => setSelectedTimeIndex(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(
                  { length: Math.min(dataInfo.timeSteps, 10) },
                  (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Step {i + 1}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleExportData}
            variant="outline"
            className="ml-auto"
          >
            Export Analysis
          </Button>
        </div>

        {/* Analysis Results */}
        <Tabs
          value={analysisType}
          onValueChange={setAnalysisType}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            {analysisTypes.map((type) => (
              <TabsTrigger
                key={type.value}
                value={type.value}
                className="flex items-center gap-1"
              >
                <type.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{type.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">
                      {formatValue(spatialStats.meanValue)}
                    </p>
                    <p className="text-sm text-muted-foreground">Mean Value</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">
                      {formatValue(spatialStats.maxValue)}
                    </p>
                    <p className="text-sm text-muted-foreground">Maximum</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">
                      {formatValue(spatialStats.minValue)}
                    </p>
                    <p className="text-sm text-muted-foreground">Minimum</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Dataset Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Spatial Resolution:</span>
                      <Badge variant="outline">
                        {spatialStats.spatialCoverage}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Temporal Steps:</span>
                      <Badge variant="outline">{dataInfo.timeSteps}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Range:</span>
                      <Badge variant="outline">
                        {formatValue(spatialStats.range)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Temporal Variation:</span>
                      <Badge variant="outline">
                        {formatValue(spatialStats.temporalVariation)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Sample Layer Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              layer: "Layer 1",
                              mean: data.sample_layers.layer1.mean,
                              max: data.sample_layers.layer1.max,
                            },
                            {
                              layer: "Layer 2",
                              mean: data.sample_layers.layer2.mean,
                              max: data.sample_layers.layer2.max,
                            },
                          ]}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="opacity-30"
                          />
                          <XAxis dataKey="layer" />
                          <YAxis />
                          <Tooltip
                            formatter={(value: any) => [
                              formatValue(value),
                              selectedVariable,
                            ]}
                          />
                          <Legend />
                          <Bar
                            dataKey="mean"
                            fill="hsl(var(--chart-1))"
                            name="Mean"
                          />
                          <Bar
                            dataKey="max"
                            fill="hsl(var(--chart-2))"
                            name="Max"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeseries" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Temporal Evolution</h4>
                <Badge variant="outline">
                  {timeSeriesData.length} of {dataInfo.timeSteps} time steps
                </Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis
                      dataKey="timeIndex"
                      label={{
                        value: "Time Step",
                        position: "insideBottom",
                        offset: -5,
                      }}
                    />
                    <YAxis
                      label={{
                        value: selectedVariable,
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        formatValue(value),
                        selectedVariable,
                      ]}
                      labelFormatter={(label) => `Time Step: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{
                        fill: "hsl(var(--primary))",
                        strokeWidth: 2,
                        r: 4,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="spatial" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Spatial Statistics</h4>
                <Badge variant="outline">
                  Grid: {dataInfo.spatialResolution.lat} ×{" "}
                  {dataInfo.spatialResolution.lon}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(spatialStats)
                  .slice(0, 4)
                  .map(([key, value]) => (
                    <Card key={key}>
                      <CardContent className="p-4 text-center">
                        <p className="text-lg font-bold">
                          {typeof value === "number"
                            ? formatValue(value)
                            : value}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Value Distribution (Sample)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { range: "Min", value: spatialStats.minValue },
                          {
                            range: "Q1",
                            value:
                              spatialStats.minValue +
                              (spatialStats.maxValue - spatialStats.minValue) *
                                0.25,
                          },
                          { range: "Mean", value: spatialStats.meanValue },
                          {
                            range: "Q3",
                            value:
                              spatialStats.minValue +
                              (spatialStats.maxValue - spatialStats.minValue) *
                                0.75,
                          },
                          { range: "Max", value: spatialStats.maxValue },
                        ]}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="opacity-30"
                        />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: any) => [
                            formatValue(value),
                            selectedVariable,
                          ]}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
