"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { FileUploadSection } from "@/components/file-upload-section";
import { DataVisualizationArea } from "@/components/data-visualization-area";
import { ProcessedFilesProvider } from "@/components/ProcessedFilesProvider";

export default function DashboardPage() {
  return (
    <ProcessedFilesProvider>
      <DashboardLayout>
        <div className="grid grid-cols-1 p-6 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <FileUploadSection />
          </div>
          <div className="lg:col-span-2">
            <DataVisualizationArea />
          </div>
        </div>
      </DashboardLayout>
    </ProcessedFilesProvider>
  );
}
