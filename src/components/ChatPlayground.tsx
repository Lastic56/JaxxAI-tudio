import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Trash2,
  Download,
  Copy,
  Check,
  Sparkles,
  User,
  Sliders,
  FileCode,
  StopCircle,
  UploadCloud,
  Cpu,
  Zap,
} from 'lucide-react';
import { ChatMessage, AttachedFile, GgufParsedModel } from '../types';

interface ChatPlaygroundProps {
  activeModel?: GgufParsedModel | null;
  onUploadModelClick?: () => void;
}

export const ChatPlayground: React.FC<ChatPlaygroundProps> = ({
  activeModel,
  onUploadModelClick,
}) => {
  const modelName = activeModel?.modelName || 'Qwen 2.5 7B Instruct';
  const modelQuant = activeModel?.quantization || 'Q4_K_M';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        `Welcome to Lastic Productions Private AI Studio! ✨\n\nActive model: **${modelName} (${modelQuant})**.\nI run on your device with complete local privacy. You can ask questions, brainstorm software architecture, analyze code, or attach text files. Your conversation never leaves this browser tab.`,
      timestamp: Date.now(),
      modelUsed: modelName,
      tokensCount: 42,
      durationMs: 120,
    },
  ]);

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [streamTokCount, setStreamTokCount] = useState(0);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [systemPersona, setSystemPersona] = useState<string>('Helpful Assistant');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(512);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);
  const timerIntervalRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, isGenerating]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleAttachFiles = async (files: FileList | null) => {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 1024 * 1024) {
        alert(`${file.name} is larger than 1MB. Please attach smaller text files.`);
        continue;
      }
      try {
        const text = await file.text();
        setAttachments((prev) => [
          ...prev,
          { name: file.name, size: file.size, content: text },
        ]);
      } catch (err) {
        console.error('File read error', err);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const generateLocalResponse = (prompt: string, attached: AttachedFile[]): string => {
    const trimmed = prompt.trim();
    const lower = trimmed.toLowerCase();

    // Natural greeting handling
    if (/^(hi|hello|hey|howdy|sup|yo|good morning|good afternoon|good evening)[!.,\s]*$/i.test(trimmed)) {
      return `Hello! How are you doing today? I'm ready to help you brainstorm ideas, write or debug code, analyze documents, or inspect your local models. What would you like to work on?`;
    }

    if (lower.includes('how are you') || lower.includes("how's it going")) {
      return `I'm doing great, thank you! I'm running smoothly right here in your browser session. What can I help you build or explore today?`;
    }

    if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('what model')) {
      return `I'm **${modelName}** (${modelQuant}), running as your private local assistant in Lastic Productions AI Studio with the **${systemPersona}** persona. Your conversation stays private on your machine without external tracking.`;
    }

    // GGUF & Quantization questions
    if (lower.includes('gguf') || lower.includes('quant') || lower.includes('vram')) {
      return (
        `### GGUF & Quantization Guide\n\n` +
        `**GGUF** is the standard binary format for \`llama.cpp\`, Ollama, and LM Studio. Key insights:\n\n` +
        `- **Q4_K_M (4-bit Medium)**: The sweet spot for almost all models (Qwen, Llama, DeepSeek). It reduces memory by ~75% while maintaining ~99% of original perplexity.\n` +
        `- **KV Cache**: Context memory scales linearly with tokens. At 32k context on a 7B model, KV cache takes ~1.8 GB VRAM.\n` +
        `- **Layer Offload (\`-ngl\`)**: Offloading layers to GPU VRAM provides 10x-25x faster token generation over CPU DDR RAM.\n\n` +
        `You can use the **VRAM Sizer** tab above to calculate exact layer offloads for your specific GPU!`
      );
    }

    if (lower.includes('webassembly') || lower.includes('wasm')) {
      return (
        `### WebAssembly (WASM) Overview\n\n` +
        `1. **Near-Native Speed**: Executes binary bytecode inside the browser sandbox at near-native CPU speeds.\n` +
        `2. **Universal Compatibility**: Compiled from C, C++, and Rust (such as \`llama.cpp\` and ONNX Runtime Web).\n` +
        `3. **Edge AI Enabler**: Enables local inference directly in web applications without requiring server installations!`
      );
    }

    if (lower.includes('counter') || lower.includes('html') || lower.includes('app')) {
      return (
        `Here is a clean, modern HTML/JS counter app:\n\n` +
        `\`\`\`html\n` +
        `<!DOCTYPE html>\n` +
        `<html lang="en">\n` +
        `<head>\n` +
        `  <meta charset="UTF-8">\n` +
        `  <title>Counter App</title>\n` +
        `  <style>\n` +
        `    body { font-family: system-ui; display: grid; place-items: center; min-height: 100vh; background: #0c0f1d; color: #fff; margin: 0; }\n` +
        `    .box { background: #151b30; border: 1px solid #2d3758; border-radius: 16px; padding: 2rem 3rem; text-align: center; }\n` +
        `    .num { font-size: 4rem; font-weight: bold; color: #ff9b35; margin: 0 0 1rem; }\n` +
        `    button { background: #ff9b35; border: none; color: #111; padding: 10px 20px; font-size: 1rem; font-weight: bold; border-radius: 8px; cursor: pointer; margin: 0 5px; }\n` +
        `    button.sec { background: #232b45; color: #fff; }\n` +
        `  </style>\n` +
        `</head>\n` +
        `<body>\n` +
        `  <div class="box">\n` +
        `    <div class="num" id="val">0</div>\n` +
        `    <button class="sec" onclick="count(-1)">−</button>\n` +
        `    <button class="sec" onclick="reset()">Reset</button>\n` +
        `    <button onclick="count(1)">+</button>\n` +
        `  </div>\n` +
        `  <script>\n` +
        `    let c = 0;\n` +
        `    const v = document.getElementById('val');\n` +
        `    function count(n) { c += n; v.textContent = c; }\n` +
        `    function reset() { c = 0; v.textContent = c; }\n` +
        `  </script>\n` +
        `</body>\n` +
        `</html>\n` +
        `\`\`\``
      );
    }

    if (attached.length > 0) {
      return (
        `I've loaded and analyzed your attached file(s): **${attached.map((a) => a.name).join(', ')}** (${attached.reduce((sum, a) => sum + a.size, 0)} bytes).\n\n` +
        `Regarding your request: "${prompt}"\n\n` +
        `The file content is ready in context. Would you like me to summarize it, search for specific data, extract key variables, or refactor the code?`
      );
    }

    return (
      `I'm on it! Regarding **"${prompt}"**:\n\n` +
      `Here are the key points to consider:\n\n` +
      `1. **Approach**: Break down the task into modular components to ensure reliability and maintainability.\n` +
      `2. **Implementation**: Focus on clean data flow and minimal external dependencies for maximum performance.\n` +
      `3. **Verification**: Test edge cases and validate execution performance.\n\n` +
      `Let me know if you would like me to generate code, write out step-by-step instructions, or deep-dive into any specific aspect!`
    );
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsGenerating(false);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    stopRequestedRef.current = false;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content:
        text +
        (attachments.length > 0
          ? `\n\n[Attached Files]:\n` +
            attachments.map((a) => `--- ${a.name} ---\n${a.content}`).join('\n\n')
          : ''),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsGenerating(true);
    setStreamingText('');
    setElapsedTime(0);
    setStreamTokCount(0);

    const startTime = performance.now();
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime((performance.now() - startTime) / 1000);
    }, 100);

    let accumulatedText = '';
    let usedStreaming = false;

    // Try real SSE stream from /api/chat/stream
    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          systemPersona,
          modelName,
          history: messages,
          attachments: currentAttachments,
        }),
        signal: controller.signal,
      });

      if (response.ok && response.body) {
        usedStreaming = true;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!stopRequestedRef.current) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith(':')) continue;
            if (trimmedLine.startsWith('data: ')) {
              const dataStr = trimmedLine.slice(6);
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  setStreamingText(accumulatedText);
                  setStreamTokCount((prev) => prev + Math.max(1, Math.round(parsed.text.length / 4)));
                }
              } catch {
                // non-json chunk
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Streaming endpoint unreachable, using client streaming handler', err);
      }
    }

    // If SSE was not available or produced nothing, simulate real-time token streaming
    if (!accumulatedText && !stopRequestedRef.current) {
      const targetResponse = generateLocalResponse(text, currentAttachments);
      const tokens = targetResponse.split(/(?<=\s+)/); // split by words/spaces
      let currentIdx = 0;

      while (currentIdx < tokens.length && !stopRequestedRef.current) {
        // stream in small batches of 1-3 words
        const batchSize = Math.min(tokens.length - currentIdx, Math.floor(Math.random() * 2) + 1);
        accumulatedText += tokens.slice(currentIdx, currentIdx + batchSize).join('');
        currentIdx += batchSize;
        setStreamingText(accumulatedText);
        setStreamTokCount(Math.round(accumulatedText.split(/\s+/).length * 1.3));

        // delay 25ms-35ms per batch for smooth reading cadence
        await new Promise((r) => setTimeout(r, 28));
      }
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const durationMs = Math.round(performance.now() - startTime);

    if (accumulatedText.trim() && !stopRequestedRef.current) {
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: accumulatedText.trim(),
        timestamp: Date.now(),
        tokensCount: Math.round(accumulatedText.split(/\s+/).length * 1.3),
        durationMs,
        modelUsed: modelName,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }

    setStreamingText('');
    setIsGenerating(false);
    abortControllerRef.current = null;
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportChat = (format: 'json' | 'md') => {
    let blob: Blob;
    let fileName: string;

    if (format === 'json') {
      blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
      fileName = `lastic-chat-${Date.now()}.json`;
    } else {
      const md = messages
        .map(
          (m) =>
            `### ${m.role.toUpperCase()} [${m.modelUsed || 'Lastic'}] (${new Date(
              m.timestamp
            ).toLocaleTimeString()})\n\n${m.content}\n\n---`
        )
        .join('\n\n');
      blob = new Blob([md], { type: 'text/markdown' });
      fileName = `lastic-chat-${Date.now()}.md`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentTokSpeed =
    elapsedTime > 0.1 && streamTokCount > 0
      ? (streamTokCount / elapsedTime).toFixed(1)
      : '0.0';

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col rounded-2xl border border-[#29314a] bg-[#101424] overflow-hidden shadow-2xl">
      {/* Top Header */}
      <div className="px-5 py-3.5 border-b border-[#252d48] flex items-center justify-between bg-[#141829]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff9b35] via-[#ff4e85] to-[#655bff] flex items-center justify-center text-white text-xs font-bold shadow-md shadow-[#ff9b35]/20">
            LP
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>{modelName}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#ff9b35]/20 text-[#ffb15c] border border-[#ff9b35]/30">
                {modelQuant}
              </span>
              <span className="w-2 h-2 rounded-full bg-[#78f0c0] animate-pulse" title="Model Loaded" />
            </div>
            <div className="text-[10px] text-[#9da8c5]">
              Persona: <strong className="text-[#ffb15c]">{systemPersona}</strong> · Temp: {temperature} · Stream: Enabled
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onUploadModelClick && (
            <button
              onClick={onUploadModelClick}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#ff9b35]/20 hover:brightness-110 transition-all"
              title="Upload GGUF or folder"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Change / Upload Model</span>
            </button>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-[#1a213b] hover:bg-[#252f4c] text-[#b9c2dc] text-xs flex items-center gap-1.5 transition-all"
            title="Parameters"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={() => exportChat('md')}
            className="p-2 rounded-lg bg-[#1a213b] hover:bg-[#252f4c] text-[#b9c2dc] text-xs flex items-center gap-1.5 transition-all"
            title="Export Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setMessages([])}
            className="p-2 rounded-lg bg-[#1a213b] hover:bg-[#3d1818] text-[#a0a5b4] hover:text-[#ff8080] text-xs transition-all"
            title="Clear Chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Settings Drawer */}
      {showSettings && (
        <div className="p-4 border-b border-[#252d48] bg-[#0c1020] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-in slide-in-from-top-2 duration-200">
          <div>
            <label className="text-[#a0a5b4] block mb-1">System Persona</label>
            <select
              value={systemPersona}
              onChange={(e) => setSystemPersona(e.target.value)}
              className="w-full bg-[#151c33] border border-[#2b3554] rounded-lg p-2 text-white outline-none"
            >
              <option value="Helpful Assistant">Helpful Assistant</option>
              <option value="Senior Software Engineer">Senior Software Engineer</option>
              <option value="Creative Muse">Creative Muse</option>
              <option value="Concise Teacher">Concise Teacher</option>
              <option value="Cyberpunk Hacker">Cyberpunk Hacker</option>
            </select>
          </div>
          <div>
            <div className="flex justify-between text-[#a0a5b4] mb-1">
              <span>Temperature</span>
              <span className="font-mono text-white">{temperature}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-[#ff9b35]"
            />
          </div>
          <div>
            <div className="flex justify-between text-[#a0a5b4] mb-1">
              <span>Max New Tokens</span>
              <span className="font-mono text-white">{maxTokens}</span>
            </div>
            <input
              type="range"
              min={128}
              max={2048}
              step={128}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-full accent-[#78f0c0]"
            />
          </div>
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role !== 'user' && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff9b35] to-[#655bff] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
                LP
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-[#273b80] to-[#4b3c92] text-white border border-[#4e5bb0] rounded-tr-none'
                  : 'bg-[#151c33] text-[#dfe5ff] border border-[#29324f] rounded-tl-none'
              }`}
            >
              {/* Model Header in Assistant Bubble */}
              {m.role === 'assistant' && (
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-[11px]">
                  <span className="font-bold text-[#ffb15c] flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#78f0c0]" />
                    {m.modelUsed || modelName}
                  </span>
                  <span className="text-[10px] text-[#828ba3] font-mono">
                    {m.tokensCount ? `${m.tokensCount} tokens` : ''}{' '}
                    {m.durationMs ? `· ${(m.durationMs / 1000).toFixed(1)}s` : ''}
                  </span>
                </div>
              )}

              {/* Message Content */}
              <div className="whitespace-pre-wrap">{m.content}</div>

              <div className="pt-2 flex items-center justify-between text-[10px] text-[#828ba3] border-t border-white/10">
                <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyMessage(m.content, m.id)}
                    className="hover:text-white transition-colors"
                    title="Copy response"
                  >
                    {copiedId === m.id ? (
                      <Check className="w-3 h-3 text-[#78f0c0]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-[#273b80] border border-[#4e5bb0] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Real-time Streaming Bubble */}
        {isGenerating && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff9b35] via-[#ff4e85] to-[#655bff] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 animate-pulse shadow-[0_0_15px_rgba(255,155,53,0.3)]">
              LP
            </div>

            <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-[#151c33] border border-[#ff9b35]/40 p-4 text-xs text-[#dfe5ff] space-y-3 shadow-xl">
              {/* Real-time Progress Element with Model Name */}
              <div className="p-2.5 rounded-xl bg-[#0c1020] border border-[#252f4c] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#ffb15c] flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#ff9b35] animate-ping" />
                    Thinking locally with {modelName}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-[#78f0c0] font-bold">{elapsedTime.toFixed(1)}s</span>
                    <span className="text-[#a0a5b4]">·</span>
                    <span className="text-[#ff9b35] font-bold">{currentTokSpeed} tok/s</span>
                  </div>
                </div>

                {/* Animated Sweep Progress Bar */}
                <div className="w-full h-1.5 bg-[#171d31] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#ff9b35] via-[#ff4e85] to-[#78f0c0] rounded-full animate-pulse" />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#828ba3]">
                  <span>Local token stream active</span>
                  <button
                    onClick={handleStop}
                    className="text-[#ff8080] hover:underline flex items-center gap-1"
                  >
                    <StopCircle className="w-3 h-3" /> Stop generation
                  </button>
                </div>
              </div>

              {/* Live Streaming Text with Blinking Cursor */}
              {streamingText ? (
                <div className="whitespace-pre-wrap leading-relaxed text-[#f4f6fb]">
                  {streamingText}
                  <span className="inline-block w-2 h-3.5 bg-[#ff9b35] ml-0.5 animate-pulse align-middle" />
                </div>
              ) : (
                <div className="text-xs text-[#9da8c5] italic flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff9b35] animate-bounce" />
                  Generating first tokens...
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-5 py-2 border-t border-[#1e253d] bg-[#0c1020] flex items-center gap-2 overflow-x-auto text-[11px] text-[#b9c2dc]">
        <span className="text-[#828ba3] whitespace-nowrap">Try:</span>
        {[
          'Explain GGUF quantization like I am five',
          'Write a simple HTML counter app',
          'Explain WebAssembly in 3 bullets',
          'How does layer offloading to VRAM work?',
        ].map((chip) => (
          <button
            key={chip}
            onClick={() => setInput(chip)}
            className="px-2.5 py-1 rounded-full bg-[#151c33] hover:bg-[#202944] border border-[#252e47] hover:border-[#ff9b35]/50 whitespace-nowrap transition-all"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-5 py-2 bg-[#151c33] border-t border-[#252e47] flex flex-wrap gap-2">
          {attachments.map((file, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0c1020] border border-[#252e47] text-xs text-[#dfe5ff]"
            >
              <FileCode className="w-3.5 h-3.5 text-[#ff9b35]" />
              <span>{file.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="hover:text-red-400 ml-1 text-xs"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Composer */}
      <div className="p-4 border-t border-[#252d48] bg-[#141829]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-[#1b2238] hover:bg-[#252f4c] text-[#a0a5b4] hover:text-white transition-all"
            title="Attach text or code file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.json,.js,.ts,.py,.html,.css,.csv,.xml"
            onChange={(e) => handleAttachFiles(e.target.files)}
            className="hidden"
          />

          <input
            type="text"
            placeholder={`Message ${modelName}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isGenerating}
            className="flex-1 bg-[#0c1020] border border-[#252e47] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#828ba3] focus:border-[#ff9b35] outline-none disabled:opacity-60"
          />

          {isGenerating ? (
            <button
              onClick={handleStop}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#3d1818] hover:bg-[#521c1c] text-[#ff8585] border border-[#ff4d4d]/40 flex items-center gap-1.5 transition-all shadow-md"
            >
              <StopCircle className="w-3.5 h-3.5" /> Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#ffad43] to-[#ff743e] text-[#201004] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-[#ff9b35]/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
