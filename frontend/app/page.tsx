"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { FileUploadSection } from "@/components/file-upload-section";
import { DataVisualizationArea } from "@/components/data-visualization-area";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-6">
        <FileUploadSection />
        <DataVisualizationArea />
      </div>
    </DashboardLayout>
  );
}
