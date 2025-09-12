"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  AlertCircle,
  Upload,
  FileText,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { backend } from "@/lib/fetch";
import { getAuthToken } from "@/lib/utils";
import { useProcessedFiles } from "./ProcessedFilesProvider";

export interface ProcessedFile {
  name: string;
  type: "csv" | "nc";
  data: any;
  metadata: {
    rows?: number;
    columns?: number;
    headers?: string[];
    variables?: string[];
    issues: any[];
    [key: string]: any;
  };
}

interface UploadedFile {
  name: string;
  size: number;
  type: "csv" | "nc";
  status: "uploading" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
  metadata?: {
    rows: number;
    columns: number;
    headers: string[];
    issues: string[];
    cleaningSteps: string[];
    summary?: {
      total_rows: number;
      total_columns: number;
      numeric_columns: string[];
      date_columns: string[];
    };
    cleaning_report?: {
      original_shape: [number, number];
      final_shape: [number, number];
      issues_found: string[];
      fixes_applied: string[];
    };
  };
  preview?: any[];
}

export function FileUploadSection() {
  const { setProcessedFiles } = useProcessedFiles();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) {
        processFiles(files);
      }
    },
    [setProcessedFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length) {
        processFiles(files);
        // Reset the input value to allow re-uploading the same file
        e.target.value = "";
      }
    },
    [setProcessedFiles]
  );

  const processFiles = async (files: File[]) => {
    const token = getAuthToken();
    if (!token) {
      alert("Please login first");
      return;
    }

    const newUploads: UploadedFile[] = files
      .map((file) => {
        const fileType = file.name.endsWith(".csv")
          ? "csv"
          : file.name.endsWith(".nc")
          ? "nc"
          : null;

        if (!fileType) {
          console.warn(`Unsupported file type: ${file.name}`);
          return null;
        }

        return {
          name: file.name,
          size: file.size,
          type: fileType,
          status: "uploading",
          progress: 0,
        };
      })
      .filter((file): file is UploadedFile => file !== null);

    setUploadedFiles((prev) => [...prev, ...newUploads]);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name
              ? { ...f, status: "uploading", progress: 30 }
              : f
          )
        );

        const uploadResponse = await backend("/upload/data", {
          method: "POST",
          body: formData,
          requireAuth: true,
        });

        if (!uploadResponse?.ok) {
          const errorData = uploadResponse?.data as any;
          throw new Error(
            errorData.detail ||
              `Upload failed with status ${uploadResponse?.status}`
          );
        }

        const uploadResult = uploadResponse.data as any;
        const fileType = file.name.endsWith(".csv") ? "csv" : "nc";

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name
              ? { ...f, status: "processing", progress: 70 }
              : f
          )
        );

        // Finalize state update after a short delay to show "processing"
        setTimeout(() => {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.name === file.name
                ? {
                    ...f,
                    status: "completed",
                    progress: 100,
                    metadata: {
                      rows:
                        uploadResult.summary?.total_rows ||
                        uploadResult.info?.dimensions?.time ||
                        0,
                      columns:
                        uploadResult.summary?.total_columns ||
                        Object.keys(uploadResult.info?.variables || {})
                          .length ||
                        0,
                      headers:
                        uploadResult.summary?.numeric_columns ||
                        Object.keys(uploadResult.info?.variables || {}),
                      issues: uploadResult.cleaning_report?.issues_found || [],
                      cleaningSteps:
                        uploadResult.cleaning_report?.fixes_applied || [],
                    },
                  }
                : f
            )
          );

          // Create the processed file object for the global state
          const newProcessedFile: ProcessedFile = {
            name: file.name,
            type: fileType,
            data: uploadResult.preview || uploadResult.info || [],
            metadata: {
              rows:
                uploadResult.summary?.total_rows ||
                uploadResult.info?.dimensions?.time ||
                0,
              columns:
                uploadResult.summary?.total_columns ||
                Object.keys(uploadResult.info?.variables || {}).length ||
                0,
              variables: Object.keys(uploadResult.info?.variables || {}),
              issues: uploadResult.cleaning_report?.issues_found || [],
            },
          };

          // Update the global state
          setProcessedFiles((prevGlobalFiles) => [
            ...prevGlobalFiles,
            newProcessedFile,
          ]);
        }, 1000);
      } catch (error: any) {
        console.error("File processing error:", error?.message);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name
              ? {
                  ...f,
                  status: "error",
                  progress: 0,
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                }
              : f
          )
        );
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  const clearFinishedUploads = () => {
    setUploadedFiles([]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Data Upload
            </CardTitle>
            <CardDescription>
              Upload CSV time series or NetCDF raster climate files
            </CardDescription>
          </div>
          {uploadedFiles.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearFinishedUploads}>
              Clear List
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports CSV and NetCDF (.nc) files up to 100MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.nc"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button asChild variant="outline">
              <label htmlFor="file-upload" className="cursor-pointer">
                Select Files
              </label>
            </Button>
          </div>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Upload Status</h4>
            {uploadedFiles.map((file, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {file.type === "csv" ? (
                      <FileText className="h-5 w-5 text-green-600" />
                    ) : (
                      <Database className="h-5 w-5 text-blue-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <Badge
                        variant={file.type === "csv" ? "default" : "secondary"}
                      >
                        {file.type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>

                    {(file.status === "uploading" ||
                      file.status === "processing") && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs text-muted-foreground">
                            {file.status.charAt(0).toUpperCase() +
                              file.status.slice(1)}
                            ...
                          </span>
                        </div>
                        <Progress value={file.progress} className="h-1" />
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {file.status === "completed" && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {file.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>

                {file.status === "error" && file.error && (
                  <Alert variant="destructive" className="ml-8">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{file.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>🔒 Logged in as researcher. API server: localhost:8000</p>
        </div>
      </CardContent>
    </Card>
  );
}
