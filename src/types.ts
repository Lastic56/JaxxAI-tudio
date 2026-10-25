export type GgufValueType =
  | 'UINT8'
  | 'INT8'
  | 'UINT16'
  | 'INT16'
  | 'UINT32'
  | 'INT32'
  | 'FLOAT32'
  | 'BOOL'
  | 'STRING'
  | 'ARRAY'
  | 'UINT64'
  | 'INT64'
  | 'FLOAT64';

export interface GgufMetadataKV {
  key: string;
  type: GgufValueType;
  value: any;
}

export interface GgufParsedModel {
  fileName: string;
  fileSizeBytes: number;
  magic: string;
  version: number;
  tensorCount: number;
  metadataCount: number;
  architecture: string;
  modelName: string;
  contextLength: number;
  embeddingLength: number;
  blockCount: number; // Layer count
  feedForwardLength: number;
  attentionHeadCount: number;
  attentionHeadCountKv: number;
  quantization: string;
  vocabSize: number;
  ropeFreqBase?: number;
  allMetadata: GgufMetadataKV[];
  estimatedKvCachePerTokenBytes: number;
}

export type QuantType = 'Q2_K' | 'Q3_K_M' | 'Q4_K_M' | 'Q5_K_M' | 'Q6_K' | 'Q8_0' | 'FP16';

export interface QuantInfo {
  name: QuantType;
  bpw: number; // bits per weight
  qualityScore: number; // 1-10
  description: string;
  sizeGb: number;
  vramNeededGb: number;
  fitsInVram: boolean;
  recommended: boolean;
}

export interface GpuPreset {
  id: string;
  name: string;
  vendor: 'NVIDIA' | 'Apple' | 'AMD' | 'Intel' | 'Custom';
  vramGb: number;
  isUnifiedMemory?: boolean;
}

export interface HardwareSpec {
  gpuName: string;
  vramGb: number;
  systemRamGb: number;
  isUnifiedMemory: boolean;
  cpuThreads: number;
}

export interface ModelCatalogEntry {
  id: string;
  name: string;
  family: string;
  parameters: string;
  paramCountBillions: number;
  contextLength: number;
  license: string;
  recommendedQuant: QuantType;
  hfRepo: string;
  description: string;
  useCase: 'Coding' | 'General' | 'Reasoning' | 'Creative' | 'Lightweight';
  sizes: Record<string, string>; // e.g. Q4_K_M: "4.6 GB"
  tags: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: number;
  tokensCount?: number;
  durationMs?: number;
  modelUsed?: string;
}

export interface AttachedFile {
  name: string;
  size: number;
  content: string;
}
