import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Sliders,
  CheckCircle2,
  AlertOctagon,
  Zap,
  Info,
  Layers,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { GPU_PRESETS, getQuantComparisons, analyzeOffload, RUNTIME_OVERHEAD_GB } from '../utils/hardwareCalculator';
import { GgufParsedModel, QuantType } from '../types';

interface HardwareCalculatorViewProps {
  initialModel?: GgufParsedModel | null;
}

export const HardwareCalculatorView: React.FC<HardwareCalculatorViewProps> = ({ initialModel }) => {
  const [selectedGpuId, setSelectedGpuId] = useState<string>('rtx-3060-12');
  const [customVramGb, setCustomVramGb] = useState<number>(12);
  const [customRamGb, setCustomRamGb] = useState<number>(32);

  // Model parameters
  const [paramCountBillions, setParamCountBillions] = useState<number>(
    initialModel ? (initialModel.fileSizeBytes * 8) / (4.5 * 1e9) : 7.6
  );
  const [totalLayers, setTotalLayers] = useState<number>(initialModel?.blockCount || 28);
  const [contextTokens, setContextTokens] = useState<number>(
    initialModel ? Math.min(initialModel.contextLength, 8192) : 8192
  );
  const [selectedQuant, setSelectedQuant] = useState<QuantType>(
    (initialModel?.quantization as QuantType) || 'Q4_K_M'
  );

  const [headsKv, setHeadsKv] = useState<number>(initialModel?.attentionHeadCountKv || 4);
  const [headDim, setHeadDim] = useState<number>(128);
  const [manualOffloadLayers, setManualOffloadLayers] = useState<number | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const currentGpu = useMemo(() => {
    return GPU_PRESETS.find((g) => g.id === selectedGpuId);
  }, [selectedGpuId]);

  const effectiveVramGb = selectedGpuId === 'custom' ? customVramGb : (currentGpu?.vramGb ?? 12);
  const effectiveRamGb = selectedGpuId === 'custom' ? customRamGb : 32;

  // Comparison matrix for all quants
  const quantComparisons = useMemo(() => {
    return getQuantComparisons(
      paramCountBillions,
      contextTokens,
      totalLayers,
      headsKv,
      headDim,
      effectiveVramGb
    );
  }, [paramCountBillions, contextTokens, totalLayers, headsKv, headDim, effectiveVramGb]);

  // Selected quant info
  const activeQuantInfo = useMemo(() => {
    return quantComparisons.find((q) => q.name === selectedQuant) || quantComparisons[2];
  }, [quantComparisons, selectedQuant]);

  // Offload analysis for selected quant
  const offloadResult = useMemo(() => {
    return analyzeOffload(
      initialModel?.fileName || `model-${selectedQuant}.gguf`,
      activeQuantInfo.sizeGb,
      totalLayers,
      contextTokens,
      headsKv,
      headDim,
      effectiveVramGb,
      effectiveRamGb,
      manualOffloadLayers !== null ? manualOffloadLayers : undefined
    );
  }, [
    initialModel,
    selectedQuant,
    activeQuantInfo.sizeGb,
    totalLayers,
    contextTokens,
    headsKv,
    headDim,
    effectiveVramGb,
    effectiveRamGb,
    manualOffloadLayers,
  ]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#171d31] via-[#101424] to-[#1e172e] border border-[#2b3554]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#ff9b35] uppercase tracking-wider mb-1">
              <Cpu className="w-3.5 h-3.5" /> Hardware Compatibility Engine
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              VRAM Sizer & Layer Offload Calculator
            </h2>
            <p className="text-xs text-[#a5aec7] mt-1 max-w-2xl">
              Determine exact GPU offload feasibility, KV cache memory footprint across context lengths, and expected generation speed for your rig.
            </p>
          </div>

          {initialModel && (
            <div className="px-3.5 py-2 rounded-xl bg-[#1a213b] border border-[#3b476e] text-xs">
              <span className="text-[#828ba3] block">Active Model from Inspector:</span>
              <span className="font-bold text-[#ffb15c]">{initialModel.modelName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Controls (GPU, Model params, Context) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Hardware Selector Card */}
          <div className="p-5 rounded-2xl bg-[#101424] border border-[#29314a] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#ff9b35]" /> Select Your Hardware
            </h3>

            <div>
              <label className="text-xs text-[#a0a5b4] block mb-1.5">GPU / System Preset</label>
              <select
                value={selectedGpuId}
                onChange={(e) => {
                  setSelectedGpuId(e.target.value);
                  setManualOffloadLayers(null);
                }}
                className="w-full bg-[#0c1020] border border-[#252e47] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#ff9b35] outline-none"
              >
                <optgroup label="NVIDIA RTX Series">
                  {GPU_PRESETS.filter((g) => g.vendor === 'NVIDIA').map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Apple Silicon Unified Memory">
                  {GPU_PRESETS.filter((g) => g.vendor === 'Apple').map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="AMD Radeon">
                  {GPU_PRESETS.filter((g) => g.vendor === 'AMD').map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
                <option value="custom">Custom Hardware (Enter VRAM & RAM)</option>
              </select>
            </div>

            {selectedGpuId === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs text-[#a0a5b4] block mb-1">
                    VRAM: <span className="font-bold text-white font-mono">{customVramGb} GB</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={96}
                    step={1}
                    value={customVramGb}
                    onChange={(e) => setCustomVramGb(Number(e.target.value))}
                    className="w-full accent-[#ff9b35]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#a0a5b4] block mb-1">
                    System RAM: <span className="font-bold text-white font-mono">{customRamGb} GB</span>
                  </label>
                  <input
                    type="range"
                    min={4}
                    max={128}
                    step={4}
                    value={customRamGb}
                    onChange={(e) => setCustomRamGb(Number(e.target.value))}
                    className="w-full accent-[#655bff]"
                  />
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#0c1020] border border-[#20273d] flex items-center justify-between text-xs">
              <span className="text-[#828ba3]">Allocatable GPU VRAM:</span>
              <span className="font-mono font-bold text-[#78f0c0] text-sm">{effectiveVramGb} GB</span>
            </div>
          </div>

          {/* Model Parameters Card */}
          <div className="p-5 rounded-2xl bg-[#101424] border border-[#29314a] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#655bff]" /> Model & Context Configuration
            </h3>

            {/* Quick Param Buttons */}
            <div>
              <label className="text-xs text-[#a0a5b4] block mb-1.5">Model Size Preset</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '3B', val: 3.2, layers: 28 },
                  { label: '7B / 8B', val: 7.6, layers: 28 },
                  { label: '14B', val: 14.0, layers: 48 },
                  { label: '32B', val: 32.5, layers: 64 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setParamCountBillions(item.val);
                      setTotalLayers(item.layers);
                      setManualOffloadLayers(null);
                    }}
                    className={`py-1.5 text-xs rounded-lg font-medium transition-all ${
                      Math.abs(paramCountBillions - item.val) < 0.5
                        ? 'bg-[#ff9b35] text-[#1b1005] font-bold'
                        : 'bg-[#171d31] text-[#b9c2dc] hover:bg-[#202944]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Context Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#a0a5b4]">Context Window Tokens:</span>
                <span className="font-mono font-bold text-[#78f0c0]">
                  {contextTokens.toLocaleString()} tokens
                </span>
              </div>
              <input
                type="range"
                min={2048}
                max={131072}
                step={2048}
                value={contextTokens}
                onChange={(e) => setContextTokens(Number(e.target.value))}
                className="w-full accent-[#78f0c0]"
              />
              <div className="flex justify-between text-[10px] text-[#828ba3] font-mono mt-1">
                <span>2k</span>
                <span>8k</span>
                <span>32k</span>
                <span>64k</span>
                <span>128k</span>
              </div>
            </div>

            {/* Quantization selector */}
            <div>
              <label className="text-xs text-[#a0a5b4] block mb-1.5">Selected Quantization Format</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Q3_K_M', 'Q4_K_M', 'Q5_K_M', 'Q8_0'] as QuantType[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setSelectedQuant(q);
                      setManualOffloadLayers(null);
                    }}
                    className={`py-1.5 text-xs rounded-lg font-mono transition-all ${
                      selectedQuant === q
                        ? 'bg-[#ff9b35] text-[#1b1005] font-bold'
                        : 'bg-[#171d31] text-[#b9c2dc] hover:bg-[#202944]'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Offload Gauge, Metrics & Commands */}
        <div className="lg:col-span-7 space-y-5">
          {/* Hardware Sizing Status Card */}
          <div className="p-6 rounded-2xl bg-[#101424] border border-[#29314a] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#828ba3] uppercase font-semibold block">Execution Feasibility</span>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                  {offloadResult.isOom ? (
                    <span className="text-[#ff5555] flex items-center gap-1.5">
                      <AlertOctagon className="w-5 h-5" /> Insufficient Memory (OOM)
                    </span>
                  ) : offloadResult.fitsCompletelyInVram ? (
                    <span className="text-[#78f0c0] flex items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5" /> 100% Full GPU Execution
                    </span>
                  ) : (
                    <span className="text-[#ffb15c] flex items-center gap-1.5">
                      <Zap className="w-5 h-5" /> Hybrid Offload ({offloadResult.offloadPercentage}% on GPU)
                    </span>
                  )}
                </h3>
              </div>

              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#1b2238] text-[#a5aec7] border border-[#29324f]">
                {paramCountBillions.toFixed(1)}B · {selectedQuant}
              </span>
            </div>

            {/* VRAM Breakdown Visual Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#b9c2dc]">
                <span>
                  VRAM Needed: <strong className="text-white">{activeQuantInfo.vramNeededGb} GB</strong> (GPU Has: <strong>{effectiveVramGb} GB</strong>)
                </span>
                <span>
                  Speed: <strong className="text-[#78f0c0]">{offloadResult.projectedSpeed}</strong>
                </span>
              </div>

              {/* Progress stack */}
              <div className="h-4 w-full bg-[#0a0d1a] rounded-full overflow-hidden flex p-0.5 border border-[#242c47]">
                <div
                  style={{
                    width: `${Math.min(100, (activeQuantInfo.sizeGb / Math.max(1, effectiveVramGb)) * 100)}%`,
                  }}
                  className="h-full bg-[#ff9b35] rounded-l-full"
                  title={`Weights: ${activeQuantInfo.sizeGb} GB`}
                />
                <div
                  style={{
                    width: `${Math.min(100, (offloadResult.kvCacheGb / Math.max(1, effectiveVramGb)) * 100)}%`,
                  }}
                  className="h-full bg-[#78f0c0]"
                  title={`KV Cache: ${offloadResult.kvCacheGb} GB`}
                />
                <div
                  style={{
                    width: `${Math.min(100, (RUNTIME_OVERHEAD_GB / Math.max(1, effectiveVramGb)) * 100)}%`,
                  }}
                  className="h-full bg-[#655bff] rounded-r-full"
                  title={`Overhead: ${RUNTIME_OVERHEAD_GB} GB`}
                />
              </div>

              <div className="flex items-center gap-4 text-[11px] text-[#a0a5b4] pt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#ff9b35]" /> Weights ({activeQuantInfo.sizeGb} GB)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#78f0c0]" /> KV Cache ({offloadResult.kvCacheGb} GB)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#655bff]" /> CUDA Buffers (~0.55 GB)
                </span>
              </div>
            </div>

            {/* Interactive Layer Offload Slider */}
            <div className="p-4 rounded-xl bg-[#0c1020] border border-[#232c45] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#ff9b35]" /> Offloaded GPU Layers:
                </span>
                <span className="font-mono text-sm font-bold text-[#ffb15c]">
                  {offloadResult.offloadLayers} / {totalLayers} Layers ({offloadResult.offloadPercentage}%)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={totalLayers}
                value={offloadResult.offloadLayers}
                onChange={(e) => setManualOffloadLayers(Number(e.target.value))}
                className="w-full accent-[#ff9b35]"
              />
              <div className="flex justify-between text-[11px] text-[#828ba3]">
                <span>0 (Pure CPU)</span>
                <span>Auto-calculated optimal: {Math.round((offloadResult.totalLayers * offloadResult.offloadPercentage) / 100)}</span>
                <span>{totalLayers} (100% GPU)</span>
              </div>
            </div>

            {/* Generated llama-cli / llama-server snippet */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#b9c2dc]">
                <span className="font-semibold text-white">Recommended llama-server Command:</span>
                <button
                  onClick={() => copyToClipboard(offloadResult.commandSnippets.llamaServer, 'calc-server')}
                  className="px-2.5 py-1 rounded bg-[#1b2238] hover:bg-[#252f4c] text-white flex items-center gap-1 transition-all text-xs"
                >
                  {copiedCmd === 'calc-server' ? <Check className="w-3 h-3 text-[#78f0c0]" /> : <Copy className="w-3 h-3" />}
                  {copiedCmd === 'calc-server' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-[#080b14] border border-[#20273d] text-xs font-mono text-[#78f0c0] overflow-x-auto">
                {offloadResult.commandSnippets.llamaServer}
              </pre>
            </div>
          </div>

          {/* Quantization Comparison Matrix */}
          <div className="p-5 rounded-2xl bg-[#101424] border border-[#29314a] space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#ff9b35]" /> Quantization Comparison for {effectiveVramGb} GB VRAM
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#171d31] text-[#9da8c5] uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Quant</th>
                    <th className="py-2.5 px-3">File Size</th>
                    <th className="py-2.5 px-3">Total VRAM</th>
                    <th className="py-2.5 px-3">Quality</th>
                    <th className="py-2.5 px-3 text-right">Fits 100%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e253d] font-mono">
                  {quantComparisons.map((q) => (
                    <tr
                      key={q.name}
                      onClick={() => {
                        setSelectedQuant(q.name);
                        setManualOffloadLayers(null);
                      }}
                      className={`cursor-pointer transition-colors ${
                        selectedQuant === q.name
                          ? 'bg-[#ff9b35]/15 text-white'
                          : 'hover:bg-[#151c33]/70 text-[#b9c2dc]'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold flex items-center gap-1.5">
                        {q.name}
                        {q.recommended && (
                          <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-[#ff9b35] text-[#1a1005] font-bold">
                            Sweet Spot
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">{q.sizeGb} GB</td>
                      <td className="py-2.5 px-3">{q.vramNeededGb} GB</td>
                      <td className="py-2.5 px-3 font-sans text-[11px] text-[#78f0c0]">
                        {q.qualityScore}/10
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        {q.fitsInVram ? (
                          <span className="text-[#78f0c0] font-bold">✓ Full Fit</span>
                        ) : (
                          <span className="text-[#ff9b35] text-[11px]">Partial Offload</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
