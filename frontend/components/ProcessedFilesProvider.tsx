"use client";

import React, { useState, useEffect, createContext, useContext } from "react";

const ProcessedFilesContext = createContext<{
  processedFiles: string[];
  setProcessedFiles: React.Dispatch<React.SetStateAction<string[]>>;
}>({
  processedFiles: [],
  setProcessedFiles: () => {},
});

export const ProcessedFilesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);

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
