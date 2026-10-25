/**
 * WebAssembly (WASM) & WebGPU Browser Inference Engine
 * Powered by Transformers.js (ONNX Runtime Web)
 */

export interface WasmProgressCallback {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

export interface WasmBenchmarkResult {
  score: number; // 0-100
  rating: 'Exceptional' | 'Good' | 'Fair' | 'Basic';
  avgTokPerSec: number;
  reasoningPass: boolean;
  codePass: boolean;
  coherencePass: boolean;
  notes: string;
}

let activeGenerator: any = null;
let currentLoadedModelId: string | null = null;
let currentBackend: 'wasm' | 'webgpu' = 'wasm';

export async function getTransformers(): Promise<any> {
  // Dynamically import from CDN for client-side caching without bundler bundling
  const url = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2';
  return await (new Function('u', 'return import(u)'))(url);
}

export async function loadWasmModel(
  modelId: string,
  backend: 'wasm' | 'webgpu' = 'wasm',
  onProgress?: (info: WasmProgressCallback) => void
): Promise<any> {
  if (activeGenerator && currentLoadedModelId === modelId && currentBackend === backend) {
    return activeGenerator;
  }

  // Release previous instance
  activeGenerator = null;
  currentLoadedModelId = null;

  const { pipeline, env } = await getTransformers();

  env.allowLocalModels = false;
  env.useBrowserCache = true;
  env.useFS = false;

  // Set multi-threading for WASM SIMD
  const threads = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = threads;
  }

  onProgress?.({ status: 'initiate', progress: 5, file: 'Initializing WASM runtime...' });

  const device = backend === 'webgpu' && 'gpu' in navigator ? 'webgpu' : 'wasm';
  currentBackend = device as 'wasm' | 'webgpu';

  try {
    activeGenerator = await pipeline('text-generation', modelId, {
      device,
      progress_callback: (info: any) => {
        onProgress?.({
          status: info.status || 'download',
          file: info.file || 'model files',
          progress: typeof info.progress === 'number' ? Math.round(info.progress) : undefined,
          loaded: info.loaded,
          total: info.total,
        });
      },
    });

    currentLoadedModelId = modelId;
    return activeGenerator;
  } catch (err: any) {
    activeGenerator = null;
    currentLoadedModelId = null;
    throw new Error(
      `Failed to load ${modelId} via ${device.toUpperCase()}: ${err?.message || String(err)}`
    );
  }
}

export async function runWasmInference(
  prompt: string,
  options: {
    maxNewTokens?: number;
    temperature?: number;
    topP?: number;
    onToken?: (token: string) => void;
  } = {}
): Promise<{ text: string; tokensCount: number; durationMs: number; tokPerSec: number }> {
  if (!activeGenerator) {
    throw new Error('No model is loaded in WASM memory. Please click "Load Model into Memory" first.');
  }

  const startTime = performance.now();
  const max_new_tokens = options.maxNewTokens || 256;
  const temperature = options.temperature || 0.7;

  const formattedPrompt = `<|im_start|>system\nYou are a helpful local assistant.<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`;

  const output = await activeGenerator(formattedPrompt, {
    max_new_tokens,
    temperature,
    do_sample: temperature > 0,
    return_full_text: false,
  });

  const durationMs = Math.round(performance.now() - startTime);
  let rawText = '';

  if (Array.isArray(output) && output[0]?.generated_text) {
    rawText = output[0].generated_text;
  } else if (typeof output === 'string') {
    rawText = output;
  } else if (output && typeof output === 'object') {
    rawText = output.generated_text || JSON.stringify(output);
  }

  // Clean trailing tokens if any
  const cleanedText = rawText.replace(/<\|im_end\|>|<\|endoftext\|>/g, '').trim();
  const approxTokens = Math.max(1, Math.round(cleanedText.split(/\s+/).length * 1.3));
  const tokPerSec = Number(((approxTokens / Math.max(1, durationMs)) * 1000).toFixed(1));

  return {
    text: cleanedText,
    tokensCount: approxTokens,
    durationMs,
    tokPerSec,
  };
}

export function unloadWasmModel(): void {
  activeGenerator = null;
  currentLoadedModelId = null;
}

export function isModelLoadedInWasm(): boolean {
  return activeGenerator !== null;
}

export function getLoadedWasmModelId(): string | null {
  return currentLoadedModelId;
}

export async function benchmarkWasmModel(
  onProgress?: (step: string, percent: number) => void
): Promise<WasmBenchmarkResult> {
  if (!activeGenerator) {
    throw new Error('Load a model first to run the benchmark.');
  }

  onProgress?.('Testing logic and arithmetic...', 25);
  const mathRes = await runWasmInference('What is 15 * 6? Answer in one short sentence.', {
    maxNewTokens: 60,
    temperature: 0.1,
  });
  const mathText = mathRes.text.toLowerCase();
  const mathPass = mathText.includes('90');

  onProgress?.('Testing syntax and code generation...', 60);
  const codeRes = await runWasmInference('Write a single JavaScript function that reverses a string.', {
    maxNewTokens: 100,
    temperature: 0.2,
  });
  const codeText = codeRes.text.toLowerCase();
  const codePass = codeText.includes('function') && (codeText.includes('reverse') || codeText.includes('split'));

  onProgress?.('Testing language coherence and fluency...', 90);
  const cohRes = await runWasmInference('Summarize the benefits of private local AI in two bullet points.', {
    maxNewTokens: 120,
    temperature: 0.5,
  });
  const cohText = cohRes.text.toLowerCase();
  const cohPass = cohText.length > 30 && (cohText.includes('privacy') || cohText.includes('local') || cohText.includes('data'));

  const avgSpeed = Number(((mathRes.tokPerSec + codeRes.tokPerSec + cohRes.tokPerSec) / 3).toFixed(1));

  let score = 50;
  if (mathPass) score += 20;
  if (codePass) score += 15;
  if (cohPass) score += 15;

  let rating: WasmBenchmarkResult['rating'] = 'Fair';
  if (score >= 85) rating = 'Exceptional';
  else if (score >= 70) rating = 'Good';
  else if (score >= 50) rating = 'Fair';
  else rating = 'Basic';

  onProgress?.('Benchmark complete!', 100);

  return {
    score,
    rating,
    avgTokPerSec: avgSpeed,
    reasoningPass: mathPass,
    codePass,
    coherencePass: cohPass,
    notes: `${rating} model performance at ~${avgSpeed} tok/s in browser WASM. ${
      mathPass ? 'Math reasoning succeeded.' : 'Math reasoning had errors.'
    } ${codePass ? 'Code generation valid.' : 'Code syntax incomplete.'}`,
  };
}
