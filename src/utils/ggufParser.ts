import { GgufMetadataKV, GgufParsedModel, GgufValueType } from '../types';

const GGUF_MAGIC = 0x46554747; // 'GGUF' in little-endian

const TYPE_NAMES: Record<number, GgufValueType> = {
  0: 'UINT8',
  1: 'INT8',
  2: 'UINT16',
  3: 'INT16',
  4: 'UINT32',
  5: 'INT32',
  6: 'FLOAT32',
  7: 'BOOL',
  8: 'STRING',
  9: 'ARRAY',
  10: 'UINT64',
  11: 'INT64',
  12: 'FLOAT64',
};

class BinaryReader {
  private view: DataView;
  private offset = 0;
  private utf8Decoder = new TextDecoder('utf-8');

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  get remaining(): number {
    return this.view.byteLength - this.offset;
  }

  get position(): number {
    return this.offset;
  }

  readUint8(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  readInt8(): number {
    const val = this.view.getInt8(this.offset);
    this.offset += 1;
    return val;
  }

  readUint16(): number {
    const val = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return val;
  }

  readInt16(): number {
    const val = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return val;
  }

  readUint32(): number {
    const val = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readInt32(): number {
    const val = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readFloat32(): number {
    const val = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readFloat64(): number {
    const val = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return val;
  }

  readUint64(): bigint {
    const val = this.view.getBigUint64(this.offset, true);
    this.offset += 8;
    return val;
  }

  readInt64(): bigint {
    const val = this.view.getBigInt64(this.offset, true);
    this.offset += 8;
    return val;
  }

  readBool(): boolean {
    return this.readUint8() !== 0;
  }

  readString(): string {
    const lenBig = this.readUint64();
    const len = Number(lenBig);
    if (len < 0 || this.offset + len > this.view.byteLength) {
      throw new Error(`String length ${len} exceeds available buffer`);
    }
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
    this.offset += len;
    return this.utf8Decoder.decode(bytes);
  }

  readValue(typeId: number): any {
    switch (typeId) {
      case 0: return this.readUint8();
      case 1: return this.readInt8();
      case 2: return this.readUint16();
      case 3: return this.readInt16();
      case 4: return this.readUint32();
      case 5: return this.readInt32();
      case 6: return this.readFloat32();
      case 7: return this.readBool();
      case 8: return this.readString();
      case 9: {
        const elemType = this.readUint32();
        const arrayLenBig = this.readUint64();
        const arrayLen = Number(arrayLenBig);
        // If it's a huge array (e.g. tokenizer tokens 150k words), read first 10 items to save memory
        const isHuge = arrayLen > 20;
        const items: any[] = [];
        const itemsToRead = isHuge ? 10 : arrayLen;

        for (let i = 0; i < itemsToRead; i++) {
          items.push(this.readValue(elemType));
        }

        if (isHuge) {
          // Skip remaining items
          this.skipArrayElements(elemType, arrayLen - itemsToRead);
          return {
            __isTruncatedArray: true,
            totalLength: arrayLen,
            preview: items,
          };
        }
        return items;
      }
      case 10: return Number(this.readUint64());
      case 11: return Number(this.readInt64());
      case 12: return this.readFloat64();
      default:
        throw new Error(`Unsupported GGUF value type ${typeId}`);
    }
  }

  private skipArrayElements(elemType: number, count: number) {
    // Fixed size elements can be skipped instantly
    const fixedSizes: Record<number, number> = {
      0: 1, 1: 1, 2: 2, 3: 2, 4: 4, 5: 4, 6: 4, 7: 1, 10: 8, 11: 8, 12: 8
    };
    if (fixedSizes[elemType] !== undefined) {
      this.offset += fixedSizes[elemType] * count;
      return;
    }
    // For strings, we have to read their length and skip
    for (let i = 0; i < count; i++) {
      if (this.offset >= this.view.byteLength) break;
      if (elemType === 8) {
        const len = Number(this.readUint64());
        this.offset += len;
      } else {
        this.readValue(elemType);
      }
    }
  }
}

export async function parseGgufFile(file: File): Promise<GgufParsedModel> {
  // Read first 8 MB - typically contains all header & metadata KV entries
  const CHUNK_SIZE = Math.min(file.size, 8 * 1024 * 1024);
  const buffer = await file.slice(0, CHUNK_SIZE).arrayBuffer();
  const reader = new BinaryReader(buffer);

  if (buffer.byteLength < 16) {
    throw new Error('File is too small to be a valid GGUF file');
  }

  const magic = reader.readUint32();
  if (magic !== GGUF_MAGIC) {
    throw new Error('Invalid GGUF magic number. Expected "GGUF" (0x46554747).');
  }

  const version = reader.readUint32();
  if (version !== 2 && version !== 3) {
    // Version 1 had slightly different layout, but v2/v3 is standard
    throw new Error(`Unsupported GGUF version ${version}. Only version 2 and 3 are supported.`);
  }

  const tensorCount = Number(reader.readUint64());
  const metadataCount = Number(reader.readUint64());

  const metadataKVs: GgufMetadataKV[] = [];
  const kvMap = new Map<string, any>();

  for (let i = 0; i < metadataCount; i++) {
    if (reader.remaining <= 8) break;
    try {
      const key = reader.readString();
      const typeId = reader.readUint32();
      const typeName = TYPE_NAMES[typeId] || 'UNKNOWN';
      const value = reader.readValue(typeId);

      metadataKVs.push({
        key,
        type: typeName,
        value,
      });
      kvMap.set(key, value);
    } catch {
      // Reached slice boundary or non-critical parse error in tail metadata
      break;
    }
  }

  const architecture = (kvMap.get('general.architecture') as string) || 'unknown';
  const modelName =
    (kvMap.get('general.name') as string) ||
    file.name.replace(/\.gguf$/i, '');

  // Architecture specific keys
  const contextLength =
    Number(kvMap.get(`${architecture}.context_length`)) ||
    Number(kvMap.get('llama.context_length')) ||
    Number(kvMap.get('qwen2.context_length')) ||
    4096;

  const embeddingLength =
    Number(kvMap.get(`${architecture}.embedding_length`)) ||
    Number(kvMap.get('llama.embedding_length')) ||
    Number(kvMap.get('qwen2.embedding_length')) ||
    2048;

  const blockCount =
    Number(kvMap.get(`${architecture}.block_count`)) ||
    Number(kvMap.get('llama.block_count')) ||
    Number(kvMap.get('qwen2.block_count')) ||
    24;

  const feedForwardLength =
    Number(kvMap.get(`${architecture}.feed_forward_length`)) ||
    Number(kvMap.get('llama.feed_forward_length')) ||
    5632;

  const attentionHeadCount =
    Number(kvMap.get(`${architecture}.attention.head_count`)) ||
    Number(kvMap.get('llama.attention.head_count')) ||
    16;

  const attentionHeadCountKv =
    Number(kvMap.get(`${architecture}.attention.head_count_kv`)) ||
    attentionHeadCount;

  const ropeFreqBase =
    Number(kvMap.get(`${architecture}.rope.freq_base`)) || undefined;

  let quantization =
    (kvMap.get('general.file_type') as string) ||
    (kvMap.get('general.quantization_version') as string) ||
    '';

  // If quantization string is empty or numeric code, deduce from filename or filetype enum
  if (!quantization || typeof quantization === 'number') {
    const nameMatch = file.name.match(/(Q[0-9]_[A-Z0-9_]+|BF16|F16|F32|Q4_0|Q8_0)/i);
    quantization = nameMatch ? nameMatch[0].toUpperCase() : 'Q4_K_M';
  }

  const tokensData = kvMap.get('tokenizer.ggml.tokens');
  let vocabSize = 32000;
  if (tokensData && typeof tokensData === 'object' && '__isTruncatedArray' in tokensData) {
    vocabSize = tokensData.totalLength;
  } else if (Array.isArray(tokensData)) {
    vocabSize = tokensData.length;
  }

  // Formula for KV cache per token:
  // 2 (key & value) * blockCount (layers) * attentionHeadCountKv * head_dim * 2 bytes (FP16 KV precision)
  const headDim = attentionHeadCount > 0 ? embeddingLength / attentionHeadCount : 128;
  const estimatedKvCachePerTokenBytes = 2 * blockCount * attentionHeadCountKv * headDim * 2;

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    magic: 'GGUF',
    version,
    tensorCount,
    metadataCount,
    architecture,
    modelName,
    contextLength,
    embeddingLength,
    blockCount,
    feedForwardLength,
    attentionHeadCount,
    attentionHeadCountKv,
    quantization,
    vocabSize,
    ropeFreqBase,
    allMetadata: metadataKVs,
    estimatedKvCachePerTokenBytes,
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}
