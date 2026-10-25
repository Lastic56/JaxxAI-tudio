import React, { useEffect, useState } from 'react';
import { ArrowRight, Cpu, ShieldCheck, Sparkles, HardDrive, Terminal, Layers } from 'lucide-react';

interface LaunchScreenProps {
  onEnter: (tab?: 'inspector' | 'calculator' | 'catalog' | 'chat') => void;
}

export const LaunchScreen: React.FC<LaunchScreenProps> = ({ onEnter }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFade, setSplashFade] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setSplashFade(true);
    }, 1400);

    const timer2 = setTimeout(() => {
      setShowSplash(false);
    }, 1900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <>
      {/* Animated Splash Screen */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-[#070914] transition-all duration-500 ${
            splashFade ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="text-center p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-[#ffb03f] via-[#ff4f83] to-[#645bff] shadow-[0_0_60px_rgba(100,91,255,0.45)] text-white text-3xl font-black italic tracking-tighter">
              LP
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Lastic <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#b8b9ff] to-[#ff9b53]">Productions</span>
            </h1>
            <p className="text-[#aab2d0] text-sm mb-6">Your private AI workspace.</p>
            <div className="w-48 h-1 bg-[#272b44] rounded-full mx-auto overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-[#ff9b35] via-[#ff4f83] to-[#655bff] rounded-full animate-[pulse_1.2s_ease-in-out_infinite]" />
            </div>
            <div className="text-[11px] text-[#777f9f] mt-4 tracking-widest uppercase font-semibold">
              Free to use · Privacy-first · Local AI
            </div>
          </div>
        </div>
      )}

      {/* Main Launch Page */}
      <section className="relative min-h-screen bg-[radial-gradient(ellipse_at_82%_35%,rgba(64,35,90,0.4),transparent_40%),radial-gradient(ellipse_at_5%_80%,rgba(18,59,121,0.35),transparent_45%),#080a13] text-[#f5f7ff] flex flex-col justify-between overflow-x-hidden">
        {/* Top Navigation */}
        <header className="h-20 max-w-7xl w-full mx-auto px-6 flex items-center justify-between border-b border-[#29314a]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#ff9c35] via-[#f44e83] to-[#6557ff] text-white font-extrabold italic text-lg shadow-[0_0_20px_rgba(122,85,255,0.3)]">
              LP
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-tight leading-none block">
                Lastic Productions
              </span>
              <span className="text-[10px] text-[#ff9b35] font-semibold tracking-wider uppercase">
                GGUF & Local AI Studio
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onEnter('inspector')}
              className="hidden md:inline-flex text-xs text-[#c5cbe0] hover:text-white transition-colors"
            >
              GGUF Inspector
            </button>
            <button
              onClick={() => onEnter('calculator')}
              className="hidden md:inline-flex text-xs text-[#c5cbe0] hover:text-white transition-colors"
            >
              VRAM Sizer
            </button>
            <button
              onClick={() => onEnter('catalog')}
              className="hidden md:inline-flex text-xs text-[#c5cbe0] hover:text-white transition-colors"
            >
              Model Library
            </button>
            <button
              onClick={() => onEnter()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] hover:brightness-110 shadow-lg shadow-[#ff9b35]/20 flex items-center gap-1.5 transition-all"
            >
              Launch workspace <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <div className="max-w-7xl w-full mx-auto px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#45406b] bg-[#191a35]/60 text-[#d9d8ff] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#78f0c0] shadow-[0_0_10px_#78f0c0] animate-pulse" />
              100% Client-Side · Zero Telemetry · Local AI Freedom
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
              Inspect GGUF.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#b6b2ff] to-[#ff9d45]">
                Calculate VRAM.
              </span>{' '}
              Run AI Locally.
            </h1>

            <p className="text-base sm:text-lg text-[#aeb6d0] max-w-xl leading-relaxed">
              Explore your device’s AI capabilities. Parse local <strong>.gguf</strong> files in-browser, calculate layer offloads for any NVIDIA, Apple Silicon, or AMD GPU, and chat privately without accounts or API keys.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => onEnter('inspector')}
                className="px-6 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] hover:shadow-[0_0_30px_rgba(255,155,53,0.4)] flex items-center gap-2 transition-all"
              >
                <HardDrive className="w-4 h-4" /> Inspect GGUF File
              </button>
              <button
                onClick={() => onEnter('calculator')}
                className="px-5 py-3.5 rounded-xl text-sm font-semibold bg-[#13182b] border border-[#343c59] text-white hover:border-[#6557ff] hover:bg-[#1a213b] transition-all flex items-center gap-2"
              >
                <Cpu className="w-4 h-4 text-[#ff9b35]" /> VRAM & Hardware Sizer
              </button>
              <button
                onClick={() => onEnter('chat')}
                className="px-5 py-3.5 rounded-xl text-sm font-semibold bg-[#13182b] border border-[#343c59] text-white hover:border-[#78f0c0] hover:bg-[#1a213b] transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#78f0c0]" /> Open Chat Workspace
              </button>
            </div>

            <div className="flex items-center gap-6 pt-4 text-xs text-[#b9c2dc]">
              <span className="flex items-center gap-1.5">
                <span className="text-[#ffb15c] font-bold">✦</span> Free forever
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#ffb15c] font-bold">⌁</span> Local-first
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#ffb15c] font-bold">◈</span> No API key required
              </span>
            </div>
          </div>

          {/* Interactive Visual / Device preview */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[380px]">
            {/* Ambient Glowing Orb */}
            <div className="absolute w-72 sm:w-80 h-72 sm:h-80 rounded-full bg-gradient-to-tr from-[#ff9b35] via-[#ff4d83] to-[#645cff] opacity-75 blur-2xl animate-spin [animation-duration:24s]" />

            {/* Simulated Glass Device */}
            <div className="relative w-full max-w-sm rounded-3xl border border-[#555d83]/70 bg-gradient-to-b from-[#1b223b]/90 to-[#0c1122]/95 backdrop-blur-xl p-5 shadow-[0_28px_80px_rgba(0,0,0,0.7),0_0_50px_rgba(101,91,255,0.2)] transform -rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-[#333b58]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#ff9b35] via-[#ff4e85] to-[#655bff] flex items-center justify-center text-xs font-bold text-white italic">
                    LP
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Lastic AI Engine</div>
                    <div className="text-[10px] text-[#9ba8c9]">In-Browser Runtime</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#167cff]/20 text-[#60a5fa] border border-[#167cff]/40">
                  WASM / WebGPU
                </span>
              </div>

              <div className="py-4 space-y-3">
                <div className="self-end ml-auto bg-gradient-to-r from-[#273b80] to-[#4b3c92] border border-[#4e5bb0] text-xs text-white p-3 rounded-2xl rounded-tr-none max-w-[85%]">
                  Can my RTX 3060 12GB run Qwen 2.5 7B with 32k context?
                </div>

                <div className="bg-[#151c33] border border-[#2b3554] text-xs text-[#dfe5ff] p-3 rounded-2xl rounded-tl-none max-w-[92%] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#78f0c0] font-semibold text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#78f0c0]" /> 100% GPU Offload Fit
                  </div>
                  <p>
                    Yes! At <strong>Q4_K_M (4.68 GB)</strong> + 32K context KV cache (1.8 GB), total VRAM is ~7.03 GB. All 28 layers fit with ~5 GB headroom.
                  </p>
                  <div className="text-[10px] text-[#ffb15c] font-mono bg-[#0b1020] px-2 py-1 rounded border border-[#2b3554]">
                    llama-cli -m model.gguf -ngl 28 -c 32768
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] text-[#8ff0c6] border-t border-[#252e47]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#78f0c0]" /> Privacy Guaranteed
                </span>
                <span className="text-[#a5aec7]">Zero Cloud Leaks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-7xl w-full mx-auto px-6 pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => onEnter('inspector')}
              className="p-5 rounded-2xl border border-[#252d48] bg-[#101528]/80 hover:border-[#ff9b35]/60 hover:bg-[#141b33] transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#ff9b35]/10 border border-[#ff9b35]/30 flex items-center justify-center text-[#ff9b35] mb-3 group-hover:scale-110 transition-transform">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1 group-hover:text-[#ff9b35] transition-colors">
                GGUF Binary Inspector
              </h3>
              <p className="text-xs text-[#9da8c5] leading-relaxed">
                Drag-and-drop any GGUF file. Read tensors, architecture, KV pairs, and layer counts instantly without uploading.
              </p>
            </div>

            <div
              onClick={() => onEnter('calculator')}
              className="p-5 rounded-2xl border border-[#252d48] bg-[#101528]/80 hover:border-[#6557ff]/60 hover:bg-[#141b33] transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#6557ff]/10 border border-[#6557ff]/30 flex items-center justify-center text-[#a59bff] mb-3 group-hover:scale-110 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1 group-hover:text-[#a59bff] transition-colors">
                VRAM Offload Sizer
              </h3>
              <p className="text-xs text-[#9da8c5] leading-relaxed">
                Select your GPU (RTX, Apple Silicon, Radeon). Calculate exact layer offloading, KV cache impact, and tokens/sec.
              </p>
            </div>

            <div
              onClick={() => onEnter('catalog')}
              className="p-5 rounded-2xl border border-[#252d48] bg-[#101528]/80 hover:border-[#f44e83]/60 hover:bg-[#141b33] transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#f44e83]/10 border border-[#f44e83]/30 flex items-center justify-center text-[#f44e83] mb-3 group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1 group-hover:text-[#f44e83] transition-colors">
                Curated Model Hub
              </h3>
              <p className="text-xs text-[#9da8c5] leading-relaxed">
                Direct verified GGUF weights from Hugging Face for Qwen 2.5, DeepSeek R1, Llama 3.2, SmolLM2, and Mistral.
              </p>
            </div>

            <div
              onClick={() => onEnter('chat')}
              className="p-5 rounded-2xl border border-[#252d48] bg-[#101528]/80 hover:border-[#78f0c0]/60 hover:bg-[#141b33] transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#78f0c0]/10 border border-[#78f0c0]/30 flex items-center justify-center text-[#78f0c0] mb-3 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1 group-hover:text-[#78f0c0] transition-colors">
                Private Chat Playground
              </h3>
              <p className="text-xs text-[#9da8c5] leading-relaxed">
                Chat right in your browser. Attach text or code files, test prompt styles, and export conversation logs cleanly.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#252a40] py-6 px-6 max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7f89a8]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#d5daf0]">© Lastic Productions</span>
            <span>· Local AI Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Client-side execution</span>
            <span>·</span>
            <span>Zero prompt leaks</span>
            <span>·</span>
            <span>Open Source Compatible</span>
          </div>
        </footer>
      </section>
    </>
  );
};
