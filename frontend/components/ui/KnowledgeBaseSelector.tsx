import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileText, Trash2, Database, Plus, X } from "lucide-react";
import { KnowledgeBaseData, UploadedFile } from "../../types";
import * as pdfjsLib from "pdfjs-dist";
import { toast } from "sonner";
import { logger } from "../../utils/logger";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface KnowledgeBaseSelectorProps {
  knowledgeBases: KnowledgeBaseData[];
  selectedKBIds: string[];
  onKBSelect: (kbIds: string[]) => void;
  uploadedFiles: UploadedFile[];
  onFilesUpload: (files: UploadedFile[]) => void;
  onFileRemove: (fileId: string) => void;
  onCreateNewKB?: () => void;
}

export function KnowledgeBaseSelector({
  knowledgeBases,
  selectedKBIds,
  onKBSelect,
  uploadedFiles,
  onFilesUpload,
  onFileRemove,
  onCreateNewKB,
}: KnowledgeBaseSelectorProps) {
  // Allowed file extensions (must match backend file_processors.py)
  const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt'];

  const validateFileExtension = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ALLOWED_EXTENSIONS.includes(ext);
  };

  const [showKBList, setShowKBList] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Extract text from PDF using pdfjs-dist with memory-efficient streaming
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      // Use chunks to avoid loading entire file into memory at once
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      // Process pages in batches to reduce memory pressure
      const batchSize = 5;
      for (let batchStart = 1; batchStart <= pdf.numPages; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize - 1, pdf.numPages);

        for (let pageNum = batchStart; pageNum <= batchEnd; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
          fullText += `\n--- Page ${pageNum} ---\n${pageText}`;

          // Clean up page object
          page.cleanup();
        }

        // Allow garbage collection between batches
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Clean up PDF document
      pdf.cleanup();
      pdf.destroy();

      logger.log(`📄 Extracted ${pdf.numPages} pages from PDF: ${file.name}`);
      return fullText.trim();
    } catch (error) {
      logger.error("Error extracting PDF text:", error);
      throw error;
    }
  };

  // Read file content based on type
  const readFileContent = async (file: File): Promise<string> => {
    // Check if it's a PDF
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      return await extractTextFromPDF(file);
    }

    // For text files, use FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setIsProcessing(true);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);

      // Process files one by one to avoid memory spike
      const newFiles = [];
      for (const file of files) {
        // Skip files larger than 50MB to prevent memory issues
        if (file.size > 50 * 1024 * 1024) {
          logger.warn(`⚠️ File too large (${(file.size / 1024 / 1024).toFixed(1)}MB): ${file.name}. Max 50MB per file.`);
          toast.error(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 50MB per file.`);
          continue;
        }

        // Validate file extension
        if (!validateFileExtension(file.name)) {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
          logger.warn(`⚠️ Unsupported file type: ${file.name}`);
          toast.error(`File "${file.name}" has unsupported format (.${ext}). Allowed: PDF, DOCX, TXT`);
          continue;
        }

        let content = "";
        try {
          content = await readFileContent(file);
          logger.log(`✅ Processed file: ${file.name}, content length: ${content.length}`);
        } catch (err) {
          logger.error("Error reading file:", file.name, err);
          continue;
        }

        newFiles.push({
          id: Date.now().toString() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          content: content
        });

        // Allow browser to breathe between file processing
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      onFilesUpload([...uploadedFiles, ...newFiles]);
    }

    setIsProcessing(false);
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsProcessing(true);

    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);

      // Process files one by one to avoid memory spike
      const newFiles = [];
      for (const file of files) {
        // Skip files larger than 50MB to prevent memory issues
        if (file.size > 50 * 1024 * 1024) {
          logger.warn(`⚠️ File too large (${(file.size / 1024 / 1024).toFixed(1)}MB): ${file.name}. Max 50MB per file.`);
          toast.error(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 50MB per file.`);
          continue;
        }

        // Validate file extension
        if (!validateFileExtension(file.name)) {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
          logger.warn(`⚠️ Unsupported file type: ${file.name}`);
          toast.error(`File "${file.name}" has unsupported format (.${ext}). Allowed: PDF, DOCX, TXT`);
          continue;
        }

        let content = "";
        try {
          content = await readFileContent(file);
          logger.log(`✅ Processed file: ${file.name}, content length: ${content.length}`);
        } catch (err) {
          logger.error("Error reading file:", file.name, err);
          continue;
        }

        newFiles.push({
          id: Date.now().toString() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          content: content
        });

        // Allow browser to breathe between file processing
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      onFilesUpload([...uploadedFiles, ...newFiles]);
    }

    setIsProcessing(false);
  };

  const toggleKB = (kbId: string) => {
    if (selectedKBIds.includes(kbId)) {
      onKBSelect(selectedKBIds.filter((id) => id !== kbId));
    } else {
      onKBSelect([...selectedKBIds, kbId]);
    }
  };

  const selectedKBs = knowledgeBases.filter((kb) =>
    selectedKBIds.includes(kb.id)
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs text-[#9B9380] uppercase tracking-widest font-bold ancient-rune">
          Knowledge Base (Optional)
        </label>
        <p className="text-xs text-[#5A4635] italic" style={{ fontFamily: "Noto Serif, serif" }}>
          Attach knowledge bases or upload files for RAG context
        </p>
      </div>

      {/* Knowledge Base Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#9B9380] uppercase tracking-widest font-bold">
            Select from Existing
          </span>
          {knowledgeBases.length > 0 && (
            <button
              type="button"
              onClick={() => setShowKBList(!showKBList)}
              className="text-xs text-[#9D4EDD] hover:underline flex items-center gap-1"
            >
              {showKBList ? (
                <>
                  <X className="w-3 h-3" /> Close
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" /> Add
                </>
              )}
            </button>
          )}
        </div>

        {/* Selected KBs Display */}
        {selectedKBs.length > 0 && (
          <div className="space-y-2">
            {selectedKBs.map((kb) => (
              <div
                key={kb.id}
                className="flex items-center justify-between p-3 bg-[#1F1F1F] border border-[#9D4EDD]/30 rounded-sm"
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-[#9D4EDD] flex-shrink-0" />
                  <div>
                    <span className="text-sm text-[#E8DCC8] font-medium">
                      {kb.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#5A4635]">
                        {kb.fileCount} files • {kb.size}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleKB(kb.id)}
                  className="p-1.5 text-[#9B9380] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* KB List Dropdown */}
        {showKBList && (
          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 p-3 bg-[#0F0F0F] border border-[#5A4635] rounded-sm">
            {/* Create New Button */}
            {onCreateNewKB && (
              <button
                type="button"
                onClick={() => {
                  onCreateNewKB();
                  setShowKBList(false);
                }}
                className="w-full flex items-center gap-2 p-2 mb-2 rounded-sm bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 hover:bg-[#9D4EDD]/20 text-[#9D4EDD] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Create New Knowledge Base</span>
              </button>
            )}

            {knowledgeBases.length > 0 ? (
              knowledgeBases.map((kb) => {
                const isSelected = selectedKBIds.includes(kb.id);
                return (
                  <button
                    key={kb.id}
                    type="button"
                    onClick={() => toggleKB(kb.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-sm transition-all ${isSelected
                      ? "bg-[#9D4EDD]/20 border border-[#9D4EDD]/50"
                      : "bg-[#1F1F1F] border border-[#5A4635] hover:border-[#9D4EDD]/30"
                      }`}
                  >
                    <Database
                      className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-[#9D4EDD]" : "text-[#9B9380]"
                        }`}
                    />
                    <div className="flex-1 text-left">
                      <div
                        className={`text-sm ${isSelected ? "text-[#9D4EDD]" : "text-[#E8DCC8]"
                          }`}
                      >
                        {kb.name}
                      </div>
                      <div className="text-[10px] text-[#5A4635]">
                        {kb.fileCount} files • {kb.size}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-[#5A4635] mb-2">
                  No knowledge bases available.
                </p>
                {!onCreateNewKB && (
                  <p className="text-xs text-[#9B9380]">
                    Create one in the Data tab.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* OR Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#5A4635]"></div>
        <span className="text-xs text-[#5A4635]">OR</span>
        <div className="flex-1 h-px bg-[#5A4635]"></div>
      </div>

      {/* Direct File Upload */}
      <div className="space-y-2">
        <span className="text-xs text-[#9B9380] uppercase tracking-widest font-bold">
          Upload Files Directly
        </span>
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer group ${dragActive
            ? "border-[#9D4EDD] bg-[#9D4EDD]/10"
            : "border-[#5A4635] bg-[#0F0F0F] hover:border-[#9B9380]"
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleChange}
            accept=".pdf,.docx,.txt"
          />

          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${dragActive
              ? "bg-[#9D4EDD]/20 text-[#9D4EDD]"
              : "bg-[#2A1B35] text-[#9B9380] group-hover:text-[#E8DCC8]"
              }`}
          >
            <Upload className="w-5 h-5" />
          </div>

          <p className="text-sm text-[#E8DCC8] font-medium mb-1 weathered-text">
            {isProcessing ? "Processing files..." : "Click or drag files here"}
          </p>
          <p className="text-[10px] text-[#5A4635]">
            Supported: PDF, DOCX, TXT
          </p>
          {isProcessing && (
            <div className="mt-2 flex items-center gap-2 text-[#9D4EDD]">
              <div className="w-4 h-4 border-2 border-[#9D4EDD] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Extracting text from PDF...</span>
            </div>
          )}
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2 animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#9B9380]">
                {uploadedFiles.length} file(s) uploaded
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-[#1F1F1F] border border-[#5A4635]/50 rounded-sm"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-[#9D4EDD] flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-[#E8DCC8] truncate">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-[#5A4635]">
                        {(file.size / 1024).toFixed(0)} KB • {file.content ? `${(file.content.length / 1000).toFixed(0)}k chars extracted` : 'No text'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onFileRemove(file.id)}
                    className="p-1 text-[#5A4635] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

