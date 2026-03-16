import React from "react";
import PDFNewsletterUpload from "@/components/upload/PDFNewsletterUpload";

export default function UploadPDF() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Upload Newsletter PDF</h1>
        <p className="text-slate-500 mt-1">Upload a healthcare newsletter PDF and our AI will extract insights, themes, key statistics, and more — instantly adding it to the knowledge base.</p>
      </div>
      <PDFNewsletterUpload />
    </div>
  );
}