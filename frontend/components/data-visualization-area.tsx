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
import { RasterMapViewer } from "@/components/raster-map-viewer";
import { SpatialAnalysisTools } from "@/components/spatial-analysis-tools";
import {
  TrendingUp,
  Map,
  BarChart3,
  Database,
  AlertCircle,
  CheckCircle,
  Layers,
  X,
  Loader,
} from "lucide-react";
import { backend } from "@/lib/fetch";

// This interface defines the structure for a processed file in the frontend state
interface ProcessedFile {
  name: string;
  type: "csv" | "nc";
  data: any; // Can be an array of objects for CSV or a raster info object for NetCDF
  cleaning_report: any;
  metadata: any;
}

export function DataVisualizationArea() {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>(
    [] as any
  );

  const [selectedFile, setSelectedFile] = useState<ProcessedFile | null>(null);
  const [activeTab, setActiveTab] = useState("timeseries");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch initial file list from the backend
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const response = (await backend("/data/list")) as any;

        if (response.ok) {
          setProcessedFiles(response.data || []);
        } else {
          throw new Error(response.status || "Failed to fetch file list.");
        }
      } catch (err: any) {
        setError(
          `Error fetching data from the server: ${err.message}. Please try again later.`
        );
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [setProcessedFiles]);

  // Effect to auto-select a file when the list changes
  useEffect(() => {
    if (!selectedFile && processedFiles.length > 0) {
      setSelectedFile(processedFiles[0]);
    } else if (selectedFile) {
      const stillExists = processedFiles.some(
        (f) => f.name === selectedFile.name
      );
      if (!stillExists) {
        setSelectedFile(processedFiles.length > 0 ? processedFiles[0] : null);
      }
    }
  }, [processedFiles, selectedFile]);

  const handleRemoveFile = async (fileName: string) => {
    try {
      const response = (await backend(`/data/clear/${fileName}`, {
        method: "DELETE",
      })) as any;

      if (response?.ok) {
        const updatedFiles = processedFiles.filter(
          (file) => file.name !== fileName
        );
        setProcessedFiles(updatedFiles);
        // Logic to select the next available file is handled by the useEffect above
      } else {
        throw new Error(response.status || "Failed to delete the file.");
      }
    } catch (err: any) {
      setError(`Error removing file: ${err.message}`);
    }
  };

  const handleAnalysisComplete = (results: any) => {
    console.log("Analysis complete:", results);
  };

  const csvFiles = processedFiles.filter((file: any) => file.type === "csv");
  const netcdfFiles = processedFiles.filter(
    (file: any) => file.type === "netcdf"
  );

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6 flex items-center justify-center h-96">
          <div className="text-center">
            <Loader className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium mb-2">Loading Data...</h3>
            <p className="text-muted-foreground">
              Please wait while we fetch your processed files.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-96 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No Data Sources Found
              </h3>
              <p className="text-muted-foreground">
                Upload a CSV or NetCDF file to begin visualizing your data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="col-span-full space-y-6">
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

                        {file.metadata?.cleaning_report?.final_shape?.[0] && (
                          <span className="text-xs opacity-70">
                            ({file.metadata?.cleaning_report?.final_shape?.[0]}{" "}
                            rows)
                          </span>
                        )}
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
        </CardContent>
      </Card>

      {selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Data Visualization for {selectedFile.name}
            </CardTitle>
            <CardDescription>
              {selectedFile?.cleaning_report?.issues_found?.length > 0 ? (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  This dataset had{" "}
                  {selectedFile?.cleaning_report?.issues_found?.length} data
                  quality issues that were automatically resolved.
                </span>
              ) : (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  No data quality issues were found during processing.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
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
                    filename={selectedFile.name}
                    type={selectedFile.type}
                    title={`Time Series Analysis - ${selectedFile.name}`}
                  />
                )}
              </TabsContent>
              <TabsContent value="spatial" className="mt-6">
                {selectedFile.type === "nc" && (
                  <div className="space-y-6">
                    <RasterMapViewer
                      filename={selectedFile.name}
                      type={selectedFile.type}
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
