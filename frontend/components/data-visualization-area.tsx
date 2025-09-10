"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TimeSeriesChart } from "@/components/time-series-chart";
import { ChartGallery } from "@/components/chart-gallery";
import { DataStatistics } from "@/components/data-statistics";
import { RasterMapViewer } from "@/components/raster-map-viewer";
import { SpatialAnalysisTools } from "@/components/spatial-analysis-tools";
import {
  TrendingUp,
  Map,
  BarChart3,
  Settings,
  Database,
  AlertCircle,
  Layers,
  X,
} from "lucide-react";
import { getAuthToken } from "@/lib/utils";

// This interface defines the structure for a processed file in the frontend state
interface ProcessedFile {
  name: string;
  type: "csv" | "nc";
  data: any; // Can be an array of objects for CSV or a raster info object for NetCDF
  metadata: {
    rows?: number;
    columns?: number;
    headers?: string[];
    variables?: string[];
    issues: any[];
    // Add other metadata fields as needed
    [key: string]: any;
  };
}

export function DataVisualizationArea({ key }: { key: number }) {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProcessedFile | null>(null);
  const [activeTab, setActiveTab] = useState("timeseries");
  const [error, setError] = useState<string | null>(null);

  // Fetch data from the backend when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      const token = getAuthToken();
      if (!token) {
        // Handle case where user is not authenticated
        // You might want to redirect to a login page or show a message
        console.warn("No authentication token found.");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const files: ProcessedFile[] = [];

      try {
        // Concurrently fetch both CSV and Raster data availability
        const [csvResponse, rasterResponse] = await Promise.all([
          fetch("http://localhost:8000/api/v1/data/csv", { headers }),
          fetch("http://localhost:8000/api/v1/data/raster", { headers }),
        ]);

        // Process CSV data if available
        if (csvResponse.ok) {
          const csvData = await csvResponse.json();
          files.push({
            name: "processed_timeseries.csv", // API doesn't provide filename here, using a placeholder
            type: "csv",
            data: csvData.data,
            metadata: {
              rows: csvData.shape?.[0],
              columns: csvData.shape?.[1],
              headers: csvData.columns,
              issues: csvData.cleaning_report?.issues_found || [],
              cleaningSteps: csvData.cleaning_report?.fixes_applied || [],
            },
          });
        }

        // Process Raster data if available
        if (rasterResponse.ok) {
          const rasterData = await rasterResponse.json();
          files.push({
            name: "processed_spatial.nc", // API doesn't provide filename here, using a placeholder
            type: "nc",
            data: rasterData, // The entire info object is used by the components
            metadata: {
              variables: rasterData.variables,
              dimensions: rasterData.dimensions,
              issues: [], // Raster processing in API doesn't report issues
            },
          });
        }

        setProcessedFiles(files);
        if (files.length > 0) {
          setSelectedFile(files[0]);
        }
      } catch (err) {
        console.error("Failed to fetch data from backend:", err);
        setError(
          "Could not connect to the data server. Please try again later."
        );
      }
    };

    fetchData();
    // NOTE: To refresh data after a new upload, you'll need to trigger this effect.
    // One way is to pass a 'refreshKey' prop from the parent component that changes
    // after an upload is complete, and add it to the dependency array below.
  }, []);

  // Dummy function for file removal as requested.
  // In a real application, you would implement a DELETE request to the backend.
  const handleRemoveFile = (fileName: string) => {
    console.log(
      `Request to remove file: ${fileName}. Implement backend logic for this.`
    );
    // This is a dummy implementation to update the UI instantly.
    const updatedFiles = processedFiles.filter(
      (file) => file.name !== fileName
    );
    setProcessedFiles(updatedFiles);
    if (selectedFile?.name === fileName) {
      setSelectedFile(updatedFiles.length > 0 ? updatedFiles[0] : null);
    }
  };

  const handleCreateChart = (config: any) => {
    console.log("Creating chart with config:", config);
    // In a real app, this would create a new chart instance
  };

  const handleAnalysisComplete = (results: any) => {
    console.log("Analysis complete:", results);
    // Handle analysis results
  };

  // Separate CSV and NetCDF files for display
  const csvFiles = processedFiles.filter((file) => file.type === "csv");
  const netcdfFiles = processedFiles.filter((file) => file.type === "nc");

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (processedFiles.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Data Visualization
              </CardTitle>
              <CardDescription>
                Interactive charts and maps for your climate data
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="timeseries" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger
                value="timeseries"
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Time Series
              </TabsTrigger>
              <TabsTrigger value="spatial" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Spatial Data
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Chart Gallery
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Analysis
              </TabsTrigger>
            </TabsList>
            <TabsContent value="timeseries" className="mt-6">
              <div className="h-96 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Time Series Data Found
                  </h3>
                  <p className="text-muted-foreground">
                    Upload a CSV file to see interactive time series charts.
                  </p>
                </div>
              </div>
            </TabsContent>
            {/* Other empty tabs remain the same */}
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="col-span-full space-y-6">
      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Sources
          </CardTitle>
          <CardDescription>
            Select a processed file from the server to visualize
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {csvFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Time Series Data (CSV)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {csvFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <Button
                        variant={
                          selectedFile?.name === file.name
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setSelectedFile(file)}
                        className="flex items-center gap-2 pr-8"
                      >
                        <Database className="h-3 w-3" />
                        {file.name}
                        <span className="text-xs opacity-70">
                          ({file.metadata.rows} rows)
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(file.name);
                        }}
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {netcdfFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Raster Data (NetCDF)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {netcdfFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <Button
                        variant={
                          selectedFile?.name === file.name
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setSelectedFile(file)}
                        className="flex items-center gap-2 pr-8"
                      >
                        <Map className="h-3 w-3" />
                        {file.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(file.name);
                        }}
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedFile && selectedFile.metadata.issues.length > 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This dataset had {selectedFile.metadata.issues.length} data
                quality issues that were automatically resolved during
                processing.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Visualization Tabs */}
      {selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Data Visualization
            </CardTitle>
            <CardDescription>
              Interactive charts and analysis for {selectedFile.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger
                  value="timeseries"
                  className="flex items-center gap-2"
                  disabled={selectedFile.type !== "csv"}
                >
                  <TrendingUp className="h-4 w-4" />
                  Time Series
                </TabsTrigger>
                <TabsTrigger
                  value="spatial"
                  className="flex items-center gap-2"
                  disabled={selectedFile.type !== "nc"}
                >
                  <Map className="h-4 w-4" />
                  Spatial Data
                </TabsTrigger>
                <TabsTrigger
                  value="analysis"
                  className="flex items-center gap-2"
                  disabled={selectedFile.type !== "nc"}
                >
                  <Layers className="h-4 w-4" />
                  Analysis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeseries" className="mt-6">
                {selectedFile.type === "csv" && (
                  <TimeSeriesChart
                    data={selectedFile.data}
                    title={`Time Series Analysis - ${selectedFile.name}`}
                    description={`${selectedFile.metadata.rows} data points across ${selectedFile.metadata.columns} variables`}
                  />
                )}
              </TabsContent>

              <TabsContent value="spatial" className="mt-6">
                {selectedFile.type === "nc" && (
                  <div className="space-y-6">
                    <RasterMapViewer
                      data={selectedFile.data}
                      title={`Spatial Visualization - ${selectedFile.name}`}
                      description="Interactive raster data visualization with temporal controls"
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analysis" className="mt-6">
                {selectedFile.type === "nc" && (
                  <SpatialAnalysisTools
                    data={selectedFile.data}
                    selectedVariable={
                      selectedFile.metadata.variables?.[0] || "temperature"
                    }
                    onAnalysisComplete={handleAnalysisComplete}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
