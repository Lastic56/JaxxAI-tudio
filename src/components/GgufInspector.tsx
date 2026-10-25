import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Search,
  Copy,
  Check,
  Zap,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { GgufParsedModel } from '../types';
import { parseGgufFile, formatBytes } from '../utils/ggufParser';
import { SAMPLE_GGUF_PRESETS } from '../data/sampleGgufPresets';
import { analyzeOffload } from '../utils/hardwareCalculator';

interface GgufInspectorProps {
  onSendToCalculator?: (model: GgufParsedModel) => void;
  initialModel?: GgufParsedModel | null;
}

export const GgufInspector: React.FC<GgufInspectorProps> = ({ onSendToCalculator, initialModel }) => {
  const [model, setModel] = useState<GgufParsedModel>(initialModel || SAMPLE_GGUF_PRESETS[0]);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialModel) {
      setModel(initialModel);
    }
  }, [initialModel]);

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'metadata' | 'commands'>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.gguf')) {
      setError('Selected file does not have a .gguf extension. Please select a valid GGUF model file.');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const parsed = await parseGgufFile(file);
      setModel(parsed);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ff9b35', '#ff4f83', '#655bff', '#78f0c0'],
      });
    } catch (err: any) {
      setError(`Failed to parse GGUF headers: ${err?.message || String(err)}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredMetadata = model.allMetadata.filter((kv) =>
    kv.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(kv.value).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate offload for 12GB VRAM as a default preview
  const offloadPreview12 = analyzeOffload(
    model.fileName,
    model.fileSizeBytes / (1024 * 1024 * 1024),
    model.blockCount,
    Math.min(model.contextLength, 8192),
    model.attentionHeadCountKv,
    model.attentionHeadCount > 0 ? model.embeddingLength / model.attentionHeadCount : 128,
    12,
    32
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#17152b] via-[#101424] to-[#151c33] border border-[#3b3159]">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#ff9b35] uppercase tracking-wider mb-1">
            <Cpu className="w-3.5 h-3.5" /> Client-Side Binary Parser
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            GGUF Model Header & Tensor Inspector
          </h2>
          <p className="text-xs text-[#a5aec7] mt-1 max-w-2xl">
            Inspect model architecture, quantization format, layer counts, and context sizing directly on your device. Zero data is uploaded.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#828ba3] font-medium mr-1">Load Preset:</span>
          {SAMPLE_GGUF_PRESETS.map((preset) => (
            <button
              key={preset.fileName}
              onClick={() => {
                setModel(preset);
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                model.fileName === preset.fileName
                  ? 'bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] font-semibold'
                  : 'bg-[#1a2035] text-[#b9c2dc] border border-[#2e3752] hover:border-[#6557ff]'
              }`}
            >
              {preset.modelName.replace(' Instruct', '')}
            </button>
          ))}
        </div>
      </div>

      {/* File Drop Area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isParsing
            ? 'border-[#ff9b35] bg-[#ff9b35]/5 animate-pulse'
            : 'border-[#4a3f7a]/70 hover:border-[#ff9b35] bg-[#0c0f1f]/80 hover:bg-[#12162e]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".gguf,application/octet-stream"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ff9b35]/20 to-[#655bff]/20 border border-[#ff9b35]/30 flex items-center justify-center text-[#ff9b35] mx-auto mb-3">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">
          {isParsing ? 'Parsing GGUF Headers...' : 'Select or Drop a .gguf File From Your Computer'}
        </h3>
        <p className="text-xs text-[#9da8c5] max-w-md mx-auto">
          Reads the first 8 MB chunk client-side via File API. Supports multi-gigabyte models with near-instantaneous parsing and 0% memory overhead.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161c33] border border-[#2b3554] text-[11px] text-[#78f0c0]">
          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Private · No network request made
        </div>
      </div>

      {/* Error Banner if any */}
      {error && (
        <div className="p-4 rounded-xl bg-[#3d1414] border border-[#ff4d4d]/40 text-[#ff8080] text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Model Overview Card */}
      <div className="rounded-2xl border border-[#29314a] bg-[#101424] overflow-hidden">
        {/* Top Model Info Bar */}
        <div className="p-6 border-b border-[#252d48] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff9b35] via-[#ff4e85] to-[#655bff] flex items-center justify-center text-white font-black text-lg shadow-[0_0_20px_rgba(255,155,53,0.3)]">
              {model.architecture.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {model.modelName}
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#ff9b35]/20 text-[#ffb15c] border border-[#ff9b35]/30">
                  {model.quantization}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#655bff]/20 text-[#b9c2dc] border border-[#655bff]/30">
                  GGUF v{model.version}
                </span>
              </div>
              <div className="text-xs text-[#a0a5b4] mt-0.5 font-mono">
                {model.fileName} · {formatBytes(model.fileSizeBytes)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSendToCalculator && (
              <button
                onClick={() => onSendToCalculator(model)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] hover:brightness-110 flex items-center gap-1.5 shadow-md shadow-[#ff9b35]/20"
              >
                <Sliders className="w-3.5 h-3.5" /> Check My GPU Sizing
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-[#252d48] flex items-center gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-[#ff9b35] text-[#ff9b35]'
                : 'border-transparent text-[#9da8c5] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Architecture & Offload
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'commands'
                ? 'border-[#ff9b35] text-[#ff9b35]'
                : 'border-transparent text-[#9da8c5] hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Run Commands & Ollama
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'metadata'
                ? 'border-[#ff9b35] text-[#ff9b35]'
                : 'border-transparent text-[#9da8c5] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Raw Metadata KV ({model.allMetadata.length})
          </button>
        </div>

        {/* Tab 1: Architecture & Offload */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl bg-[#0c1020] border border-[#242c47]">
                <span className="text-[10px] text-[#828ba3] uppercase font-semibold block">Architecture</span>
                <span className="text-sm font-bold text-white capitalize">{model.architecture}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0c1020] border border-[#242c47]">
                <span className="text-[10px] text-[#828ba3] uppercase font-semibold block">Total Layers</span>
                <span className="text-sm font-bold text-[#ffb15c] font-mono">{model.blockCount} Layers</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0c1020] border border-[#242c47]">
                <span className="text-[10px] text-[#828ba3] uppercase font-semibold block">Context Window</span>
                <span className="text-sm font-bold text-[#78f0c0] font-mono">{model.contextLength.toLocaleString()} Tokens</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0c1020] border border-[#242c47]">
                <span className="text-[10px] text-[#828ba3] uppercase font-semibold block">Embedding Dim</span>
                <span className="text-sm font-bold text-white font-mono">{model.embeddingLength}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0c1020] border border-[#242c47]">
                <span className="text-[10px] text-[#828ba3] uppercase font-semibold block">Attention Heads</span>
                <span className="text-sm font-bold text-white font-mono">
                  {model.attentionHeadCount} <span className="text-xs text-[#828ba3]">({model.attentionHeadCountKv} KV)</span>
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0c1020] border border-[#242c47]">
                <span className="text-[10px] text-[#828ba3] uppercase font-semibold block">Vocabulary Size</span>
                <span className="text-sm font-bold text-white font-mono">{model.vocabSize.toLocaleString()}</span>
              </div>
            </div>

            {/* Offload Analysis Box */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-[#12172b] to-[#0c0f1d] border border-[#2e3759]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#ff9b35]" /> Offload Feasibility on a 12GB VRAM GPU (e.g. RTX 3060 / 4070)
                  </h4>
                  <p className="text-xs text-[#a0a5b4] mt-0.5">
                    Evaluated with 8,192 context tokens and standard FP16 KV cache.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      offloadPreview12.fitsCompletelyInVram
                        ? 'bg-[#78f0c0]/15 text-[#78f0c0] border-[#78f0c0]/30'
                        : 'bg-[#ff9b35]/15 text-[#ff9b35] border-[#ff9b35]/30'
                    }`}
                  >
                    {offloadPreview12.fitsCompletelyInVram ? '100% Full GPU Offload' : 'Hybrid Offload'}
                  </span>
                </div>
              </div>

              {/* Layer Offload Progress Bar */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs text-[#b9c2dc]">
                  <span>GPU Layers: <strong>{offloadPreview12.offloadLayers} / {model.blockCount}</strong> ({offloadPreview12.offloadPercentage}%)</span>
                  <span>Projected Speed: <strong className="text-[#78f0c0]">{offloadPreview12.projectedSpeed}</strong></span>
                </div>
                <div className="h-3 w-full bg-[#1b2238] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff9b35] to-[#78f0c0] rounded-full transition-all duration-500"
                    style={{ width: `${offloadPreview12.offloadPercentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#0a0d1a] border border-[#1e243a]">
                  <span className="text-[#828ba3] block">GPU VRAM Allocated</span>
                  <span className="font-bold text-white font-mono text-sm">{offloadPreview12.gpuVramUsedGb} GB / 12 GB</span>
                </div>
                <div className="p-3 rounded-lg bg-[#0a0d1a] border border-[#1e243a]">
                  <span className="text-[#828ba3] block">KV Cache Size (8k tokens)</span>
                  <span className="font-bold text-[#ffb15c] font-mono text-sm">{offloadPreview12.kvCacheGb} GB</span>
                </div>
                <div className="p-3 rounded-lg bg-[#0a0d1a] border border-[#1e243a]">
                  <span className="text-[#828ba3] block">CLI Layer Argument</span>
                  <span className="font-bold text-[#78f0c0] font-mono text-sm">-ngl {offloadPreview12.offloadLayers}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Commands */}
        {activeTab === 'commands' && (
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Executable Terminal Commands</h4>
              <p className="text-xs text-[#a0a5b4]">
                Copy these pre-configured commands to run this GGUF file in llama.cpp, llama-server, or Ollama.
              </p>
            </div>

            {/* llama-server command */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#b9c2dc]">
                <span className="font-semibold text-white">llama-server (OpenAI Compatible API)</span>
                <button
                  onClick={() => copyToClipboard(offloadPreview12.commandSnippets.llamaServer, 'llamaServer')}
                  className="px-2.5 py-1 rounded bg-[#1b2238] hover:bg-[#252f4c] text-white flex items-center gap-1 transition-all"
                >
                  {copiedKey === 'llamaServer' ? <Check className="w-3 h-3 text-[#78f0c0]" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'llamaServer' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-[#080b14] border border-[#232b45] text-xs font-mono text-[#ffb15c] overflow-x-auto">
                {offloadPreview12.commandSnippets.llamaServer}
              </pre>
            </div>

            {/* llama-cli command */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#b9c2dc]">
                <span className="font-semibold text-white">llama-cli (Interactive Terminal Chat)</span>
                <button
                  onClick={() => copyToClipboard(offloadPreview12.commandSnippets.llamaCli, 'llamaCli')}
                  className="px-2.5 py-1 rounded bg-[#1b2238] hover:bg-[#252f4c] text-white flex items-center gap-1 transition-all"
                >
                  {copiedKey === 'llamaCli' ? <Check className="w-3 h-3 text-[#78f0c0]" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'llamaCli' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-[#080b14] border border-[#232b45] text-xs font-mono text-[#78f0c0] overflow-x-auto">
                {offloadPreview12.commandSnippets.llamaCli}
              </pre>
            </div>

            {/* Ollama Modelfile */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#b9c2dc]">
                <span className="font-semibold text-white">Ollama Modelfile</span>
                <button
                  onClick={() => copyToClipboard(offloadPreview12.commandSnippets.ollamaModelfile, 'ollama')}
                  className="px-2.5 py-1 rounded bg-[#1b2238] hover:bg-[#252f4c] text-white flex items-center gap-1 transition-all"
                >
                  {copiedKey === 'ollama' ? <Check className="w-3 h-3 text-[#78f0c0]" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'ollama' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-[#080b14] border border-[#232b45] text-xs font-mono text-[#b8b9ff] overflow-x-auto whitespace-pre">
                {offloadPreview12.commandSnippets.ollamaModelfile}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: Metadata Key-Value */}
        {activeTab === 'metadata' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#828ba3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter keys (e.g. rope, context, head, tokenizer)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0c1020] border border-[#242c47] rounded-xl text-xs text-white placeholder-[#828ba3] focus:border-[#ff9b35] outline-none"
                />
              </div>
              <span className="text-xs text-[#828ba3] whitespace-nowrap">
                Showing {filteredMetadata.length} of {model.allMetadata.length} keys
              </span>
            </div>

            <div className="rounded-xl border border-[#252d48] overflow-hidden max-h-[460px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#171d31] text-[#9da8c5] uppercase tracking-wider text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Key</th>
                    <th className="py-2.5 px-4 font-semibold w-24">Type</th>
                    <th className="py-2.5 px-4 font-semibold">Value</th>
                    <th className="py-2.5 px-4 font-semibold w-16 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e253d] font-mono">
                  {filteredMetadata.map((kv, i) => (
                    <tr key={i} className="hover:bg-[#151c33]/70 transition-colors">
                      <td className="py-2.5 px-4 text-[#dfe5ff] font-medium break-all">{kv.key}</td>
                      <td className="py-2.5 px-4 text-[#ff9b35] text-[11px]">{kv.type}</td>
                      <td className="py-2.5 px-4 text-[#78f0c0] text-[11px] break-all max-w-md">
                        {typeof kv.value === 'object' && kv.value !== null
                          ? JSON.stringify(kv.value)
                          : String(kv.value)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => copyToClipboard(String(kv.value), `row-${i}`)}
                          className="p-1 rounded hover:bg-[#252d47] text-[#a5aec7] hover:text-white"
                          title="Copy value"
                        >
                          {copiedKey === `row-${i}` ? <Check className="w-3.5 h-3.5 text-[#78f0c0]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMetadata.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-[#828ba3]">
                        No matching metadata keys found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
