import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  ExternalLink,
  Layers,
  Copy,
  Check,
  Cpu,
  Sparkles,
  HardDrive,
  Terminal,
  Download,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  FileCode,
  Sliders,
  RefreshCw,
  X,
  Play,
  StopCircle,
  Award,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { CURATED_MODELS } from '../data/modelCatalog';
import { ModelCatalogEntry, GgufParsedModel } from '../types';
import { parseGgufFile, formatBytes } from '../utils/ggufParser';
import {
  loadWasmModel,
  runWasmInference,
  unloadWasmModel,
  isModelLoadedInWasm,
  getLoadedWasmModelId,
  benchmarkWasmModel,
  WasmProgressCallback,
  WasmBenchmarkResult,
} from '../utils/wasmRunner';

interface ModelLibraryViewProps {
  onSelectForCalculator?: (model: ModelCatalogEntry) => void;
  onInspectGgufModel?: (model: GgufParsedModel) => void;
}

const WASM_READY_MODELS = [
  {
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    name: 'Qwen 2.5 · 0.5B Instruct',
    size: '~350 MB',
    memory: '~1 GB RAM',
    desc: 'Top compact multilingual instruction model. Fast download, strong reasoning for its size.',
    recommended: true,
  },
  {
    id: 'onnx-community/SmolLM2-360M-Instruct',
    name: 'SmolLM2 · 360M Instruct',
    size: '~220 MB',
    memory: '~700 MB RAM',
    desc: 'Smallest and fastest starter model. Great for quick tests on low-spec laptops.',
    recommended: false,
  },
  {
    id: 'onnx-community/TinyLlama-1.1B-Chat-v1.0',
    name: 'TinyLlama · 1.1B Chat',
    size: '~650 MB',
    memory: '~2 GB RAM',
    desc: 'Community favorite 1.1B parameter chat model with solid conversational banter.',
    recommended: false,
  },
];

export const ModelLibraryView: React.FC<ModelLibraryViewProps> = ({
  onSelectForCalculator,
  onInspectGgufModel,
}) => {
  // Navigation tabs under Model Library
  const [activeSubTab, setActiveSubTab] = useState<'wasm-test' | 'uploaded-checkpoints' | 'curated-hub'>('wasm-test');

  // --- Sub-Tab 1: WASM Model Runner & Tester ---
  const [selectedWasmModelId, setSelectedWasmModelId] = useState<string>(WASM_READY_MODELS[0].id);
  const [customRepoInput, setCustomRepoInput] = useState<string>('');
  const [wasmBackend, setWasmBackend] = useState<'wasm' | 'webgpu'>('wasm');
  const [isLoadingWasm, setIsLoadingWasm] = useState<boolean>(false);
  const [wasmStatusText, setWasmStatusText] = useState<string>('Model not loaded in memory');
  const [wasmProgressPercent, setWasmProgressPercent] = useState<number>(0);
  const [wasmLoadError, setWasmLoadError] = useState<string | null>(null);
  const [isWasmLoaded, setIsWasmLoaded] = useState<boolean>(isModelLoadedInWasm());

  // Interactive Test prompt
  const [wasmPrompt, setWasmPrompt] = useState<string>('Explain WebAssembly in simple terms.');
  const [wasmOutput, setWasmOutput] = useState<string>('');
  const [isGeneratingWasm, setIsGeneratingWasm] = useState<boolean>(false);
  const [wasmGenStats, setWasmGenStats] = useState<{ tokensCount: number; durationMs: number; tokPerSec: number } | null>(null);

  // Benchmarking / "Is it good?" test
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchmarkStep, setBenchmarkStep] = useState<string>('');
  const [benchmarkProgress, setBenchmarkProgress] = useState<number>(0);
  const [benchmarkResult, setBenchmarkResult] = useState<WasmBenchmarkResult | null>(null);

  // --- Sub-Tab 2: Uploaded Checkpoints & Local GGUF ---
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [parsedLocalModel, setParsedLocalModel] = useState<GgufParsedModel | null>(null);
  const [isParsingLocal, setIsParsingLocal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Ollama Config State
  const [ollamaModelName, setOllamaModelName] = useState<string>('');
  const [ollamaContext, setOllamaContext] = useState<number>(8192);
  const [ollamaTemperature, setOllamaTemperature] = useState<number>(0.7);
  const [ollamaNumGpu, setOllamaNumGpu] = useState<number>(99);
  const [ollamaSystemPrompt, setOllamaSystemPrompt] = useState<string>(
    'You are a helpful, private local assistant running directly on this computer.'
  );

  // Ollama Local Status Probe
  const [ollamaStatus, setOllamaStatus] = useState<'unknown' | 'running' | 'offline'>('unknown');
  const [ollamaInstalledModels, setOllamaInstalledModels] = useState<string[]>([]);
  const [checkingOllama, setCheckingOllama] = useState(false);

  // --- Sub-Tab 3: Curated Hub Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUseCase, setSelectedUseCase] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const localFileInputRef = useRef<HTMLInputElement>(null);

  // Check Ollama service on localhost
  const checkOllamaConnection = async () => {
    setCheckingOllama(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('http://localhost:11434/api/tags', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const names = data.models?.map((m: any) => m.name) || [];
        setOllamaInstalledModels(names);
        setOllamaStatus('running');
      } else {
        setOllamaStatus('offline');
      }
    } catch {
      setOllamaStatus('offline');
    } finally {
      setCheckingOllama(false);
    }
  };

  useEffect(() => {
    checkOllamaConnection();
  }, []);

  // ----------------------------------------------------------------
  // WASM Handlers
  // ----------------------------------------------------------------
  const handleLoadWasmModel = async (modelIdToLoad?: string) => {
    const targetModelId = modelIdToLoad || (customRepoInput.trim() || selectedWasmModelId);
    if (!targetModelId) return;

    setIsLoadingWasm(true);
    setWasmLoadError(null);
    setWasmStatusText('Preparing WebAssembly runtime...');
    setWasmProgressPercent(5);

    try {
      await loadWasmModel(targetModelId, wasmBackend, (info: WasmProgressCallback) => {
        if (info.progress !== undefined) {
          setWasmProgressPercent(info.progress);
        }
        if (info.status === 'download') {
          setWasmStatusText(`Downloading ${info.file || 'model files'}...`);
        } else if (info.status === 'initiate') {
          setWasmStatusText(`Preparing ${info.file || 'WASM runtime'}...`);
        } else if (info.status === 'done') {
          setWasmStatusText(`Cached ${info.file || 'weights'} in browser`);
        } else {
          setWasmStatusText(info.status);
        }
      });

      setIsWasmLoaded(true);
      setWasmStatusText(`Model active in memory (${targetModelId.split('/').pop()})`);
      setWasmProgressPercent(100);
    } catch (err: any) {
      setWasmLoadError(err?.message || String(err));
      setWasmStatusText('Failed to load into memory');
      setIsWasmLoaded(false);
    } finally {
      setIsLoadingWasm(false);
    }
  };

  const handleUnloadWasmModel = () => {
    unloadWasmModel();
    setIsWasmLoaded(false);
    setWasmStatusText('Model unloaded from active memory');
    setWasmProgressPercent(0);
    setWasmGenStats(null);
    setBenchmarkResult(null);
  };

  const handleRunWasmInference = async () => {
    const prompt = wasmPrompt.trim();
    if (!prompt || isGeneratingWasm) return;

    if (!isWasmLoaded) {
      setWasmLoadError('Load the model into memory first using "Load Model into Memory".');
      return;
    }

    setIsGeneratingWasm(true);
    setWasmOutput('Generating response in browser WASM...');
    setWasmGenStats(null);

    try {
      const res = await runWasmInference(prompt, {
        maxNewTokens: 256,
        temperature: 0.7,
      });

      setWasmOutput(res.text);
      setWasmGenStats({
        tokensCount: res.tokensCount,
        durationMs: res.durationMs,
        tokPerSec: res.tokPerSec,
      });
    } catch (err: any) {
      setWasmOutput(`Generation error: ${err?.message || String(err)}`);
    } finally {
      setIsGeneratingWasm(false);
    }
  };

  const handleRunBenchmark = async () => {
    if (!isWasmLoaded) {
      setWasmLoadError('Please load the model into memory first to evaluate it.');
      return;
    }

    setIsBenchmarking(true);
    setBenchmarkResult(null);
    setBenchmarkProgress(10);
    setBenchmarkStep('Starting test suite...');

    try {
      const result = await benchmarkWasmModel((step, pct) => {
        setBenchmarkStep(step);
        setBenchmarkProgress(pct);
      });
      setBenchmarkResult(result);
    } catch (err: any) {
      setWasmLoadError(`Benchmark error: ${err?.message || String(err)}`);
    } finally {
      setIsBenchmarking(false);
    }
  };

  // ----------------------------------------------------------------
  // Local GGUF Picker Handlers
  // ----------------------------------------------------------------
  const handlePickLocalFile = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.gguf')) {
      setLocalError('The chosen file does not have a .gguf extension. Please choose a GGUF format file.');
      return;
    }

    setLocalFile(file);
    setLocalError(null);
    setIsParsingLocal(true);

    const cleanName = file.name
      .toLowerCase()
      .replace(/\.gguf$/i, '')
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/--+/g, '-')
      .slice(0, 32);
    setOllamaModelName(cleanName || 'my-local-model');

    try {
      const parsed = await parseGgufFile(file);
      setParsedLocalModel(parsed);
      if (parsed.contextLength) setOllamaContext(Math.min(parsed.contextLength, 8192));
      if (parsed.blockCount) setOllamaNumGpu(parsed.blockCount);
    } catch (err: any) {
      console.warn('Fallback to basic GGUF metadata', err);
      setParsedLocalModel({
        fileName: file.name,
        fileSizeBytes: file.size,
        magic: 'GGUF',
        version: 3,
        tensorCount: 0,
        metadataCount: 0,
        architecture: 'auto',
        modelName: file.name.replace(/\.gguf$/i, ''),
        contextLength: 8192,
        embeddingLength: 4096,
        blockCount: 32,
        feedForwardLength: 14336,
        attentionHeadCount: 32,
        attentionHeadCountKv: 8,
        quantization: 'GGUF',
        vocabSize: 32000,
        allMetadata: [],
        estimatedKvCachePerTokenBytes: 2 * 32 * 8 * 128 * 2,
      });
    } finally {
      setIsParsingLocal(false);
    }
  };

  const generatedModelfile = `# Ollama Modelfile generated by Lastic Productions
FROM ./${localFile ? localFile.name : 'model.gguf'}

PARAMETER num_ctx ${ollamaContext}
PARAMETER num_gpu ${ollamaNumGpu}
PARAMETER temperature ${ollamaTemperature}

SYSTEM """${ollamaSystemPrompt}"""
`;

  const handleDownloadModelfile = () => {
    const blob = new Blob([generatedModelfile], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Modelfile';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredModels = CURATED_MODELS.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesUseCase =
      selectedUseCase === 'all' || m.useCase.toLowerCase() === selectedUseCase.toLowerCase();

    const matchesSize =
      sizeFilter === 'all' ||
      (sizeFilter === 'compact' && m.paramCountBillions <= 4) ||
      (sizeFilter === 'mid' && m.paramCountBillions > 4 && m.paramCountBillions <= 10) ||
      (sizeFilter === 'large' && m.paramCountBillions > 10);

    return matchesSearch && matchesUseCase && matchesSize;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#17152b] via-[#101424] to-[#151c33] border border-[#3b3159]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#ff9b35] uppercase tracking-wider mb-1">
              <Layers className="w-3.5 h-3.5" /> Model Hub & Runtimes
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Model Library, Testing & Local Checkpoints
            </h2>
            <p className="text-xs text-[#a5aec7] mt-1 max-w-2xl">
              Run models in-browser via WebAssembly, test model quality, manage local GGUF checkpoints, or browse verified open-weights releases.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-mono bg-[#161c33] border border-[#2b3554] text-[#78f0c0] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#78f0c0] animate-pulse" />
              WASM SIMD Active
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🧭 TOP LEVEL SUB-TABS UNDER MODEL LIBRARY */}
      {/* ======================================================== */}
      <div className="p-1.5 rounded-2xl bg-[#0d1020] border border-[#242c47] flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveSubTab('wasm-test')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'wasm-test'
              ? 'bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] shadow-md shadow-[#ff9b35]/25'
              : 'text-[#9da8c5] hover:text-white hover:bg-[#161c30]'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Pick or Test a Model (WASM Engine)</span>
          {isWasmLoaded && (
            <span className="w-2 h-2 rounded-full bg-[#201004] animate-ping ml-1" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('uploaded-checkpoints')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'uploaded-checkpoints'
              ? 'bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] shadow-md shadow-[#ff9b35]/25'
              : 'text-[#9da8c5] hover:text-white hover:bg-[#161c30]'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Uploaded Checkpoints & Local GGUF</span>
          {localFile && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ff9b35]/30 text-white font-mono">1</span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('curated-hub')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'curated-hub'
              ? 'bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] shadow-md shadow-[#ff9b35]/25'
              : 'text-[#9da8c5] hover:text-white hover:bg-[#161c30]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Curated Open-Weights Hub ({CURATED_MODELS.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 🚀 TAB 1: PICK OR TEST A MODEL (WASM RUNNER & TESTER) */}
      {/* ======================================================== */}
      {activeSubTab === 'wasm-test' && (
        <section className="space-y-5 animate-in fade-in duration-300">
          <div className="p-6 rounded-2xl bg-[#101424] border border-[#29314a] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#252d48]">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[#ff9b35]" /> Pick or Test a Model in Memory
                </h3>
                <p className="text-xs text-[#a0a5b4] mt-0.5">
                  Load compact ONNX weights directly into your browser's WebAssembly / WebGPU memory and evaluate speed and coherence.
                </p>
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${
                    isWasmLoaded
                      ? 'bg-[#78f0c0]/15 border-[#78f0c0]/40 text-[#78f0c0]'
                      : 'bg-[#1b2238] border-[#29324f] text-[#828ba3]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isWasmLoaded ? 'bg-[#78f0c0] animate-pulse' : 'bg-[#737988]'
                    }`}
                  />
                  <span>{wasmStatusText}</span>
                </span>

                {isWasmLoaded && (
                  <button
                    onClick={handleUnloadWasmModel}
                    className="px-3 py-1.5 rounded-lg text-xs bg-[#2b1818] hover:bg-[#3d1a1a] text-[#ff8080] border border-[#4d2626] transition-all"
                  >
                    Unload
                  </button>
                )}
              </div>
            </div>

            {/* Error banner */}
            {wasmLoadError && (
              <div className="p-3.5 rounded-xl bg-[#3d1414] border border-[#ff4d4d]/40 text-[#ff8080] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{wasmLoadError}</span>
              </div>
            )}

            {/* Model Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {WASM_READY_MODELS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedWasmModelId(item.id);
                    setCustomRepoInput('');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedWasmModelId === item.id && !customRepoInput
                      ? 'border-[#ff9b35] bg-[#161a2e]'
                      : 'border-[#252d48] bg-[#0c1020] hover:border-[#3d476e]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-xs">{item.name}</span>
                    {item.recommended && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#ff9b35] text-[#1b1005] font-bold">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9da8c5] mb-2 leading-relaxed">{item.desc}</p>
                  <div className="flex items-center justify-between text-[10px] text-[#828ba3] font-mono pt-2 border-t border-[#1c2338]">
                    <span>Download: <strong className="text-white">{item.size}</strong></span>
                    <span>RAM: <strong className="text-[#ffb15c]">{item.memory}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom HF repo input */}
            <div className="p-3.5 rounded-xl bg-[#0c1020] border border-[#20273d] flex flex-col sm:flex-row items-center gap-3">
              <span className="text-xs text-[#a0a5b4] whitespace-nowrap">Or custom ONNX repository:</span>
              <input
                type="text"
                placeholder="e.g. onnx-community/SmolLM2-135M-Instruct"
                value={customRepoInput}
                onChange={(e) => setCustomRepoInput(e.target.value)}
                className="flex-1 bg-[#13182b] border border-[#263152] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#707994] outline-none focus:border-[#ff9b35]"
              />
            </div>

            {/* Load Action & Backend Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#a0a5b4]">Inference Runtime:</span>
                <select
                  value={wasmBackend}
                  onChange={(e) => setWasmBackend(e.target.value as 'wasm' | 'webgpu')}
                  className="bg-[#0c1020] border border-[#242c47] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                >
                  <option value="wasm">WebAssembly (CPU SIMD) - High Compatibility</option>
                  <option value="webgpu">WebGPU - Direct Hardware Acceleration</option>
                </select>
              </div>

              <button
                onClick={() => handleLoadWasmModel()}
                disabled={isLoadingWasm}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] hover:brightness-110 disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-[#ff9b35]/20 transition-all"
              >
                {isLoadingWasm ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading into Memory ({wasmProgressPercent}%)...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Run the Model / Load into Memory
                  </>
                )}
              </button>
            </div>

            {/* Progress Bar during download/loading */}
            {(isLoadingWasm || (wasmProgressPercent > 0 && wasmProgressPercent < 100)) && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] text-[#b9c2dc]">
                  <span>{wasmStatusText}</span>
                  <span className="font-mono font-bold text-[#ffb15c]">{wasmProgressPercent}%</span>
                </div>
                <div className="h-2 w-full bg-[#171d31] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff9b35] via-[#ff4f83] to-[#655bff] transition-all duration-300"
                    style={{ width: `${wasmProgressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Interactive Testing & Evaluation Console (Once Loaded or Testing) */}
          <div className="p-6 rounded-2xl bg-[#101424] border border-[#29314a] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#252d48]">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#78f0c0]" /> Test & Prompt the Loaded Model
                </h4>
                <p className="text-xs text-[#a0a5b4]">
                  Verify generation quality, measure tokens per second, or run the automated evaluation suite.
                </p>
              </div>

              {/* Benchmark Trigger */}
              <button
                onClick={handleRunBenchmark}
                disabled={isBenchmarking || isLoadingWasm}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1a213b] hover:bg-[#252f4c] text-[#78f0c0] border border-[#2f3d61] flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Run Quality Benchmark ("Is it good?")</span>
              </button>
            </div>

            {/* Benchmark Progress or Results */}
            {isBenchmarking && (
              <div className="p-4 rounded-xl bg-[#0c1020] border border-[#2b3554] space-y-2">
                <div className="flex justify-between text-xs text-[#dfe5ff]">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ff9b35]" />
                    <span>{benchmarkStep}</span>
                  </span>
                  <span className="font-mono text-[#ffb15c]">{benchmarkProgress}%</span>
                </div>
                <div className="h-1.5 bg-[#171d31] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff9b35] to-[#78f0c0] transition-all duration-300"
                    style={{ width: `${benchmarkProgress}%` }}
                  />
                </div>
              </div>
            )}

            {benchmarkResult && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#141b30] to-[#0c1020] border border-[#2b3554] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#ff9b35]" />
                    <span className="text-sm font-bold text-white">
                      Model Benchmark Score: <strong className="text-[#78f0c0]">{benchmarkResult.score}/100</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ff9b35]/20 text-[#ffb15c] border border-[#ff9b35]/30">
                      {benchmarkResult.rating}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#a0a5b4]">
                    Avg: <strong className="text-white">{benchmarkResult.avgTokPerSec} tok/s</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className={`p-2 rounded-lg border flex items-center justify-between ${
                    benchmarkResult.reasoningPass ? 'bg-[#78f0c0]/10 border-[#78f0c0]/30 text-[#78f0c0]' : 'bg-[#3d1818] border-[#ff5555]/30 text-[#ff8080]'
                  }`}>
                    <span>Math Logic:</span>
                    <span className="font-bold">{benchmarkResult.reasoningPass ? '✓ Passed' : '✗ Failed'}</span>
                  </div>
                  <div className={`p-2 rounded-lg border flex items-center justify-between ${
                    benchmarkResult.codePass ? 'bg-[#78f0c0]/10 border-[#78f0c0]/30 text-[#78f0c0]' : 'bg-[#3d1818] border-[#ff5555]/30 text-[#ff8080]'
                  }`}>
                    <span>Code Syntax:</span>
                    <span className="font-bold">{benchmarkResult.codePass ? '✓ Passed' : '✗ Incomplete'}</span>
                  </div>
                  <div className={`p-2 rounded-lg border flex items-center justify-between ${
                    benchmarkResult.coherencePass ? 'bg-[#78f0c0]/10 border-[#78f0c0]/30 text-[#78f0c0]' : 'bg-[#3d1818] border-[#ff5555]/30 text-[#ff8080]'
                  }`}>
                    <span>Fluency:</span>
                    <span className="font-bold">{benchmarkResult.coherencePass ? '✓ Coherent' : '✗ Disjointed'}</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#a0a5b4] leading-relaxed">
                  {benchmarkResult.notes}
                </p>
              </div>
            )}

            {/* Prompt execution area */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={wasmPrompt}
                  onChange={(e) => setWasmPrompt(e.target.value)}
                  placeholder="Enter a test prompt for the WASM model..."
                  className="flex-1 bg-[#0c1020] border border-[#263152] rounded-xl p-3 text-xs text-white placeholder-[#707994] focus:border-[#ff9b35] outline-none resize-none"
                />
                <button
                  onClick={handleRunWasmInference}
                  disabled={isGeneratingWasm || isLoadingWasm}
                  className="px-5 rounded-xl bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] font-bold text-xs hover:brightness-110 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  {isGeneratingWasm ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Generate</span>
                </button>
              </div>

              {/* Starter chips */}
              <div className="flex flex-wrap gap-2 text-[11px] text-[#828ba3]">
                <span>Presets:</span>
                {[
                  'Explain WebAssembly in simple terms.',
                  'Write a JavaScript function to reverse an array.',
                  'Give me three creative offline AI project ideas.',
                  'What is 25 * 14?',
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setWasmPrompt(chip)}
                    className="px-2 py-0.5 rounded-full bg-[#151c33] hover:bg-[#202944] text-[#b9c2dc] border border-[#252e47] hover:border-[#ff9b35]/40"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Output Box */}
              {wasmOutput && (
                <div className="p-4 rounded-xl bg-[#080b16] border border-[#232b45] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#b9c2dc]">
                    <span className="font-semibold text-white">Model Response:</span>
                    {wasmGenStats && (
                      <span className="text-[11px] font-mono text-[#78f0c0]">
                        {wasmGenStats.tokensCount} tokens in {wasmGenStats.durationMs}ms ({wasmGenStats.tokPerSec} tok/s)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#dfe5ff] font-mono whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto">
                    {wasmOutput}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 📁 TAB 2: UPLOADED CHECKPOINTS & LOCAL GGUF */}
      {/* ======================================================== */}
      {activeSubTab === 'uploaded-checkpoints' && (
        <section className="p-6 rounded-2xl bg-gradient-to-br from-[#12162b] via-[#0d1020] to-[#16122b] border-2 border-[#ff9b35]/40 shadow-xl space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#29314a]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff9b35] via-[#ff4e85] to-[#655bff] flex items-center justify-center text-white font-black shadow-[0_0_20px_rgba(255,155,53,0.3)]">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Uploaded Checkpoints & Local Model Picker
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ff9b35]/20 text-[#ffb15c] border border-[#ff9b35]/40 uppercase">
                    Device Storage
                  </span>
                </div>
                <p className="text-xs text-[#a0a5b4]">
                  Pick a <strong>.gguf</strong> file from your computer to inspect tensors, verify health, and generate an Ollama Modelfile.
                </p>
              </div>
            </div>

            {/* Ollama Service Detection Status */}
            <div className="flex items-center gap-2">
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
                  ollamaStatus === 'running'
                    ? 'bg-[#78f0c0]/10 border-[#78f0c0]/30 text-[#78f0c0]'
                    : 'bg-[#1a213b] border-[#29324f] text-[#828ba3]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    ollamaStatus === 'running'
                      ? 'bg-[#78f0c0] animate-pulse'
                      : 'bg-[#ff9b35]'
                  }`}
                />
                <span className="font-mono text-[11px]">
                  {checkingOllama
                    ? 'Checking Ollama...'
                    : ollamaStatus === 'running'
                    ? `Ollama Active (${ollamaInstalledModels.length} models)`
                    : 'Ollama on localhost:11434'}
                </span>
              </div>
              <button
                onClick={checkOllamaConnection}
                className="p-1.5 rounded-lg bg-[#1a213b] hover:bg-[#252f4c] text-[#a0a5b4] hover:text-white"
                title="Refresh Ollama Connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingOllama ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={localFileInputRef}
            type="file"
            accept=".gguf,application/octet-stream"
            onChange={(e) => e.target.files?.[0] && handlePickLocalFile(e.target.files[0])}
            className="hidden"
          />

          {/* File Drop / Select Area */}
          {!localFile ? (
            <div
              onClick={() => localFileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handlePickLocalFile(e.dataTransfer.files[0]);
                }
              }}
              className="p-8 border-2 border-dashed border-[#4a3f7a]/80 hover:border-[#ff9b35] rounded-xl bg-[#090c1a]/90 hover:bg-[#0f1429] text-center cursor-pointer transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ff9b35]/20 to-[#655bff]/20 border border-[#ff9b35]/30 flex items-center justify-center text-[#ff9b35] mx-auto mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1 group-hover:text-[#ff9b35] transition-colors">
                Click to browse your PC's storage or drag a .gguf file here
              </h4>
              <p className="text-xs text-[#828ba3] max-w-md mx-auto">
                Pick any local model from your drive. The browser reads headers locally without uploading.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141b33] border border-[#2b3554] text-[11px] text-[#78f0c0]">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Client-Side · Zero uploads
              </div>
            </div>
          ) : (
            /* File Selected & Ollama Loader Panel */
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Selected File Card */}
              <div className="p-4 rounded-xl bg-[#0a0d1c] border border-[#263152] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ff9b35]/20 border border-[#ff9b35]/40 flex items-center justify-center text-[#ff9b35]">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm font-mono">{localFile.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#78f0c0]/20 text-[#78f0c0] border border-[#78f0c0]/30">
                        {formatBytes(localFile.size)}
                      </span>
                      {parsedLocalModel?.quantization && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#ff9b35]/20 text-[#ffb15c] border border-[#ff9b35]/30">
                          {parsedLocalModel.quantization}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#a0a5b4] mt-0.5 flex items-center gap-2">
                      <span>Architecture: <strong className="text-white capitalize">{parsedLocalModel?.architecture || 'Auto'}</strong></span>
                      <span>·</span>
                      <span>Layers: <strong className="text-[#ffb15c] font-mono">{parsedLocalModel?.blockCount || 32}</strong></span>
                      <span>·</span>
                      <span>Context: <strong className="text-[#78f0c0] font-mono">{parsedLocalModel?.contextLength.toLocaleString() || '8,192'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onInspectGgufModel && parsedLocalModel && (
                    <button
                      onClick={() => onInspectGgufModel(parsedLocalModel)}
                      className="px-3 py-1.5 rounded-lg bg-[#161d36] hover:bg-[#202b4d] text-xs font-semibold text-[#dfe5ff] border border-[#2e3b61] flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <HardDrive className="w-3.5 h-3.5 text-[#ff9b35]" /> Open in GGUF Inspector
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setLocalFile(null);
                      setParsedLocalModel(null);
                      setLocalError(null);
                      if (localFileInputRef.current) localFileInputRef.current.value = '';
                    }}
                    className="p-1.5 rounded-lg bg-[#1a213b] hover:bg-[#3d1a1a] text-[#a0a5b4] hover:text-[#ff8080] transition-all"
                    title="Remove selected file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Ollama Configuration Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-[#a0a5b4] block mb-1">
                    Ollama Model Name / Tag:
                  </label>
                  <input
                    type="text"
                    value={ollamaModelName}
                    onChange={(e) => setOllamaModelName(e.target.value)}
                    placeholder="e.g. my-model:latest"
                    className="w-full bg-[#0a0d1c] border border-[#263152] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:border-[#ff9b35] outline-none"
                  />
                  <span className="text-[10px] text-[#828ba3] mt-1 block">
                    Identifier for <code className="text-[#ffb15c]">ollama run {ollamaModelName || 'model'}</code>
                  </span>
                </div>

                <div>
                  <label className="text-xs text-[#a0a5b4] block mb-1">
                    Context Window (<code className="text-[#78f0c0]">num_ctx</code>):
                  </label>
                  <select
                    value={ollamaContext}
                    onChange={(e) => setOllamaContext(Number(e.target.value))}
                    className="w-full bg-[#0a0d1c] border border-[#263152] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:border-[#ff9b35] outline-none"
                  >
                    <option value={2048}>2,048 tokens</option>
                    <option value={4096}>4,096 tokens</option>
                    <option value={8192}>8,192 tokens (Standard)</option>
                    <option value={16384}>16,384 tokens</option>
                    <option value={32768}>32,768 tokens</option>
                  </select>
                  <span className="text-[10px] text-[#828ba3] mt-1 block">
                    KV cache memory scales with context.
                  </span>
                </div>

                <div>
                  <label className="text-xs text-[#a0a5b4] block mb-1">
                    GPU Layers to Offload (<code className="text-[#ff9b35]">num_gpu</code>):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={128}
                    value={ollamaNumGpu}
                    onChange={(e) => setOllamaNumGpu(Number(e.target.value))}
                    className="w-full bg-[#0a0d1c] border border-[#263152] rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:border-[#ff9b35] outline-none"
                  />
                  <span className="text-[10px] text-[#828ba3] mt-1 block">
                    Use {parsedLocalModel?.blockCount || 32}+ for full GPU offload.
                  </span>
                </div>
              </div>

              {/* Generated Modelfile Code Box & Commands */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                {/* Left: Generated Modelfile */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#b9c2dc]">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-[#ff9b35]" /> Generated Modelfile
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleDownloadModelfile}
                        className="px-2.5 py-1 rounded bg-[#1c243d] hover:bg-[#253052] text-xs text-[#78f0c0] font-semibold flex items-center gap-1 transition-all"
                      >
                        <Download className="w-3 h-3" /> Download Modelfile
                      </button>
                      <button
                        onClick={() => copyToClipboard(generatedModelfile, 'modelfile')}
                        className="px-2 py-1 rounded bg-[#1c243d] hover:bg-[#253052] text-xs text-white flex items-center gap-1 transition-all"
                      >
                        {copiedId === 'modelfile' ? <Check className="w-3 h-3 text-[#78f0c0]" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                  </div>

                  <pre className="p-3.5 rounded-xl bg-[#070914] border border-[#202842] text-xs font-mono text-[#b8b9ff] overflow-x-auto whitespace-pre leading-relaxed h-[150px] overflow-y-auto">
                    {generatedModelfile}
                  </pre>
                </div>

                {/* Right: How to load into Ollama (Commands) */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#78f0c0]" /> Load into Ollama (Terminal Steps)
                  </span>

                  <div className="p-3.5 rounded-xl bg-[#070914] border border-[#202842] space-y-3 h-[150px] overflow-y-auto">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#a0a5b4] mb-1">
                        <span>1. Run from the folder with your .gguf and Modelfile:</span>
                        <button
                          onClick={() => {
                            const cmd = `ollama create ${ollamaModelName || 'my-model'} -f ./Modelfile`;
                            copyToClipboard(cmd, 'cmd-create');
                          }}
                          className="text-[10px] text-[#ffb15c] hover:underline flex items-center gap-1"
                        >
                          {copiedId === 'cmd-create' ? <Check className="w-2.5 h-2.5 text-[#78f0c0]" /> : <Copy className="w-2.5 h-2.5" />}
                          Copy
                        </button>
                      </div>
                      <code className="block p-1.5 rounded bg-[#101426] border border-[#252f4d] font-mono text-xs text-[#78f0c0]">
                        ollama create {ollamaModelName || 'my-model'} -f ./Modelfile
                      </code>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#a0a5b4] mb-1">
                        <span>2. Start chat:</span>
                        <button
                          onClick={() => {
                            const cmd = `ollama run ${ollamaModelName || 'my-model'}`;
                            copyToClipboard(cmd, 'cmd-run');
                          }}
                          className="text-[10px] text-[#ffb15c] hover:underline flex items-center gap-1"
                        >
                          {copiedId === 'cmd-run' ? <Check className="w-2.5 h-2.5 text-[#78f0c0]" /> : <Copy className="w-2.5 h-2.5" />}
                          Copy
                        </button>
                      </div>
                      <code className="block p-1.5 rounded bg-[#101426] border border-[#252f4d] font-mono text-xs text-[#ffb15c]">
                        ollama run {ollamaModelName || 'my-model'}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {localError && (
            <div className="p-3.5 rounded-xl bg-[#3d1414] border border-[#ff4d4d]/40 text-[#ff8080] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{localError}</span>
            </div>
          )}
        </section>
      )}

      {/* ======================================================== */}
      {/* 📚 TAB 3: CURATED OPEN-WEIGHTS HUB */}
      {/* ======================================================== */}
      {activeSubTab === 'curated-hub' && (
        <section className="space-y-5 animate-in fade-in duration-300">
          {/* Search and Filters */}
          <div className="p-4 rounded-2xl bg-[#101424] border border-[#29314a] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#828ba3] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search models, tags, architecture..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0c1020] border border-[#242c47] rounded-xl text-xs text-white placeholder-[#828ba3] focus:border-[#ff9b35] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1 bg-[#0c1020] p-1 rounded-xl border border-[#242c47]">
                {['all', 'Coding', 'Reasoning', 'General', 'Lightweight'].map((uc) => (
                  <button
                    key={uc}
                    onClick={() => setSelectedUseCase(uc)}
                    className={`px-2.5 py-1 text-xs rounded-lg capitalize transition-all ${
                      selectedUseCase === uc
                        ? 'bg-[#ff9b35] text-[#1b1005] font-bold'
                        : 'text-[#9da8c5] hover:text-white'
                    }`}
                  >
                    {uc}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-[#0c1020] p-1 rounded-xl border border-[#242c47]">
                {[
                  { id: 'all', label: 'All Sizes' },
                  { id: 'compact', label: '≤4B' },
                  { id: 'mid', label: '7B-9B' },
                  { id: 'large', label: '14B+' },
                ].map((sf) => (
                  <button
                    key={sf.id}
                    onClick={() => setSizeFilter(sf.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                      sizeFilter === sf.id
                        ? 'bg-[#6557ff] text-white font-bold'
                        : 'text-[#9da8c5] hover:text-white'
                    }`}
                  >
                    {sf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Model Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredModels.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-[#252d48] bg-[#101424] p-5 flex flex-col justify-between hover:border-[#ff9b35]/50 transition-all space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white tracking-tight">{m.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#ff9b35]/15 text-[#ffb15c] border border-[#ff9b35]/30">
                          {m.parameters}
                        </span>
                      </div>
                      <div className="text-xs text-[#a0a5b4] flex items-center gap-2 mt-0.5">
                        <span>{m.family} Architecture</span>
                        <span>·</span>
                        <span className="text-[#78f0c0] font-mono">{(m.contextLength / 1024).toFixed(0)}k Context</span>
                        <span>·</span>
                        <span>{m.license}</span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#171d31] text-[#dfe5ff] border border-[#2b3554]">
                      {m.useCase}
                    </span>
                  </div>

                  <p className="text-xs text-[#aeb6d0] leading-relaxed mb-3">
                    {m.description}
                  </p>

                  <div className="p-3 rounded-xl bg-[#0c1020] border border-[#20273d] space-y-1.5">
                    <span className="text-[10px] text-[#828ba3] uppercase font-semibold block">GGUF File Sizes</span>
                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                      {Object.entries(m.sizes).map(([quant, size]) => (
                        <span
                          key={quant}
                          className={`px-2 py-1 rounded border ${
                            quant === m.recommendedQuant
                              ? 'bg-[#ff9b35]/20 text-[#ffb15c] border-[#ff9b35]/40 font-bold'
                              : 'bg-[#151c33] text-[#b9c2dc] border-[#252e47]'
                          }`}
                        >
                          {quant}: {size}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {m.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full text-[10px] bg-[#161c30] text-[#9da8c5] border border-[#232b45]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1e253d] flex items-center justify-between gap-2">
                  <a
                    href={`https://huggingface.co/${m.hfRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#ffb15c] hover:underline"
                  >
                    Hugging Face Repo <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const cmd = `ollama run ${m.id.split('-')[0]}:${m.parameters.replace(' Billion', 'b').toLowerCase()}`;
                        copyToClipboard(cmd, `ollama-${m.id}`);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs bg-[#171d31] hover:bg-[#202944] text-[#b9c2dc] border border-[#2e3752] flex items-center gap-1 transition-all"
                    >
                      {copiedId === `ollama-${m.id}` ? <Check className="w-3 h-3 text-[#78f0c0]" /> : <Copy className="w-3 h-3" />}
                      Ollama
                    </button>

                    {onSelectForCalculator && (
                      <button
                        onClick={() => onSelectForCalculator(m)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] hover:brightness-110 flex items-center gap-1 transition-all shadow-sm"
                      >
                        Calculate Sizing <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
