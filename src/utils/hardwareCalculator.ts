import { GpuPreset, QuantInfo, QuantType } from '../types';

export const GPU_PRESETS: GpuPreset[] = [
  { id: 'rtx-4090', name: 'NVIDIA RTX 4090 (24 GB)', vendor: 'NVIDIA', vramGb: 24 },
  { id: 'rtx-4080', name: 'NVIDIA RTX 4080 (16 GB)', vendor: 'NVIDIA', vramGb: 16 },
  { id: 'rtx-4070', name: 'NVIDIA RTX 4070 / 4070 Ti (12 GB)', vendor: 'NVIDIA', vramGb: 12 },
  { id: 'rtx-3060-12', name: 'NVIDIA RTX 3060 (12 GB)', vendor: 'NVIDIA', vramGb: 12 },
  { id: 'rtx-4060-8', name: 'NVIDIA RTX 4060 / 3070 (8 GB)', vendor: 'NVIDIA', vramGb: 8 },
  { id: 'rtx-3080-10', name: 'NVIDIA RTX 3080 (10 GB)', vendor: 'NVIDIA', vramGb: 10 },
  { id: 'rtx-2060-6', name: 'NVIDIA RTX 2060 / GTX 1660 (6 GB)', vendor: 'NVIDIA', vramGb: 6 },
  { id: 'tesla-t4', name: 'NVIDIA Tesla T4 (16 GB)', vendor: 'NVIDIA', vramGb: 16 },
  { id: 'a100-80', name: 'NVIDIA A100 (80 GB)', vendor: 'NVIDIA', vramGb: 80 },
  { id: 'mac-m-16', name: 'Apple Silicon M1/M2/M3/M4 (16 GB Unified)', vendor: 'Apple', vramGb: 11.5, isUnifiedMemory: true },
  { id: 'mac-m-24', name: 'Apple Silicon (24 GB Unified)', vendor: 'Apple', vramGb: 18, isUnifiedMemory: true },
  { id: 'mac-m-36', name: 'Apple Silicon Pro (36 GB Unified)', vendor: 'Apple', vramGb: 28, isUnifiedMemory: true },
  { id: 'mac-m-48', name: 'Apple Silicon Max (48 GB Unified)', vendor: 'Apple', vramGb: 38, isUnifiedMemory: true },
  { id: 'mac-m-64', name: 'Apple Silicon Max (64 GB Unified)', vendor: 'Apple', vramGb: 50, isUnifiedMemory: true },
  { id: 'mac-m-128', name: 'Apple Silicon Max/Ultra (128 GB Unified)', vendor: 'Apple', vramGb: 104, isUnifiedMemory: true },
  { id: 'amd-7900xtx', name: 'AMD Radeon RX 7900 XTX (24 GB)', vendor: 'AMD', vramGb: 24 },
  { id: 'amd-7800xt', name: 'AMD Radeon RX 7800 XT (16 GB)', vendor: 'AMD', vramGb: 16 },
  { id: 'amd-6700xt', name: 'AMD Radeon RX 6700 XT (12 GB)', vendor: 'AMD', vramGb: 12 },
  { id: 'amd-6600', name: 'AMD Radeon RX 6600 (8 GB)', vendor: 'AMD', vramGb: 8 },
  { id: 'cpu-only', name: 'CPU Only (RAM fallback)', vendor: 'Intel', vramGb: 0 },
];

export const QUANT_SPECS: Record<QuantType, { bpw: number; quality: number; desc: string }> = {
  Q2_K: { bpw: 2.85, quality: 4.5, desc: 'Extreme compression. Noticeable perplexity degradation, use only under strict memory limits.' },
  Q3_K_M: { bpw: 3.45, quality: 7.0, desc: 'Moderate compression. Good coherence, minor quality drop in nuanced reasoning.' },
  Q4_K_M: { bpw: 4.50, quality: 9.0, desc: 'Industry sweet spot! Balanced weight distribution with minimal quality loss.' },
  Q5_K_M: { bpw: 5.50, quality: 9.6, desc: 'High fidelity. Retains over 99% original perplexity at modest footprint.' },
  Q6_K: { bpw: 6.60, quality: 9.85, desc: 'Near lossless. Indistinguishable from FP16 for almost all generation tasks.' },
  Q8_0: { bpw: 8.50, quality: 9.98, desc: 'Full integer precision. Maximum accuracy, ideal if you have ample VRAM.' },
  FP16: { bpw: 16.0, quality: 10.0, desc: 'Original unquantized FP16 weights. Highest possible benchmark accuracy.' },
};

export const RUNTIME_OVERHEAD_GB = 0.55; // CUDA/Metal context & buffers

export function calculateKvCacheGb(
  contextTokens: number,
  layers: number,
  headsKv: number,
  headDim: number,
  precisionBytes: number = 2 // FP16 KV cache
): number {
  // 2 (key & value) * layers * heads_kv * headDim * contextTokens * bytes
  const bytes = 2 * layers * headsKv * headDim * contextTokens * precisionBytes;
  return bytes / (1024 * 1024 * 1024);
}

export function calculateWeightsGb(paramCountBillions: number, quant: QuantType): number {
  const bpw = QUANT_SPECS[quant]?.bpw || 4.5;
  // (parameters * bits) / 8 bytes / 1024^3
  const bytes = (paramCountBillions * 1e9 * bpw) / 8;
  return bytes / (1024 * 1024 * 1024);
}

export function getQuantComparisons(
  paramCountBillions: number,
  contextTokens: number,
  layers: number,
  headsKv: number,
  headDim: number,
  userVramGb: number
): QuantInfo[] {
  const kvCacheGb = calculateKvCacheGb(contextTokens, layers, headsKv, headDim);
  const quants: QuantType[] = ['Q2_K', 'Q3_K_M', 'Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'];

  return quants.map((q) => {
    const sizeGb = calculateWeightsGb(paramCountBillions, q);
    const vramNeededGb = sizeGb + kvCacheGb + RUNTIME_OVERHEAD_GB;
    const fitsInVram = userVramGb > 0 && vramNeededGb <= userVramGb;
    const isRecommended = q === 'Q4_K_M';

    return {
      name: q,
      bpw: QUANT_SPECS[q].bpw,
      qualityScore: QUANT_SPECS[q].quality,
      description: QUANT_SPECS[q].desc,
      sizeGb: Number(sizeGb.toFixed(2)),
      vramNeededGb: Number(vramNeededGb.toFixed(2)),
      fitsInVram,
      recommended: isRecommended,
    };
  });
}

export interface OffloadAnalysis {
  totalLayers: number;
  offloadLayers: number;
  offloadPercentage: number;
  gpuVramUsedGb: number;
  systemRamUsedGb: number;
  kvCacheGb: number;
  fitsCompletelyInVram: boolean;
  fitsWithOffload: boolean;
  isOom: boolean;
  projectedSpeed: string;
  speedRating: 'blazing' | 'moderate' | 'slow' | 'unsupported';
  commandSnippets: {
    llamaCli: string;
    llamaServer: string;
    ollamaModelfile: string;
  };
}

export function analyzeOffload(
  modelFileName: string,
  modelWeightsGb: number,
  totalLayers: number,
  contextTokens: number,
  headsKv: number,
  headDim: number,
  userVramGb: number,
  userRamGb: number,
  manualOffloadOverride?: number
): OffloadAnalysis {
  const kvCacheGb = calculateKvCacheGb(contextTokens, totalLayers, headsKv, headDim);
  const totalModelAndKv = modelWeightsGb + kvCacheGb + RUNTIME_OVERHEAD_GB;

  // Layer weight estimate
  const layerWeightGb = modelWeightsGb / Math.max(1, totalLayers);

  let offloadLayers: number;

  if (manualOffloadOverride !== undefined) {
    offloadLayers = Math.max(0, Math.min(totalLayers, manualOffloadOverride));
  } else if (userVramGb <= 0) {
    offloadLayers = 0;
  } else if (totalModelAndKv <= userVramGb) {
    offloadLayers = totalLayers;
  } else {
    // How much VRAM is left for weights after KV Cache and CUDA overhead
    const vramForWeights = Math.max(0, userVramGb - (kvCacheGb + RUNTIME_OVERHEAD_GB));
    offloadLayers = Math.max(0, Math.min(totalLayers, Math.floor(vramForWeights / layerWeightGb)));
  }

  const offloadPercentage = Math.round((offloadLayers / Math.max(1, totalLayers)) * 100);
  const weightsOnGpu = offloadLayers * layerWeightGb;
  const weightsOnCpu = (totalLayers - offloadLayers) * layerWeightGb;

  const gpuVramUsedGb = userVramGb > 0 && offloadLayers > 0
    ? Number((weightsOnGpu + kvCacheGb + RUNTIME_OVERHEAD_GB).toFixed(2))
    : 0;

  const systemRamUsedGb = Number((weightsOnCpu + (offloadLayers === 0 ? kvCacheGb : 0) + 1.2).toFixed(2));

  const fitsCompletelyInVram = totalModelAndKv <= userVramGb;
  const isVramOom = gpuVramUsedGb > userVramGb && userVramGb > 0;
  const isRamOom = systemRamUsedGb > userRamGb;
  const isOom = isVramOom || isRamOom;
  const fitsWithOffload = !isOom;

  let projectedSpeed = '75 - 110 tok/sec (Full GPU execution)';
  let speedRating: OffloadAnalysis['speedRating'] = 'blazing';

  if (offloadPercentage === 100) {
    projectedSpeed = '75 - 110 tok/sec (Full GPU execution)';
    speedRating = 'blazing';
  } else if (offloadPercentage > 60) {
    projectedSpeed = '25 - 45 tok/sec (Hybrid GPU/CPU offload)';
    speedRating = 'moderate';
  } else if (offloadPercentage > 0) {
    projectedSpeed = '12 - 25 tok/sec (Partial offload, PCIe bound)';
    speedRating = 'moderate';
  } else {
    projectedSpeed = '3 - 8 tok/sec (Pure CPU / RAM execution)';
    speedRating = 'slow';
  }

  if (isOom) {
    projectedSpeed = 'Out of Memory (OOM)! Requires more VRAM or RAM.';
    speedRating = 'unsupported';
  }

  const safeModelName = modelFileName || 'model.gguf';

  const llamaCli = `llama-cli -m ${safeModelName} -c ${contextTokens} -ngl ${offloadLayers} -p "You are a helpful assistant."`;
  const llamaServer = `llama-server -m ${safeModelName} -c ${contextTokens} -ngl ${offloadLayers} --port 8080`;
  const ollamaModelfile = `FROM ./${safeModelName}\nPARAMETER num_ctx ${contextTokens}\nPARAMETER num_gpu ${offloadLayers}\nPARAMETER temperature 0.7\nSYSTEM "You are a private local assistant."`;

  return {
    totalLayers,
    offloadLayers,
    offloadPercentage,
    gpuVramUsedGb,
    systemRamUsedGb,
    kvCacheGb: Number(kvCacheGb.toFixed(2)),
    fitsCompletelyInVram,
    fitsWithOffload,
    isOom,
    projectedSpeed,
    speedRating,
    commandSnippets: {
      llamaCli,
      llamaServer,
      ollamaModelfile,
    },
  };
}
