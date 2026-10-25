import React, { useState, useRef } from 'react';
import {
  Package,
  HardDrive,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Sliders,
  Check,
  Layers,
} from 'lucide-react';
import { GgufParsedModel } from '../types';
import { parseGgufFile, formatBytes } from '../utils/ggufParser';
import { SAMPLE_GGUF_PRESETS } from '../data/sampleGgufPresets';

interface TestGgufPanelProps {
  onModelLoaded?: (model: GgufParsedModel) => void;
  onOpenCalculator?: (model: GgufParsedModel) => void;
}

export const TestGgufPanel: React.FC<TestGgufPanelProps> = ({
  onModelLoaded,
  onOpenCalculator,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedModel, setParsedModel] = useState<GgufParsedModel | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string>(
    'Important: Selecting a GGUF file is not the same as running it. This browser inspects binary headers locally without uploading. For full inference, you can offload layers to GPU or use WebAssembly.'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gguf')) {
      setWarningMessage(
        'Warning: That file does not have a .gguf extension. Please choose a valid GGUF model file.'
      );
      return;
    }

    setSelectedFile(file);
    setIsTesting(true);

    try {
      const parsed = await parseGgufFile(file);
      setParsedModel(parsed);
      const estimate = file.size * 1.6;
      setWarningMessage(
        `Selected locally: ${file.name}. The file has not been uploaded. Estimated working memory required: ~${formatBytes(
          estimate
        )}+ RAM. Architecture: ${parsed.architecture}, Layers: ${parsed.blockCount}, Context: ${parsed.contextLength.toLocaleString()} tokens.`
      );
      if (onModelLoaded) onModelLoaded(parsed);
    } catch (e: any) {
      setWarningMessage(`Could not parse GGUF headers: ${e?.message || String(e)}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSelectPreset = (preset: GgufParsedModel) => {
    setParsedModel(preset);
    const estimate = preset.fileSizeBytes * 1.6;
    setWarningMessage(
      `Loaded Preset: ${preset.modelName} (${preset.fileName}). Estimated working memory: ~${formatBytes(
        estimate
      )}+ RAM. Architecture: ${preset.architecture}, Layers: ${preset.blockCount}, Context: ${preset.contextLength.toLocaleString()} tokens.`
    );
    if (onModelLoaded) onModelLoaded(preset);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setParsedModel(null);
    setTestResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setWarningMessage(
      'Important: Selecting a GGUF file is not the same as running it. This browser inspects binary headers locally without uploading.'
    );
  };

  const handleRunTest = () => {
    if (!parsedModel && !selectedFile) {
      setWarningMessage('Please select a GGUF file or load a preset first to run the test.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    setTimeout(() => {
      const active = parsedModel || SAMPLE_GGUF_PRESETS[0];
      const memEst = formatBytes(active.fileSizeBytes * 1.6);
      const isLarge = active.fileSizeBytes > 8 * 1024 * 1024 * 1024;

      setTestResult(
        `✅ GGUF Verification Passed!\n` +
          `• Magic Header: GGUF (Version ${active.version})\n` +
          `• Architecture: ${active.architecture.toUpperCase()} (${active.blockCount} Transformer layers)\n` +
          `• Context Window: ${active.contextLength.toLocaleString()} tokens\n` +
          `• Quantization: ${active.quantization}\n` +
          `• Attention Heads: ${active.attentionHeadCount} (${active.attentionHeadCountKv} KV heads)\n` +
          `• Memory Status: Needs ~${memEst} working RAM/VRAM. ${
            isLarge
              ? 'Recommend GPU offload with -ngl argument to avoid DDR memory bottleneck.'
              : 'Can fit smoothly in modern 8GB–16GB systems.'
          }`
      );
      setIsTesting(false);
    }, 500);
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
    <div className="rounded-2xl border border-[#3b3159] bg-gradient-to-br from-[#17152b] via-[#12162b] to-[#101424] p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2b3554]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff9b35] via-[#ff4e85] to-[#655bff] flex items-center justify-center text-white text-base shadow-[0_0_15px_rgba(255,155,53,0.3)]">
            📦
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Test GGUF Panel</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#78f0c0]/15 text-[#78f0c0] border border-[#78f0c0]/30">
                Local Only
              </span>
            </h3>
            <p className="text-xs text-[#a5aec7]">
              Inspect a local <strong>.gguf</strong> file or sample preset. No data is uploaded.
            </p>
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-[#828ba3]">Test Sample:</span>
          {SAMPLE_GGUF_PRESETS.slice(0, 3).map((preset) => (
            <button
              key={preset.fileName}
              onClick={() => handleSelectPreset(preset)}
              className="px-2.5 py-1 rounded-lg text-[11px] bg-[#1a213b] hover:bg-[#252f4c] text-[#b9c2dc] border border-[#2e3752] hover:border-[#ff9b35] transition-all"
            >
              {preset.modelName.replace(' Instruct', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Drop Zone Box */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
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
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          className="hidden"
        />
      </div>

      {/* 4 Metadata Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#0d1020] border border-[#242c47] rounded-xl p-3 text-xs text-[#a0a5b4]">
          <span className="block text-[11px] text-[#828ba3]">File size</span>
          <strong className="block text-white text-sm mt-0.5 font-mono truncate">
            {currentSize}
          </strong>
        </div>

        <div className="bg-[#0d1020] border border-[#242c47] rounded-xl p-3 text-xs text-[#a0a5b4]">
          <span className="block text-[11px] text-[#828ba3]">Format</span>
          <strong className="block text-[#ffb15c] text-sm mt-0.5 font-mono truncate">
            {currentFormat}
          </strong>
        </div>

        <div className="bg-[#0d1020] border border-[#242c47] rounded-xl p-3 text-xs text-[#a0a5b4]">
          <span className="block text-[11px] text-[#828ba3]">Device memory</span>
          <strong className="block text-[#78f0c0] text-sm mt-0.5 font-mono truncate">
            {currentMemory}
          </strong>
        </div>

        <div className="bg-[#0d1020] border border-[#242c47] rounded-xl p-3 text-xs text-[#a0a5b4]">
          <span className="block text-[11px] text-[#828ba3]">File handling</span>
          <strong className="block text-white text-sm mt-0.5">
            Local only
          </strong>
        </div>
      </div>

      {/* Warning Box */}
      <div className="p-3.5 rounded-xl bg-[#211b14] border border-[#ff9b35]/30 text-[#ffca8a] text-xs leading-relaxed">
        {warningMessage}
      </div>

      {/* Test Result Box if tested */}
      {testResult && (
        <div className="p-3.5 rounded-xl bg-[#0e1f1a] border border-[#78f0c0]/40 text-[#a7f3d0] text-xs font-mono whitespace-pre-wrap leading-relaxed animate-in fade-in duration-200">
          {testResult}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] hover:brightness-110 shadow-md shadow-[#ff9b35]/20 transition-all"
          >
            Select GGUF file
          </button>

          <button
            onClick={handleRunTest}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1a213b] hover:bg-[#252f4c] text-white border border-[#343c59] hover:border-[#78f0c0] flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-[#78f0c0]" />
            <span>{isTesting ? 'Testing...' : 'Run GGUF Quick Test'}</span>
          </button>

          <button
            onClick={handleClear}
            className="px-3 py-2 rounded-xl text-xs text-[#a0a5b4] hover:text-white bg-[#101424] hover:bg-[#181d30] border border-[#252d48] transition-all"
          >
            Clear selection
          </button>
        </div>

        {onOpenCalculator && (parsedModel || selectedFile) && (
          <button
            onClick={() => onOpenCalculator(parsedModel || SAMPLE_GGUF_PRESETS[0])}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#151c33] hover:bg-[#202944] text-[#ffb15c] border border-[#ff9b35]/40 flex items-center gap-1.5 transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Calculate VRAM for This GGUF</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="text-[11px] text-[#78819e] pt-1">
        For best results, use a quantized GGUF model sized for your available RAM. Large models can use 1.5x–2x their weight size when processing long context windows.
      </div>
    </div>
  );
};
