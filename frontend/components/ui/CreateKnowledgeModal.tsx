import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import {
  X,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { KnowledgeBaseData } from "../../types";
import {
  uploadPDFToBackend,
  createKnowledgeBaseOnBackend,
  getKnowledgeBaseFiles,
  deleteFileFromKnowledgeBase,
  KBFile,
} from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useAppContext } from "../../contexts/AppContext";
import { toast } from "sonner";
import { logger } from "../../utils/logger";

interface CreateKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateKB: (kb: KnowledgeBaseData) => Promise<void> | void;
  editingKB?: KnowledgeBaseData | null; // New prop for edit mode
  onUpdateKB?: (kb: KnowledgeBaseData) => Promise<void> | void; // New prop for updating
}


export function CreateKnowledgeModal({
  isOpen,
  onClose,
  onCreateKB,
  editingKB,
  onUpdateKB,
}: CreateKnowledgeModalProps) {
  const { user } = useAuth();
  const { reloadKnowledgeBases } = useAppContext();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<KBFile[]>([]);
  const [kbName, setKbName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Allowed file extensions (must match backend file_processors.py)
  const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt'];

  const validateFileExtension = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ALLOWED_EXTENSIONS.includes(ext);
  };

  // File processing is handled by backend to prevent memory issues
  // Frontend only uploads files without extracting content

  // Update form when editingKB changes
  useEffect(() => {
    if (editingKB) {
      setKbName(editingKB.name);
      setFiles([]); // Start with empty files for edit mode

      // Fetch existing files
      const fetchFiles = async () => {
        // Use id (backend uses UUIDs now)
        const kbId = editingKB.id;
        const files = await getKnowledgeBaseFiles(kbId);
        setExistingFiles(files);
      };
      fetchFiles();
    } else if (isOpen) {
      // Reset when opening in create mode
      setKbName("");
      setFiles([]);
      setExistingFiles([]);
    }
  }, [editingKB, isOpen]);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles: File[] = [];

      for (const file of droppedFiles) {
        if (!validateFileExtension(file.name)) {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
          toast.error(`File "${file.name}" has unsupported format (.${ext}). Allowed: PDF, DOCX, TXT`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles]);
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles: File[] = [];

      for (const file of selectedFiles) {
        if (!validateFileExtension(file.name)) {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
          toast.error(`File "${file.name}" has unsupported format (.${ext}). Allowed: PDF, DOCX, TXT`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles]);
      }
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDeleteExistingFile = async (filename: string) => {
    if (!editingKB) return;

    setDeletingFile(filename);
    try {
      const kbId = editingKB.id;
      const result = await deleteFileFromKnowledgeBase(kbId, filename);

      if (result.success) {
        setExistingFiles((prev) => prev.filter((f) => f.filename !== filename));
        toast.success("File deleted", {
          description: `${filename} removed from knowledge base`,
        });
        // Reload KB data to update file count
        await reloadKnowledgeBases();
      } else {
        toast.error("Failed to delete file", {
          description: result.message || "An error occurred",
        });
      }
    } catch (error) {
      toast.error("Error deleting file", {
        description: String(error),
      });
    } finally {
      setDeletingFile(null);
    }
  };

  // Xử lý tạo mới hoặc update
  const handleCreate = async () => {
    if (!kbName.trim()) {
      logger.warn("⚠️ KB name is empty");
      return;
    }

    logger.log(
      "🚀 Starting KB creation. Name:",
      kbName,
      "Files:",
      files.length,
    );
    setIsProcessing(true);

    // Don't extract content in frontend - let backend handle it to prevent memory issues
    // Just collect files for upload
    const pdfFiles: File[] = [];

    if (files.length > 0) {
      files.forEach((file) => {
        // Collect all supported files for backend upload
        // Backend supports: pdf, docx, txt, md
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (ALLOWED_EXTENSIONS.includes(ext)) {
          pdfFiles.push(file);
        }
      });
      logger.log(
        "📤 Preparing to upload",
        pdfFiles.length,
        "files to backend",
      );
    }

    // Tính tổng dung lượng giả lập
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    const sizeString =
      totalSize > 1024 * 1024
        ? `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
        : `${(totalSize / 1024).toFixed(1)} KB`;

    if (editingKB && onUpdateKB) {
      // Edit mode - update existing KB
      const updatedKB: KnowledgeBaseData = {
        ...editingKB,
        name: kbName,
        fileCount:
          files.length > 0
            ? editingKB.fileCount + files.length
            : editingKB.fileCount,
        size: files.length > 0 ? sizeString : editingKB.size,
        // Don't store content in frontend to prevent memory issues
      };

      // Upload PDF files to Backend
      for (const pdfFile of pdfFiles) {
        try {
          const result = await uploadPDFToBackend(pdfFile, editingKB.id);
          logger.log("📤 PDF uploaded to Backend:", result);
        } catch (error) {
          logger.warn(
            "⚠️ Failed to upload PDF to Backend, saved locally:",
            error,
          );
        }
      }

      // Reload KB data from backend to get updated file count
      await reloadKnowledgeBases();

      onUpdateKB(updatedKB);
    } else {
      // Create mode - first create KB on Backend to get ID
      let mongoKBId: string | undefined;
      try {
        if (!user) {
          logger.error("❌ User not authenticated, cannot create KB");
          toast.error("Authentication required", { description: "Please login to create Knowledge Base" });
          setIsProcessing(false);
          return;
        }
        logger.log(
          "🔄 Creating KB on backend. User ID:",
          user.id,
          "KB Name:",
          kbName,
        );
        const backendResult = await createKnowledgeBaseOnBackend(
          user.id,
          kbName,
          "",
        );
        logger.log("📊 Backend result:", backendResult);

        if (backendResult.success && backendResult.id) {
          mongoKBId = backendResult.id;
          logger.log("✅ KB created on Backend:", mongoKBId);
        } else {
          logger.error("❌ Failed to create KB:", backendResult.message);
          toast.error("Failed to create Knowledge Base", { description: backendResult.message || "Unknown error" });
          setIsProcessing(false);
          return;
        }
      } catch (error) {
        logger.error("❌ Exception creating KB on Backend:", error);
        toast.error("Error creating Knowledge Base", { description: String(error) });
        setIsProcessing(false);
        return;
      }

      const newKB: KnowledgeBaseData = {
        id: mongoKBId || Date.now().toString(),
        name: kbName,
        fileCount: files.length,
        size: sizeString,
        type: "Documentation",
        createdAt: new Date(),
        // Don't store content in frontend to prevent memory issues - backend handles it
      };

      // Upload PDF files to Backend
      if (pdfFiles.length > 0) {
        logger.log(
          `📤 Uploading ${pdfFiles.length} PDF file(s) to Backend...`,
        );
        for (const pdfFile of pdfFiles) {
          try {
            logger.log(
              "📤 Uploading PDF to Backend:",
              pdfFile.name,
              "KB ID:",
              newKB.id,
            );
            const result = await uploadPDFToBackend(pdfFile, newKB.id);
            logger.log("✅ PDF uploaded to Backend:", result);
          } catch (error) {
            logger.error("❌ Failed to upload PDF to Backend:", error);
            toast.error(`Failed to upload file ${pdfFile.name}`, { description: String(error) });
          }
        }
      } else {
        logger.log("ℹ️ No PDF files to upload");
      }

      logger.log(
        "📦 Creating KB with ID:",
        newKB.id,
        "Name:",
        newKB.name,
        "Files:",
        newKB.fileCount,
      );
      try {
        await onCreateKB(newKB);
        logger.log("✅ KB created successfully");

        // Reload KB data from backend to get accurate file count
        logger.log("🔄 Reloading knowledge bases from backend...");
        await reloadKnowledgeBases();
        logger.log("✅ Knowledge bases reloaded");

        toast.success(`Knowledge Base "${kbName}" created successfully!`);
      } catch (error) {
        logger.error("❌ Error in onCreateKB or reloadKnowledgeBases:", error);
        toast.error("Error finalizing Knowledge Base", { description: String(error) });
      }
    }

    setIsProcessing(false);

    // Reset form
    setKbName("");
    setFiles([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-[#5A4635] rounded-lg w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh] relative">
        <div className="absolute top-2 left-2 text-[#5A4635] opacity-30 text-xs">
          ◈
        </div>
        <div className="absolute top-2 right-2 text-[#5A4635] opacity-30 text-xs">
          ◈
        </div>

        <div className="px-6 py-5 border-b border-[#5A4635] flex justify-between items-center bg-[#151515]">
          <h3
            className="text-lg font-bold text-[#E8DCC8] weathered-text tracking-wide"
            style={{ fontFamily: "Merriweather, serif" }}
          >
            {editingKB ? "Edit Knowledge Base" : "Create Knowledge Base"}
          </h3>
          <button
            onClick={onClose}
            className="text-[#9B9380] hover:text-[#9D4EDD] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <label className="text-xs text-[#9B9380] uppercase tracking-widest font-bold">
              Knowledge Base Name
            </label>
            <input
              type="text"
              value={kbName}
              onChange={(e) => setKbName(e.target.value)}
              className="w-full bg-[#0F0F0F] border border-[#5A4635] p-3 text-[#E8DCC8] focus:border-[#9D4EDD] focus:outline-none rounded-sm placeholder-[#4A3B2A] transition-colors"
              placeholder="e.g. Server Rules v1.0"
              style={{ fontFamily: "Noto Serif, serif" }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#9B9380] uppercase tracking-widest font-bold">
              Upload Source Files
            </label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer group
                  ${dragActive
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
              />

              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${dragActive ? "bg-[#9D4EDD]/20 text-[#9D4EDD]" : "bg-[#2A1B35] text-[#9B9380] group-hover:text-[#E8DCC8]"}`}
              >
                <Upload className="w-6 h-6" />
              </div>

              <p className="text-[#E8DCC8] font-medium mb-1 weathered-text">
                Click to browse or drag file here
              </p>
              <p className="text-[#5A4635] text-xs">
                Supported: PDF, DOCX, TXT
              </p>
              <p className="text-[#4A9D4E] text-[10px] mt-1">
                ✅ PDF files will be processed and synced to Database
              </p>
            </div>
          </div>

          {existingFiles.length > 0 && (
            <div className="space-y-2 mb-4 animate-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-[#9B9380] uppercase tracking-widest font-bold">
                  Existing Files (Synced)
                </label>
                <span className="text-xs text-[#9D4EDD]">
                  {existingFiles.length} files
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {existingFiles.map((file, idx) => (
                  <div
                    key={`existing-${idx}`}
                    className="group flex items-center justify-between p-3 bg-[#1F1F1F] border border-[#5A4635]/50 rounded-sm hover:border-[#9D4EDD]/30 transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {file.status === "completed" && (
                        <CheckCircle2 className="w-4 h-4 text-[#4A9D4E] flex-shrink-0" />
                      )}
                      {file.status === "processing" && (
                        <Loader2 className="w-4 h-4 text-[#FFD700] animate-spin flex-shrink-0" />
                      )}
                      {file.status === "failed" && (
                        <AlertCircle className="w-4 h-4 text-[#FF4444] flex-shrink-0" />
                      )}

                      <div className="flex flex-col">
                        <span className="text-sm text-[#E8DCC8] truncate font-sans max-w-[200px]">
                          {file.filename}
                        </span>
                        <span className="text-[10px] text-[#5A4635]">
                          {file.status === "completed"
                            ? "Synced"
                            : file.status === "failed"
                              ? "Failed"
                              : "Processing..."}
                          {file.status === "failed" &&
                            file.error_message &&
                            ` - ${file.error_message.substring(0, 20)}...`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteExistingFile(file.filename)}
                      disabled={deletingFile === file.filename}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-[#5A4635] hover:text-red-400 hover:bg-red-400/10 rounded transition-all disabled:opacity-50"
                      title="Delete file from knowledge base"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-2 animate-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-[#9B9380] uppercase tracking-widest font-bold">
                  Selected Files
                </label>
                <span className="text-xs text-[#9D4EDD]">
                  {files.length} files ready
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-[#1F1F1F] border border-[#5A4635]/50 rounded-sm"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-4 h-4 text-[#9D4EDD] flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-sm text-[#E8DCC8] truncate font-sans max-w-[200px]">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-[#5A4635]">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      className="p-1.5 text-[#5A4635] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-[#151515] border-t border-[#5A4635] flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-sm text-[#9B9380] hover:text-[#E8DCC8] hover:bg-[#2B2B2B] transition-colors font-medium text-sm weathered-text disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isProcessing || !kbName.trim()}
            className="px-5 py-2 rounded-sm bg-[#2A1B35] text-[#9D4EDD] border border-[#9D4EDD]/50 hover:bg-[#9D4EDD] hover:text-[#1a1a1a] transition-all shadow-[0_0_15px_rgba(157,78,221,0.15)] font-bold text-sm tracking-wide weathered-text flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-[#9D4EDD] border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {editingKB ? "Update Base" : "Create Base"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

