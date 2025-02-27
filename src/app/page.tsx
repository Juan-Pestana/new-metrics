"use client"

import { useState } from 'react';

export default function UploadExcel() {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/uploadExcel', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'processed_data.csv';
      link.click();
    } else {
      alert('Upload failed.');
    }
  };

  return (
    <div>
      <input type="file" accept=".xlsx, .xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button type='button' onClick={handleUpload}>Upload and Process</button>
    </div>
  );
}
