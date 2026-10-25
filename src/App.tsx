import React, { useState } from 'react';
import {
  UploadCloud,
  Cpu,
  Layers,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  HardDrive,
  FolderUp,
  FileCode,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { UploadModelView } from './components/UploadModelView';
import { HardwareCalculatorView } from './components/HardwareCalculatorView';
import { ModelLibraryView } from './components/ModelLibraryView';
import { ChatPlayground } from './components/ChatPlayground';
import { HardwareProbeModal } from './components/HardwareProbeModal';
import { LaunchScreen } from './components/LaunchScreen';
import { GgufModal } from './components/GgufModal';
import { GgufParsedModel, ModelCatalogEntry } from './types';
import { SAMPLE_GGUF_PRESETS } from './data/sampleGgufPresets';

export default function App() {
  // Default directly into workspace so tabs are 100% visible immediately!
  const [inWorkspace, setInWorkspace] = useState(true);
  const [activeTab, setActiveTab] = useState<'upload' | 'chat' | 'calculator' | 'catalog'>('upload');
  const [currentModel, setCurrentModel] = useState<GgufParsedModel>(SAMPLE_GGUF_PRESETS[0]);
  const [showProbeModal, setShowProbeModal] = useState(false);
  const [showGgufModal, setShowGgufModal] = useState(false);

  const handleLaunchToTab = (tab?: 'inspector' | 'calculator' | 'catalog' | 'chat') => {
    if (tab === 'inspector') setActiveTab('upload');
    else if (tab === 'calculator') setActiveTab('calculator');
    else if (tab === 'catalog') setActiveTab('catalog');
    else if (tab === 'chat') setActiveTab('chat');
    setInWorkspace(true);
  };

  const handleSendToCalculator = (parsed: GgufParsedModel) => {
    setCurrentModel(parsed);
    setActiveTab('calculator');
  };

  const handleSendToChat = (parsed: GgufParsedModel) => {
    setCurrentModel(parsed);
    setActiveTab('chat');
  };

  const handleCatalogToCalculator = (entry: ModelCatalogEntry) => {
    const synthesized: GgufParsedModel = {
      fileName: `${entry.id}-${entry.recommendedQuant}.gguf`,
      fileSizeBytes: entry.paramCountBillions * 1e9 * (4.5 / 8),
      magic: 'GGUF',
      version: 3,
      tensorCount: Math.round(entry.paramCountBillions * 35),
      metadataCount: 38,
      architecture: entry.family.toLowerCase(),
      modelName: entry.name,
      contextLength: entry.contextLength,
      embeddingLength: entry.paramCountBillions > 10 ? 5120 : 3584,
      blockCount: entry.paramCountBillions > 10 ? 48 : 28,
      feedForwardLength: 14336,
      attentionHeadCount: 28,
      attentionHeadCountKv: 4,
      quantization: entry.recommendedQuant,
      vocabSize: 128000,
      allMetadata: [],
      estimatedKvCachePerTokenBytes: 2 * 28 * 4 * 128 * 2,
    };
    setCurrentModel(synthesized);
    setActiveTab('calculator');
  };

  if (!inWorkspace) {
    return <LaunchScreen onEnter={handleLaunchToTab} />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_15%_0%,rgba(34,36,90,0.5)_0%,transparent_45%),radial-gradient(ellipse_at_90%_30%,rgba(75,28,77,0.3)_0%,transparent_40%),#080a13] text-[#f5f7ff] flex flex-col">
      {/* Top Main Navigation Bar with explicit tabs */}
      <header className="h-16 border-b border-[#29314a] bg-[#101424]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Lastic Productions"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff9b35] via-[#ff4e85] to-[#655bff] flex items-center justify-center text-white font-black italic text-sm shadow-[0_0_15px_rgba(255,155,53,0.3)] group-hover:scale-105 transition-transform">
              LP
            </div>
            <div>
              <span className="font-bold text-white text-xs tracking-tight block">
                Lastic Productions
              </span>
              <span className="text-[9px] text-[#ff9b35] font-semibold tracking-wider uppercase block">
                Local AI Studio
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-[#29314a] mx-2 hidden sm:block" />

          {/* Core Navigation Tabs - Ultra visible */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {/* Upload Model Tab */}
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] shadow-md shadow-[#ff9b35]/25'
                  : 'text-[#dfe5ff] hover:text-white bg-[#161c30] hover:bg-[#1e2642] border border-[#2b3554]'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Model</span>
            </button>

            {/* Local Chat Tab */}
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] shadow-md shadow-[#ff9b35]/25'
                  : 'text-[#9da8c5] hover:text-white hover:bg-[#181f33]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat Playground</span>
            </button>

            {/* VRAM Sizer Tab */}
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'calculator'
                  ? 'bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] shadow-md shadow-[#ff9b35]/25'
                  : 'text-[#9da8c5] hover:text-white hover:bg-[#181f33]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>VRAM Sizer</span>
            </button>

            {/* Model Library Tab */}
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'catalog'
                  ? 'bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] shadow-md shadow-[#ff9b35]/25'
                  : 'text-[#9da8c5] hover:text-white hover:bg-[#181f33]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Model Library</span>
            </button>
          </nav>
        </div>

        {/* Right Status Actions */}
        <div className="flex items-center gap-2.5">
          {/* Test GGUF Panel Modal Button */}
          <button
            onClick={() => setShowGgufModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a213b] hover:bg-[#252f4c] text-white border border-[#3b3159] hover:border-[#ff9b35] flex items-center gap-1.5 transition-all shadow-sm"
            title="Open Test GGUF Panel Modal"
          >
            <span>📦</span>
            <span className="hidden md:inline">Test GGUF Panel</span>
          </button>

          {/* Quick Upload Action Button */}
          {activeTab !== 'upload' && (
            <button
              onClick={() => setActiveTab('upload')}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a213b] hover:bg-[#252f4c] text-[#ffb15c] border border-[#ff9b35]/40 items-center gap-1.5 transition-all"
              title="Upload a new model"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Model</span>
            </button>
          )}

          {/* WebGPU Hardware Probe */}
          <button
            onClick={() => setShowProbeModal(true)}
            className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-[#161c33] border border-[#2b3554] text-[#78f0c0] hover:border-[#78f0c0] flex items-center gap-1.5 transition-all"
            title="Inspect Browser Hardware Capabilities"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#78f0c0] animate-pulse" />
            <span>WebGPU / WASM</span>
          </button>

          {/* View Intro / Splash */}
          <button
            onClick={() => setInWorkspace(false)}
            className="p-1.5 rounded-lg text-[#828ba3] hover:text-white hover:bg-[#181f33] transition-all"
            title="View Introduction & Landing Tour"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'upload' && (
          <UploadModelView
            currentModel={currentModel}
            onSelectModel={(m) => setCurrentModel(m)}
            onSendToCalculator={handleSendToCalculator}
            onSendToChat={handleSendToChat}
          />
        )}

        {activeTab === 'chat' && (
          <ChatPlayground
            activeModel={currentModel}
            onUploadModelClick={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'calculator' && (
          <HardwareCalculatorView initialModel={currentModel} />
        )}

        {activeTab === 'catalog' && (
          <ModelLibraryView onSelectForCalculator={handleCatalogToCalculator} />
        )}
      </main>

      {/* Footer Info */}
      <footer className="py-4 px-6 border-t border-[#1e253d] text-center text-xs text-[#707994] flex flex-col sm:flex-row items-center justify-between max-w-7xl w-full mx-auto gap-2">
        <span>
          <strong>Lastic Productions</strong> · Private, local-first computing.
        </span>
        <div className="flex items-center gap-4 text-[11px]">
          <span>GGUF & ONNX Compatible</span>
          <span>·</span>
          <span>VRAM Layer Offload Engine</span>
          <span>·</span>
          <span>Zero Server Uploads</span>
        </div>
      </footer>

      {/* Hardware Probe Modal */}
      <HardwareProbeModal
        isOpen={showProbeModal}
        onClose={() => setShowProbeModal(false)}
      />

      {/* Test GGUF Panel Modal */}
      <GgufModal
        isOpen={showGgufModal}
        onClose={() => setShowGgufModal(false)}
        onModelSelected={(m) => {
          setCurrentModel(m);
        }}
        onOpenCalculator={handleSendToCalculator}
      />
    </div>
  );
}
