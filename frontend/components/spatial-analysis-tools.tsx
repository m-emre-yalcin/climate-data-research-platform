"use client";

import { useState } from "react";
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
import { MapPin, BarChart3, TrendingUp, Calculator } from "lucide-react";

interface SpatialAnalysisToolsProps {
  data: any;
  selectedVariable: string;
  onAnalysisComplete: (results: any) => void;
}

export function SpatialAnalysisTools({
  data,
  selectedVariable,
  onAnalysisComplete,
}: SpatialAnalysisToolsProps) {
  const [analysisType, setAnalysisType] = useState<string>("profile");
  const [selectedRegion, setSelectedRegion] = useState<string>("global");

  // Generate mock analysis data
  const generateProfileData = () => {
    const profileData = [];
    for (let i = 0; i < 20; i++) {
      profileData.push({
        distance: i * 5,
        value: Math.sin(i * 0.3) * 20 + 25 + Math.random() * 5,
        latitude: 45 - i * 2,
      });
    }
    return profileData;
  };

  const generateTimeSeriesData = () => {
    const timeSeriesData = [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    months.forEach((month, index) => {
      timeSeriesData.push({
        month,
        value: 20 + Math.sin(index * 0.5) * 15 + Math.random() * 5,
        anomaly: (Math.random() - 0.5) * 10,
      });
    });
    return timeSeriesData;
  };

  const generateStatistics = () => ({
    mean: 24.5,
    median: 23.8,
    std: 8.2,
    min: 8.1,
    max: 42.3,
    range: 34.2,
  });

  const profileData = generateProfileData();
  const timeSeriesData = generateTimeSeriesData();
  const statistics = generateStatistics();

  const regions = [
    { value: "global", label: "Global" },
    { value: "arctic", label: "Arctic (>66°N)" },
    { value: "temperate", label: "Temperate (23-66°)" },
    { value: "tropical", label: "Tropical (±23°)" },
    { value: "custom", label: "Custom Region" },
  ];

  const analysisTypes = [
    { value: "profile", label: "Spatial Profile", icon: MapPin },
    { value: "timeseries", label: "Time Series", icon: TrendingUp },
    { value: "statistics", label: "Statistics", icon: Calculator },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Spatial Analysis Tools
        </CardTitle>
        <CardDescription>
          Analyze patterns and trends in your raster data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Controls */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
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
            <label className="text-sm font-medium">Region:</label>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Badge variant="outline" className="ml-auto">
            Variable: {selectedVariable}
          </Badge>
        </div>

        {/* Analysis Results */}
        <Tabs
          value={analysisType}
          onValueChange={setAnalysisType}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
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

          <TabsContent value="profile" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Latitudinal Profile</h4>
                <Button variant="outline" size="sm">
                  Export Data
                </Button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profileData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis
                      dataKey="latitude"
                      label={{
                        value: "Latitude (°N)",
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
                        `${value.toFixed(1)}`,
                        selectedVariable,
                      ]}
                      labelFormatter={(label) => `Latitude: ${label}°N`}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{
                        fill: "hsl(var(--primary))",
                        strokeWidth: 2,
                        r: 3,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeseries" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Regional Time Series</h4>
                <Button variant="outline" size="sm">
                  Export Data
                </Button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis dataKey="month" />
                    <YAxis
                      label={{
                        value: selectedVariable,
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        `${value.toFixed(1)}${
                          name === "anomaly" ? " (anomaly)" : ""
                        }`,
                        name === "value" ? selectedVariable : "Anomaly",
                      ]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      name={selectedVariable}
                    />
                    <Line
                      type="monotone"
                      dataKey="anomaly"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Anomaly"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Statistical Summary</h4>
                <Button variant="outline" size="sm">
                  Export Report
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(statistics).map(([key, value]) => (
                  <Card key={key}>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{value.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {key}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { range: "0-10", count: 12 },
                      { range: "10-20", count: 25 },
                      { range: "20-30", count: 45 },
                      { range: "30-40", count: 18 },
                      { range: "40+", count: 5 },
                    ]}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
