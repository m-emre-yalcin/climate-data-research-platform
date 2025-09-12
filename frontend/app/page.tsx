"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { FileUploadSection } from "@/components/file-upload-section";
import { DataVisualizationArea } from "@/components/data-visualization-area";
import { ProcessedFilesProvider } from "@/components/ProcessedFilesProvider";

export default function DashboardPage() {
  return (
    <ProcessedFilesProvider>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6 lg:flex-row">
          <div className="w-full max-w-xs self-start">
            <FileUploadSection />
          </div>
          <div className="flex-1">
            <DataVisualizationArea />
          </div>
        </div>
      </DashboardLayout>
    </ProcessedFilesProvider>
  );
}
