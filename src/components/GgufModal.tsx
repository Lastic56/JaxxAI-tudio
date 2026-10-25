import React, { useState, useRef } from 'react';
import { X, Play, Sliders, ArrowRight } from 'lucide-react';
import { GgufParsedModel } from '../types';
import { parseGgufFile, formatBytes } from '../utils/ggufParser';
import { SAMPLE_GGUF_PRESETS } from '../data/sampleGgufPresets';

interface GgufModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelSelected?: (model: GgufParsedModel) => void;
  onOpenCalculator?: (model: GgufParsedModel) => void;
}

export const GgufModal: React.FC<GgufModalProps> = ({
  isOpen,
  onClose,
  onModelSelected,
  onOpenCalculator,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedModel, setParsedModel] = useState<GgufParsedModel | null>(null);
  const [warningText, setWarningText] = useState(
    'Important: Selecting a GGUF file is not the same as running it. This web app inspects binary headers locally without uploading. The file is not uploaded or sent anywhere.'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.gguf')) {
      setWarningText('That file does not have a .gguf extension. Please choose a GGUF model file.');
      return;
    }

    setSelectedFile(file);
    try {
      const parsed = await parseGgufFile(file);
      setParsedModel(parsed);
      const estimate = file.size * 1.6;
      setWarningText(
        `Selected locally: ${file.name}. The file has not been uploaded. Architecture: ${parsed.architecture}, Layers: ${parsed.blockCount}, Context: ${parsed.contextLength.toLocaleString()} tokens. Estimated working memory can be at least ${formatBytes(
          estimate
        )}, often more with large context windows.`
      );
      if (onModelSelected) onModelSelected(parsed);
    } catch (e: any) {
      setWarningText(`Error reading GGUF: ${e?.message || String(e)}`);
    }
  };

  const handleSelectPreset = (preset: GgufParsedModel) => {
    setParsedModel(preset);
    const estimate = preset.fileSizeBytes * 1.6;
    setWarningText(
      `Selected preset: ${preset.modelName} (${preset.fileName}). Estimated working memory: ~${formatBytes(
        estimate
      )}+ RAM. Architecture: ${preset.architecture}, Layers: ${preset.blockCount}, Context: ${preset.contextLength.toLocaleString()} tokens.`
    );
    if (onModelSelected) onModelSelected(preset);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setParsedModel(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setWarningText(
      'Important: Selecting a GGUF file is not the same as running it. This web app inspects binary headers locally without uploading. The file is not uploaded or sent anywhere.'
    );
  };

  const currentSize = selectedFile
    ? formatBytes(selectedFile.size)
    : parsedModel
    ? formatBytes(parsedModel.fileSizeBytes)
    : 'Not selected';

  const currentMemory = selectedFile
    ? `~${formatBytes(selectedFile.size * 1.6)}+ RAM`
    : parsedModel
    ? `~${formatBytes(parsedModel.fileSizeBytes * 1.6)}+ RAM`
    : 'Unknown';

  const currentFormat = parsedModel
    ? `GGUF v${parsedModel.version} (${parsedModel.quantization})`
    : 'GGUF';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#29314a] bg-[#171920] p-6 shadow-2xl text-[#f4f5f8] space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Use a GGUF model from your PC
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#a0a5b4] hover:text-white hover:bg-[#252a38] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#a0a5b4]">
          Choose a local <strong>.gguf</strong> file. The browser can inspect the file without uploading it.
        </p>

        {/* Quick presets in modal */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-[#828ba3]">Sample GGUFs:</span>
          {SAMPLE_GGUF_PRESETS.slice(0, 3).map((preset) => (
            <button
              key={preset.fileName}
              onClick={() => handleSelectPreset(preset)}
              className="px-2 py-0.5 rounded text-[11px] bg-[#222635] hover:bg-[#2c3347] text-[#b9c2dc] border border-[#353d57] transition-all"
            >
              {preset.modelName.replace(' Instruct', '')}
            </button>
          ))}
        </div>

        {/* .gguf-panel */}
        <div className="rounded-2xl border border-[#3b3159] bg-gradient-to-br from-[#17152b] to-[#101424] p-4 space-y-3.5">
          {/* .gguf-drop */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
              }
            }}
            className="border border-dashed border-[#6557a7] hover:border-[#ff9b35] rounded-xl p-5 text-center bg-[#0d1020] hover:bg-[#12162a] cursor-pointer transition-all space-y-1"
          >
            <div className="text-3xl mb-1">📦</div>
            <strong className="block text-sm text-white font-bold">
              {selectedFile
                ? selectedFile.name
                : parsedModel
                ? parsedModel.fileName
                : 'Choose a GGUF file'}
            </strong>
            <small className="block text-xs text-[#a0a5b4]">
              {selectedFile || parsedModel
                ? 'Selected from your device — not uploaded'
                : 'Click to browse your computer · GGUF format'}
            </small>
            <input
              ref={fileInputRef}
              type="file"
              accept=".gguf,application/octet-stream"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>

          {/* .gguf-meta */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#0d1020] border border-[#2b2e39] rounded-xl p-2.5 text-xs text-[#a0a5b4]">
              <span>File size</span>
              <strong className="block text-white text-sm mt-0.5 font-mono truncate">
                {currentSize}
              </strong>
            </div>

            <div className="bg-[#0d1020] border border-[#2b2e39] rounded-xl p-2.5 text-xs text-[#a0a5b4]">
              <span>Format</span>
              <strong className="block text-[#ffb15c] text-sm mt-0.5 font-mono truncate">
                {currentFormat}
              </strong>
            </div>

            <div className="bg-[#0d1020] border border-[#2b2e39] rounded-xl p-2.5 text-xs text-[#a0a5b4]">
              <span>Device memory</span>
              <strong className="block text-[#78f0c0] text-sm mt-0.5 font-mono truncate">
                {currentMemory}
              </strong>
            </div>

            <div className="bg-[#0d1020] border border-[#2b2e39] rounded-xl p-2.5 text-xs text-[#a0a5b4]">
              <span>File handling</span>
              <strong className="block text-white text-sm mt-0.5">Local only</strong>
            </div>
          </div>

          {/* .gguf-warning */}
          <div className="text-xs text-[#ffca8a] leading-relaxed bg-[#201a14] border border-[#ff9b35]/30 p-3 rounded-xl">
            {warningText}
          </div>

          {/* .gguf-actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] hover:brightness-110 shadow-md shadow-[#ff9b35]/20 transition-all"
            >
              Select GGUF file
            </button>
            <button
              onClick={handleClear}
              className="px-3.5 py-2 rounded-xl text-xs bg-[#171d31] hover:bg-[#222a44] text-[#a0a5b4] hover:text-white border border-[#2b2e39] transition-all"
            >
              Clear selection
            </button>

            {onOpenCalculator && (parsedModel || selectedFile) && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCalculator(parsedModel || SAMPLE_GGUF_PRESETS[0]);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1a213b] hover:bg-[#252f4c] text-[#78f0c0] border border-[#78f0c0]/40 flex items-center gap-1.5 transition-all ml-auto"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Calculate VRAM</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="text-[11px] text-[#8189a3] leading-relaxed">
          For best results, use a quantized GGUF model sized for your available RAM. Large files can use several times their file size in working memory.
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#222631] hover:bg-[#2c3242] text-white border border-[#2b2e39] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
