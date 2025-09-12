"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { ProcessedFile } from "./file-upload-section";

const ProcessedFilesContext = createContext<{
  processedFiles: ProcessedFile[];
  setProcessedFiles: React.Dispatch<React.SetStateAction<ProcessedFile[]>>;
}>({
  processedFiles: [],
  setProcessedFiles: () => {},
});

export const ProcessedFilesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);

  // Persist to localStorage whenever the global state changes
  useEffect(() => {
    if (processedFiles.length > 0) {
      localStorage.setItem("processedFiles", JSON.stringify(processedFiles));
    }
  }, [processedFiles]);

  return (
    <ProcessedFilesContext.Provider
      value={{ processedFiles, setProcessedFiles }}
    >
      {children}
    </ProcessedFilesContext.Provider>
  );
};

export const useProcessedFiles = () => useContext(ProcessedFilesContext);
