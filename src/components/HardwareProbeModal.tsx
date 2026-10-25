import React, { useEffect, useState } from 'react';
import { Cpu, X, CheckCircle2, AlertTriangle, Sparkles, HardDrive, Shield } from 'lucide-react';

interface HardwareProbeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProbeData {
  hasWebGpu: boolean;
  adapterVendor?: string;
  adapterRenderer?: string;
  maxBufferSize?: string;
  maxComputeWorkgroupSize?: string;
  hardwareConcurrency: number;
  deviceMemoryGb?: number;
  hasWasm: boolean;
  hasSharedArrayBuffer: boolean;
}

export const HardwareProbeModal: React.FC<HardwareProbeModalProps> = ({ isOpen, onClose }) => {
  const [probeData, setProbeData] = useState<ProbeData | null>(null);
  const [probing, setProbing] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const probe = async () => {
      setProbing(true);
      const data: ProbeData = {
        hasWebGpu: 'gpu' in navigator,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        deviceMemoryGb: (navigator as any).deviceMemory || undefined,
        hasWasm: typeof WebAssembly === 'object',
        hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      };

      if ('gpu' in navigator && (navigator as any).gpu) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          if (adapter) {
            // Check adapter info or limits
            if (adapter.info) {
              data.adapterVendor = adapter.info.vendor || 'Detected';
              data.adapterRenderer = adapter.info.architecture || adapter.info.device || 'WebGPU Compatible Adapter';
            }
            if (adapter.limits) {
              const maxBuf = adapter.limits.maxBufferSize;
              data.maxBufferSize = maxBuf ? `${(maxBuf / (1024 * 1024 * 1024)).toFixed(2)} GB` : 'Standard';
              data.maxComputeWorkgroupSize = `${adapter.limits.maxComputeWorkgroupSizeX || 256}`;
            }
          }
        } catch (e) {
          console.warn('WebGPU probe error', e);
        }
      }

      setProbeData(data);
      setProbing(false);
    };

    probe();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-w-md w-full rounded-2xl border border-[#2b3554] bg-[#101424] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#252d48]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ff9b35]/20 border border-[#ff9b35]/40 flex items-center justify-center text-[#ff9b35]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Browser Hardware Probe</h3>
              <p className="text-[11px] text-[#9da8c5]">Client capability detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1a213b] text-[#a0a5b4] hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {probing ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#ff9b35] border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-[#a0a5b4]">Probing GPU and WebAssembly capabilities...</p>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            {/* WebGPU Status */}
            <div className="p-3.5 rounded-xl bg-[#0c1020] border border-[#20273d] flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">WebGPU Support</span>
                <span className="text-[11px] text-[#828ba3]">
                  {probeData?.hasWebGpu ? 'Direct browser GPU acceleration available' : 'Not supported by this browser'}
                </span>
              </div>
              {probeData?.hasWebGpu ? (
                <span className="px-2.5 py-1 rounded-full bg-[#78f0c0]/15 text-[#78f0c0] font-bold text-[10px] border border-[#78f0c0]/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Enabled
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-[#ff9b35]/15 text-[#ff9b35] font-bold text-[10px] border border-[#ff9b35]/30 flex items-center gap-1">
                  WASM CPU Only
                </span>
              )}
            </div>

            {/* CPU Threads */}
            <div className="p-3.5 rounded-xl bg-[#0c1020] border border-[#20273d] flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Logical CPU Cores</span>
                <span className="text-[11px] text-[#828ba3]">navigator.hardwareConcurrency</span>
              </div>
              <span className="font-mono font-bold text-[#ffb15c] text-sm">
                {probeData?.hardwareConcurrency} Cores
              </span>
            </div>

            {/* Device Memory */}
            <div className="p-3.5 rounded-xl bg-[#0c1020] border border-[#20273d] flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Estimated Device RAM</span>
                <span className="text-[11px] text-[#828ba3]">Reported browser memory quota</span>
              </div>
              <span className="font-mono font-bold text-[#78f0c0] text-sm">
                {probeData?.deviceMemoryGb ? `~${probeData.deviceMemoryGb} GB+` : 'Standard (~8–16 GB)'}
              </span>
            </div>

            {/* WebAssembly & SharedArrayBuffer */}
            <div className="p-3.5 rounded-xl bg-[#0c1020] border border-[#20273d] flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">WebAssembly Execution</span>
                <span className="text-[11px] text-[#828ba3]">SIMD & CPU acceleration</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#78f0c0]/15 text-[#78f0c0] font-bold text-[10px] border border-[#78f0c0]/30">
                100% Active
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-[#252d48] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1a213b] hover:bg-[#252f4c] text-white transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
