"use client";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useState } from "react";

export type ProcessingType = "escalas" | "dolor";

export default function UploadExcel() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingType, setProcessingType] =
    useState<ProcessingType>("escalas");

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/uploadExcel?file=${processingType}`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "processed_data.csv";
        link.click();
      } else {
        throw new Error("Failed to upload file");
      }
    } catch (error) {
      alert("Upload failed.");
      console.error("Upload error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">
                Team Productivity Upload
              </h1>
              <p className="text-muted-foreground">
                Upload your team&apos;s productivity data file to analyze
                performance metrics
              </p>
            </div>
            <div className="space-y-4">
              <Select
                value={processingType}
                onValueChange={(value: ProcessingType) =>
                  setProcessingType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select processing type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="escalas">Escalas</SelectItem>
                  <SelectItem value="dolor">Dolor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center space-y-4">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center justify-center text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md"
                >
                  Choose File
                </label>
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected file: {file.name}
                </p>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Upload Data"
              )}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
