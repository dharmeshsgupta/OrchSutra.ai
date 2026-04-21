import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ModelsService, type Model } from '../services/modelsService';
import {
  ChatService,
  type ChatResponse,
  type ChatMessagePayload,
  type ChatModelOption,
} from '../services/chatService';
import { MediaService } from '../services/mediaService';
import type { TTSAgentProfile } from '../services/mediaService';
import '../styles/ChatPage.css';

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

// Types
interface ChatRoom {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: Date;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  imageUrl?: string;
  audioUrl?: string;
  metadata?: ChatResponse['metadata'];
}

interface ModelInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ModelCategory {
  id: string;
  title: string;
  models: ModelInfo[];
}

interface ExamplePrompt {
  id: string;
  title: string;
  subtitle: string;
}

interface UploadedFileContext {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  truncated: boolean;
  source: 'text' | 'image';
}

const SUPPORTED_TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'xml', 'html', 'css', 'js', 'jsx', 'ts', 'tsx',
  'py', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rs', 'rb', 'php', 'sql', 'yml', 'yaml', 'ini', 'log',
]);
const MAX_ATTACH_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ATTACH_CHARS = 12000;
const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

// Model Categories Data
const modelCategories: ModelCategory[] = [
  {
    id: 'flagship',
    title: 'Flagship models',
    models: [
      { id: 'gpt-4', name: 'GPT-4', icon: '✦', color: '#10a37f' },
      { id: 'claude-3', name: 'Claude 3', icon: '🅐', color: '#cc785c' },
      { id: 'gemini', name: 'Gemini', icon: '✧', color: '#4285f4' },
      { id: 'grok', name: 'Grok', icon: '⚙', color: '#1d9bf0' },
    ]
  },
  {
    id: 'roleplay',
    title: 'Best roleplay models',
    models: [
      { id: 'mythomax', name: 'MythoMax', icon: '🔮', color: '#9333ea' },
      { id: 'claude-instant', name: 'Claude', icon: '✦', color: '#10a37f' },
      { id: 'mistral', name: 'Mistral', icon: '🌀', color: '#f97316' },
    ]
  },
  {
    id: 'coding',
    title: 'Best coding models',
    models: [
      { id: 'claude-opus', name: 'Claude 3', icon: '🅐', color: '#cc785c' },
      { id: 'gpt-4-turbo', name: 'GPT-4', icon: '✦', color: '#10a37f' },
      { id: 'codellama', name: 'CodeLlama', icon: '🦙', color: '#4285f4' },
      { id: 'deepseek', name: 'DeepSeek', icon: '⚙', color: '#1d9bf0' },
    ]
  },
  {
    id: 'reasoning',
    title: 'Reasoning models',
    models: [
      { id: 'o1', name: 'o1', icon: '✦', color: '#10a37f' },
      { id: 'claude-35', name: 'Claude 3.5', icon: '🔮', color: '#9333ea' },
      { id: 'gemini-ultra', name: 'Gemini', icon: '✧', color: '#4285f4' },
      { id: 'grok-2', name: 'Grok', icon: '⚙', color: '#1d9bf0' },
    ]
  }
];

// Example Prompts Data
const examplePrompts: ExamplePrompt[] = [
  { id: '1', title: 'National Advanc...', subtitle: 'Higher education.' },
  { id: '2', title: '9.9 vs 9.11', subtitle: 'Which one is larger?' },
  { id: '3', title: 'Strawberry Test', subtitle: "How many r's are in the word" },
  { id: '4', title: 'Poem Riddle', subtitle: 'Compose a 12-line poem' },
  { id: '5', title: 'Personal Finance', subtitle: 'Draft up a portfolio m' },
  { id: '6', title: 'Code Review', subtitle: 'Review my React code' },
  { id: '7', title: 'Travel Planner', subtitle: 'Plan a trip to Europe' },
  { id: '8', title: 'Recipe Ideas', subtitle: 'Quick dinner suggestions' },
];

const DIRECT_CHAT_MODELS: Model[] = [
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    slug: 'gemini-3-flash',
    description: 'Direct Gemini route (mapped to supported flash variant when needed).',
    context_window: 0,
    speed_rating: 0,
    featured: true,
    logo_url: null,
    release_date: null,
    max_tokens: 0,
    company_name: 'Google',
    priority: 1,
    fallback_group: 'gemini',
    is_active: true,
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    slug: 'claude-sonnet-4-6',
    description: 'Direct Anthropic route.',
    context_window: 0,
    speed_rating: 0,
    featured: true,
    logo_url: null,
    release_date: null,
    max_tokens: 0,
    company_name: 'Anthropic',
    priority: 1,
    fallback_group: 'anthropic',
    is_active: true,
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    slug: 'deepseek-chat',
    description: 'DeepSeek API (requires DEEPSEEK_API_KEY on api-backend).',
    context_window: 0,
    speed_rating: 0,
    featured: false,
    logo_url: null,
    release_date: null,
    max_tokens: 0,
    company_name: 'DeepSeek',
    priority: 1,
    fallback_group: 'deepseek',
    is_active: true,
  },
  {
    id: 'groq-llama-3.3-70b',
    name: 'Llama 3.3 70B (Groq)',
    slug: 'groq-llama-3.3-70b',
    description: 'Groq Llama 3.3 (requires GROQ_API_KEY on api-backend).',
    context_window: 0,
    speed_rating: 0,
    featured: false,
    logo_url: null,
    release_date: null,
    max_tokens: 0,
    company_name: 'Groq',
    priority: 1,
    fallback_group: 'groq',
    is_active: true,
  },
];

const mergeDirectModels = (fetched: Model[]): Model[] => {
  const existing = new Set(fetched.map((m) => m.id));
  const extras = DIRECT_CHAT_MODELS.filter((m) => !existing.has(m.id));
  return [...extras, ...fetched];
};

const mapChatOptionToModel = (option: ChatModelOption): Model => ({
  id: option.id,
  name: option.name,
  slug: option.id,
  description: option.description ?? null,
  context_window: 0,
  speed_rating: 0,
  featured: option.is_default,
  logo_url: null,
  release_date: null,
  max_tokens: 0,
  company_name: option.provider_name,
  priority: 1,
  fallback_group: option.provider_name,
  is_active: option.is_active,
});

const getExtension = (filename: string): string => {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
};

const isTextLikeFile = (file: File): boolean => {
  if (file.type.startsWith('text/')) {
    return true;
  }
  return SUPPORTED_TEXT_EXTENSIONS.has(getExtension(file.name));
};

const isImageFile = (file: File): boolean => {
  if (SUPPORTED_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
    return true;
  }
  const ext = getExtension(file.name);
  return ext === 'png' || ext === 'jpg' || ext === 'jpeg';
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read file as data URL.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const buildAttachmentContext = (files: UploadedFileContext[]): string => {
  const blocks = files.map((file, idx) => {
    const truncationNote = file.truncated
      ? '\n[Note: content was truncated due to size limits.]'
      : '';
    return (
      `--- Attached File ${idx + 1} ---\n` +
      `Name: ${file.name}\n` +
      `Source: ${file.source === 'image' ? 'image analysis (OCR/vision)' : 'text extraction'}\n` +
      `Type: ${file.type || 'unknown'}\n` +
      `Size: ${formatBytes(file.size)}\n` +
      `Content:\n${file.content}${truncationNote}`
    );
  });

  return (
    'Analyze the attached file contents and answer based on them. ' +
    'If information is missing, say what is missing clearly.\n\n' +
    blocks.join('\n\n')
  );
};

type ParsedImageCommand = {
  prompt: string;
  model?: string;
};

type ParsedSpeechCommand = {
  text: string;
  voice?: string;
  model?: string;
  agentKey?: string;
};

const IMAGE_MODEL_ALIASES: Record<string, string> = {
  flux: 'black-forest-labs/flux.1-dev',
  'flux1-dev': 'black-forest-labs/flux.1-dev',
  'flux.1-dev': 'black-forest-labs/flux.1-dev',
  nvidiaflux: 'black-forest-labs/flux.1-dev',
  sd3: 'stabilityai/stable-diffusion-3-medium',
  'sd3-medium': 'stabilityai/stable-diffusion-3-medium',
  'stable-diffusion-3-medium': 'stabilityai/stable-diffusion-3-medium',
};

const TTS_ONLY_MODEL_HINTS = ['magpie-tts', 'tts', 'text-to-speech'];

const looksLikeTtsOnlyModel = (model?: string): boolean => {
  const lowered = (model || '').toLowerCase();
  return TTS_ONLY_MODEL_HINTS.some((hint) => lowered.includes(hint));
};

const buildImagePromptWithReferences = (basePrompt: string, files: UploadedFileContext[]): string => {
  const refs = files.filter((f) => f.source === 'image');
  if (refs.length === 0) {
    return basePrompt;
  }

  const refBlocks = refs.slice(0, 3).map((ref, idx) => (
    `Reference ${idx + 1} (${ref.name}): ${ref.content}`
  ));

  return [
    basePrompt,
    '',
    'Use these reference-image details as guidance for style, composition, and objects:',
    ...refBlocks,
    '',
    'Important: Generate a new image inspired by the references; do not mention analysis text in output.',
  ].join('\n');
};

const parseImageCommand = (input: string): ParsedImageCommand | null => {
  const trimmed = input.trim();
  const explicit = trimmed.match(/^\/image\s+(.+)/i);
  if (explicit?.[1]) {
    const rest = explicit[1].trim();
    const withModel = rest.match(/^model=([^\s]+)\s+([\s\S]+)/i);
    if (withModel?.[1] && withModel?.[2]) {
      const rawModel = withModel[1].trim();
      const model = IMAGE_MODEL_ALIASES[rawModel.toLowerCase()] || rawModel;
      return {
        prompt: withModel[2].trim(),
        model,
      };
    }
    return { prompt: rest };
  }

  const imageIntent = /\b(create|generate|make|draw)\b[\s\S]*\b(image|picture|photo|art|poster|illustration)\b/i;
  if (imageIntent.test(trimmed)) {
    return { prompt: trimmed };
  }

  // Auto-detect descriptive visual prompts so users can type naturally.
  const visualKeywords = /\b(scene|surreal|dreamlike|cinematic|photorealistic|illustration|painting|render|portrait|landscape|background|lighting|composition|style|vibrant|abstract)\b/i;
  const longDescriptivePrompt = trimmed.length >= 60 && /[,.;:]/.test(trimmed);
  if (visualKeywords.test(trimmed) && longDescriptivePrompt) {
    return { prompt: trimmed };
  }

  return null;
};

const parseSpeechCommand = (input: string): ParsedSpeechCommand | null => {
  const trimmed = input.trim();
  const explicit = trimmed.match(/^\/(speak|tts)\s+(.+)/i);
  if (!explicit?.[2]) {
    return null;
  }

  const rest = explicit[2].trim();
  const withAgent = rest.match(/^agent=([^\s]+)\s+([\s\S]+)/i);
  if (withAgent?.[1] && withAgent?.[2]) {
    return {
      agentKey: withAgent[1].trim(),
      text: withAgent[2].trim(),
    };
  }

  const withVoice = rest.match(/^voice=([^\s]+)\s+([\s\S]+)/i);
  if (withVoice?.[1] && withVoice?.[2]) {
    return {
      voice: withVoice[1].trim(),
      text: withVoice[2].trim(),
    };
  }

  return { text: rest };
};

const extractProviderDetail = (detail: unknown): string => {
  if (typeof detail === 'string') {
    if (detail.trim().startsWith('{') && detail.includes('"error"')) {
      try {
        const parsed = JSON.parse(detail);
        const providerMessage = parsed?.error?.message;
        if (typeof providerMessage === 'string' && providerMessage.trim()) {
          return providerMessage;
        }
      } catch {
        // Keep original detail if parsing fails.
      }
    }
    return detail;
  }

  if (detail && typeof detail === 'object') {
    const obj = detail as any;
    const providerMessage = obj?.error?.message;
    if (typeof providerMessage === 'string' && providerMessage.trim()) {
      return providerMessage;
    }
    try {
      return JSON.stringify(detail);
    } catch {
      return '';
    }
  }

  return '';
};

const classifyMediaError = (err: any, operation: 'generate' | 'analyze'): string => {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;
  const providerDetail = extractProviderDetail(detail) || err?.message || 'Unknown error';
  const lowered = providerDetail.toLowerCase();

  if (status === 401 || lowered.includes('not authenticated')) {
    return 'You are not authenticated. Please log in again and retry.';
  }

  if (
    lowered.includes('image provider key not configured') ||
    lowered.includes('media_image_api_key') ||
    lowered.includes('openai_api_key not configured')
  ) {
    return 'Image key is missing on primary backend. Set MEDIA_IMAGE_API_KEY or OPENAI_API_KEY in primary-backend/.env and restart primary backend.';
  }

  if (lowered.includes('insufficient') || lowered.includes('quota') || lowered.includes('balance')) {
    return 'Image provider credits/quota are exhausted. Add billing/credits for the image provider key and retry.';
  }

  if (status === 429 || lowered.includes('rate limit') || lowered.includes('rate_limit')) {
    return 'Image provider rate limit reached. Wait a bit and try again.';
  }

  if (
    lowered.includes('safety') ||
    lowered.includes('policy') ||
    lowered.includes('content_filter') ||
    lowered.includes('moderation') ||
    lowered.includes('disallowed') ||
    lowered.includes('violation')
  ) {
    return 'Your prompt was blocked by provider safety policy. Try a safer or less sensitive prompt.';
  }

  if (status && status >= 500) {
    return `Image ${operation} failed due to a server/provider error. Please retry. Details: ${providerDetail}`;
  }

  return `Image ${operation} failed. ${providerDetail}`;
};

const classifyAudioError = (err: any): string => {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;
  const providerDetail = extractProviderDetail(detail) || err?.message || 'Unknown error';
  const lowered = providerDetail.toLowerCase();

  if (status === 401 || lowered.includes('not authenticated')) {
    return 'You are not authenticated. Please log in again and retry.';
  }
  if (lowered.includes('audio provider key not configured') || lowered.includes('media_audio_api_key')) {
    return 'Audio key is missing on primary backend. Set MEDIA_AUDIO_API_KEY or OPENAI_API_KEY in primary-backend/.env.';
  }
  if (lowered.includes('insufficient') || lowered.includes('quota') || lowered.includes('billing')) {
    return 'Audio provider credits/quota are exhausted. Add billing/credits for the key and retry.';
  }
  if (status === 429 || lowered.includes('rate limit') || lowered.includes('rate_limit')) {
    return 'Audio provider rate limit reached. Wait a bit and retry.';
  }
  return `Audio generation failed. ${providerDetail}`;
};

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [searchRooms, setSearchRooms] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<UploadedFileContext[]>([]);
  const [ttsAgents, setTtsAgents] = useState<TTSAgentProfile[]>([]);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechBaseInputRef = useRef('');
  const speechFinalTranscriptRef = useRef('');

  const PREF_KEY = 'chat-routing-preferences';

  useEffect(() => {
    const loadModels = async () => {
      try {
        const [fetched, chatOptions] = await Promise.all([
          ModelsService.getModels(),
          ChatService.getModelOptions().catch(() => []),
        ]);

        const backendOptions = chatOptions.filter((opt) => opt.is_active).map(mapChatOptionToModel);
        const merged = backendOptions.length > 0 ? backendOptions : mergeDirectModels(fetched);
        setModels(merged);

        const defaultFromApi = chatOptions.find((opt) => opt.is_default && opt.is_active)?.id;
        const saved = localStorage.getItem(PREF_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setSelectedModel(parsed.selected_model_id ?? defaultFromApi ?? merged[0]?.id ?? null);
          setAutoMode(parsed.auto_switch ?? true);
        } else {
          setSelectedModel(defaultFromApi ?? merged[0]?.id ?? null);
        }
      } catch (err) {
        console.error('Failed to load models', err);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    const loadTTSAgents = async () => {
      try {
        const agents = await MediaService.listTTSAgents();
        setTtsAgents(agents.filter((a) => a.is_active));
      } catch {
        // Keep chat usable even when TTS agents endpoint is unavailable.
        setTtsAgents([]);
      }
    };
    loadTTSAgents();
  }, []);

  const persistPreferences = (selected: string | null, auto: boolean) => {
    localStorage.setItem(
      PREF_KEY,
      JSON.stringify({ selected_model_id: selected, auto_switch: auto })
    );
  };

  // Filter rooms
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchRooms.toLowerCase())
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowModelSelector(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        handleNewChat();
      }
      if (e.key === 'Escape') {
        setShowModelSelector(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const part = (event.results[i][0]?.transcript ?? '').trim();
        if (!part) {
          continue;
        }
        if (event.results[i].isFinal) {
          finalChunk += `${part} `;
        } else {
          interimChunk += `${part} `;
        }
      }

      if (finalChunk.trim()) {
        const accumulatedFinal = `${speechFinalTranscriptRef.current} ${finalChunk}`.trim();
        speechFinalTranscriptRef.current = accumulatedFinal;
      }

      const composed = [
        speechBaseInputRef.current,
        speechFinalTranscriptRef.current,
        interimChunk.trim(),
      ]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      setInputValue(composed);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      speechBaseInputRef.current = '';
      speechFinalTranscriptRef.current = '';
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // no-op
      }
      recognitionRef.current = null;
    };
  }, []);

  // Create new chat
  const handleNewChat = () => {
    const newRoom: ChatRoom = {
      id: Date.now().toString(),
      name: 'New Chat',
      timestamp: new Date(),
    };
    setRooms(prev => [newRoom, ...prev]);
    setCurrentRoom(newRoom);
    setMessages([]);
  };

  // Select room
  const handleSelectRoom = (room: ChatRoom) => {
    setCurrentRoom(room);
    setMessages([]);
  };

  // Delete room
  const handleDeleteRoom = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRooms(prev => prev.filter(r => r.id !== roomId));
    if (currentRoom?.id === roomId) {
      setCurrentRoom(null);
      setMessages([]);
    }
  };

  const handleAttachFileClick = () => {
    fileInputRef.current?.click();
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const nextFiles: UploadedFileContext[] = [];
    const problems: string[] = [];

    for (const file of files) {
      if (file.size > MAX_ATTACH_SIZE_BYTES) {
        problems.push(`${file.name}: file is too large (max 5MB).`);
        continue;
      }

      if (isImageFile(file)) {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const analysisResponse = await MediaService.analyzeImage({
            image_data_url: dataUrl,
            file_name: file.name,
            prompt: 'Extract important details and text from this image for later question answering.',
          });

          nextFiles.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            content: analysisResponse.analysis,
            truncated: false,
            source: 'image',
          });
        } catch (err: any) {
          const friendly = classifyMediaError(err, 'analyze');
          problems.push(`${file.name}: ${friendly}`);
        }
        continue;
      }

      if (!isTextLikeFile(file)) {
        problems.push(`${file.name}: unsupported file type for analysis. Upload text/code/csv/json/jpg/png/jpeg files.`);
        continue;
      }

      try {
        const fullText = await file.text();
        const limitedText = fullText.slice(0, MAX_ATTACH_CHARS);
        nextFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          content: limitedText,
          truncated: fullText.length > MAX_ATTACH_CHARS,
          source: 'text',
        });
      } catch {
        problems.push(`${file.name}: failed to read file.`);
      }
    }

    if (nextFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...nextFiles]);
    }

    if (problems.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `File upload warnings:\n${problems.join('\n')}`,
          timestamp: new Date(),
          model: 'error',
        },
      ]);
    }

    e.target.value = '';
  };

  // Send message
  const handleSendMessage = async () => {
    const rawInput = inputValue.trim();
    if (!rawInput) return;

    const imageCommand = parseImageCommand(rawInput);
    const speechCommand = parseSpeechCommand(rawInput);
    if (!imageCommand && !speechCommand && !selectedModel) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Please select a model before sending a message.',
        timestamp: new Date(),
        model: 'error',
      }]);
      return;
    }

    const userVisibleText = attachedFiles.length > 0
      ? `${rawInput}\n\nAttached: ${attachedFiles.map((f) => f.name).join(', ')}`
      : rawInput;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userVisibleText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const composedUserContent = attachedFiles.length > 0
      ? `${rawInput}\n\n${buildAttachmentContext(attachedFiles)}`
      : rawInput;

    const payloadMessages: ChatMessagePayload[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: composedUserContent },
    ];

    const fallbackCandidates = autoMode
      ? models
          .filter((m) => m.is_active && m.id !== selectedModel)
          .map((m) => m.id)
          .slice(0, 10)
      : undefined;

    try {
      if (imageCommand) {
        if (looksLikeTtsOnlyModel(imageCommand.model)) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Selected model appears to be text-to-speech (TTS), not text-to-image. Use an image model like sd3/flux for /image, or use /speak for TTS.',
            timestamp: new Date(),
            model: 'error',
          };
          setMessages(prev => [...prev, assistantMessage]);
          return;
        }

        const mergedPrompt = buildImagePromptWithReferences(imageCommand.prompt, attachedFiles);
        const imageResponse = await MediaService.generateImage({
          prompt: mergedPrompt,
          model: imageCommand.model,
          response_format: 'b64_json',
        });

        const imageUrl = imageResponse.b64_json
          ? `data:${imageResponse.mime_type || 'image/png'};base64,${imageResponse.b64_json}`
          : imageResponse.url;

        if (!imageUrl) {
          throw new Error('Image provider returned no image data.');
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Image generated successfully.',
          timestamp: new Date(),
          model: imageResponse.model || 'image-generator',
          imageUrl,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setAttachedFiles([]);
        return;
      }

      if (speechCommand) {
        let audioUrl = '';
        let speechModel = 'speech-generator';

        if (speechCommand.agentKey) {
          const key = speechCommand.agentKey.toLowerCase();
          const agent = ttsAgents.find(
            (a) => a.id.toLowerCase() === key || a.name.toLowerCase() === key
          );
          if (!agent) {
            throw new Error(`TTS agent '${speechCommand.agentKey}' not found. Create one first via /media/tts/agents.`);
          }
          const agentResp = await MediaService.generateFromTTSAgent({
            agent_id: agent.id,
            text: speechCommand.text,
          });
          audioUrl = agentResp.audio_url.startsWith('http')
            ? agentResp.audio_url
            : `${API_BASE_URL}${agentResp.audio_url}`;
          speechModel = agentResp.agent_name;
        } else {
          const audioResponse = await MediaService.generateAudio({
            text: speechCommand.text,
            voice: speechCommand.voice,
            model: speechCommand.model,
          });
          audioUrl = `data:${audioResponse.mime_type || 'audio/mpeg'};base64,${audioResponse.b64_audio}`;
          speechModel = audioResponse.model || 'speech-generator';
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Audio generated successfully.',
          timestamp: new Date(),
          model: speechModel,
          audioUrl,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setAttachedFiles([]);
        return;
      }

      const response = await ChatService.sendChat({
        messages: payloadMessages,
        selected_model_id: selectedModel!,
        auto_switch: autoMode,
        fallback_candidates: fallbackCandidates,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        model: response.metadata.actual_model_id || selectedModel || 'assistant',
        metadata: response.metadata,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setAttachedFiles([]);
    } catch (error: any) {
      if (imageCommand) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: classifyMediaError(error, 'generate'),
          timestamp: new Date(),
          model: 'error',
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      if (speechCommand) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: classifyAudioError(error),
          timestamp: new Date(),
          model: 'error',
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      const detailText = typeof detail === 'string' ? detail : '';
      const quotaLike = /insufficient_quota|credit balance is too low|rate limit|rate_limit/i.test(detailText);

      if (!autoMode && quotaLike && fallbackCandidates && fallbackCandidates.length > 0) {
        try {
          const retryResponse = await ChatService.sendChat({
            messages: payloadMessages,
            selected_model_id: selectedModel!,
            auto_switch: true,
            fallback_candidates: fallbackCandidates,
          });

          setAutoMode(true);
          persistPreferences(selectedModel, true);

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: retryResponse.content,
            timestamp: new Date(),
            model: retryResponse.metadata.actual_model_id || selectedModel || 'assistant',
            metadata: retryResponse.metadata,
          };
          setMessages(prev => [...prev, assistantMessage]);
          return;
        } catch {
          // Fall through to normal friendly error handling below.
        }
      }

      const fallbackMessage = error?.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again or choose a faster model.'
        : error?.message || 'Request failed. Please try again.';

      const friendlyMessage = (() => {
        if (typeof detail === 'string' && detail.trim()) {
          if (/all connection attempts failed|unable to connect to routing service/i.test(detail)) {
            return 'Chat routing backend is unreachable. Start api-backend and confirm primary-backend API_BACKEND_URL points to it (default http://localhost:3000).';
          }
          const lowered = detail.toLowerCase();
          if (lowered.includes('insufficient_quota') || lowered.includes('rate limit') || lowered.includes('rate_limit')) {
            return autoMode
              ? 'Selected provider quota/rate limit reached. Auto-switch is ON, so try again to route to another model.'
              : 'Selected provider quota/rate limit reached. Turn ON Auto-switch to fall back to another model, or add credits for this provider key.';
          }
          if (detail.trim().startsWith('{') && detail.includes('"error"')) {
            try {
              const parsed = JSON.parse(detail);
              const providerMessage = parsed?.error?.message;
              if (typeof providerMessage === 'string' && providerMessage.trim()) {
                return providerMessage;
              }
            } catch {
              // Keep original detail if provider payload is not valid JSON.
            }
          }
          return detail;
        }
        if (detail && typeof detail === 'object') {
          try {
            return JSON.stringify(detail);
          } catch {
            return fallbackMessage;
          }
        }
        if (status === 429) {
          return 'Provider quota or rate limit reached. Please check your API credits/billing.';
        }
        return fallbackMessage;
      })();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: friendlyMessage,
        timestamp: new Date(),
        model: 'error',
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle prompt click
  const handlePromptClick = (prompt: ExamplePrompt) => {
    setInputValue(`${prompt.title}: ${prompt.subtitle}`);
    inputRef.current?.focus();
  };

  // Handle read aloud (Text-to-Speech)
  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop current speech
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Your browser doesn't support text to speech.");
    }
  };

  // Select model
  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setShowModelSelector(false);
    persistPreferences(modelId, autoMode);
  };

  const toggleAutoMode = () => {
    const next = !autoMode;
    setAutoMode(next);
    persistPreferences(selectedModel, next);
  };

  const handleCreateArtifact = () => {
    setInputValue('/image ');
    inputRef.current?.focus();
  };

  const toggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Voice input is not supported in this browser. Use Chrome/Edge and allow microphone access.',
          timestamp: new Date(),
          model: 'error',
        },
      ]);
      return;
    }

    if (isRecording) {
      try {
        recognition.stop();
      } catch {
        // no-op
      }
      setIsRecording(false);
      return;
    }

    try {
      speechBaseInputRef.current = inputValue.trim();
      speechFinalTranscriptRef.current = '';
      recognition.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div className="chat-page">
      {/* ============ LEFT SIDEBAR ============ */}
      <aside className={`chat-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <button 
            className="sidebar-toggle" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
          
          <div className="sidebar-brand" onClick={() => navigate('/')}>
            <span className="brand-icon">←</span>
            <span className="brand-text">OpenRouter</span>
          </div>
        </div>

        <div className="sidebar-actions">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            New Chat
            <span className="shortcut">/</span>
          </button>
          
          <button className="add-model-btn" onClick={() => setShowModelSelector(true)}>
            <span className="plus-icon">+</span>
            Add Model
            <span className="shortcut">⌘ K</span>
          </button>
        </div>

        <div className="rooms-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          <input 
            type="text"
            placeholder="Search rooms..."
            value={searchRooms}
            onChange={(e) => setSearchRooms(e.target.value)}
          />
        </div>

        <div className="rooms-list">
          {filteredRooms.length > 0 ? (
            filteredRooms.map(room => (
              <div 
                key={room.id}
                className={`room-item ${currentRoom?.id === room.id ? 'active' : ''}`}
                onClick={() => handleSelectRoom(room)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span className="room-name">{room.name}</span>
                <button className="room-delete" onClick={(e) => handleDeleteRoom(room.id, e)}>×</button>
              </div>
            ))
          ) : (
            <div className="no-rooms">No matching rooms</div>
          )}
        </div>
      </aside>

      {/* ============ MAIN CHAT AREA ============ */}
      <main className="chat-main">
        {/* Shared Navbar */}
        <Navbar />
        
        {/* Model Selector Bar */}
        <div className="model-selector-bar">
          <div className="selected-model">
            {selectedModel ? (
              <>
                <span className="model-badge">{models.find(m => m.id === selectedModel)?.name || selectedModel}</span>
                <button className="change-model" onClick={() => setShowModelSelector(true)}>
                  Change
                </button>
              </>
            ) : (
              <button className="select-model-btn" onClick={() => setShowModelSelector(true)}>
                <span className="plus-icon">+</span>
                Add Model
                <span className="shortcut">⌘ K</span>
              </button>
            )}
          </div>

          <label className="auto-toggle">
            <input type="checkbox" checked={autoMode} onChange={toggleAutoMode} />
            <span className="auto-toggle-slider"></span>
            <span className="auto-toggle-label">Auto-switch {autoMode ? 'ON' : 'OFF'}</span>
          </label>
        </div>

        {/* Chat Content */}
        <div className="chat-content">
          {messages.length === 0 && !currentRoom ? (
            <div className="chat-empty-state">
              {/* Model Categories - 2x2 Grid */}
              <div className="model-categories">
                {modelCategories.map(category => (
                  <div 
                    key={category.id} 
                    className="category-card"
                    onClick={() => setShowModelSelector(true)}
                  >
                    <h3>{category.title}</h3>
                    <div className="category-models">
                      {category.models.slice(0, 4).map(model => (
                        <span 
                          key={model.id}
                          className="model-icon"
                          style={{ background: model.color }}
                          title={model.name}
                        >
                          {model.icon}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Example Prompts - Horizontal Scroll */}
              <div className="prompts-section">
                <div className="prompts-scroll">
                  {examplePrompts.map(prompt => (
                    <button 
                      key={prompt.id}
                      className="prompt-card"
                      onClick={() => handlePromptClick(prompt)}
                    >
                      <span className="prompt-title">{prompt.title}</span>
                      <span className="prompt-subtitle">{prompt.subtitle}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="messages-container">
              {messages.map(message => (
                <div key={message.id} className={`message ${message.role}`}>
                  <div className="message-avatar">
                    {message.role === 'user' ? 'U' : '🤖'}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-sender">
                        {message.role === 'user' ? 'You' : (message.model || 'Assistant')}
                      </span>
                      <span className="message-time">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-text">{message.content}</div>
                    {message.imageUrl && (
                      <img className="generated-image" src={message.imageUrl} alt="Generated" />
                    )}
                    {message.audioUrl && (
                      <audio className="generated-audio" controls src={message.audioUrl} />
                    )}
                    {message.role === 'assistant' && (
                      <div className="message-actions">
                        <button title="Copy">📋</button>
                        <button title="Read Aloud" onClick={() => handleSpeak(message.content)}>🔊</button>
                        <button title="Regenerate">🔄</button>
                        <button title="Like">👍</button>
                        <button title="Dislike">👎</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="message assistant loading">
                  <div className="message-avatar">🤖</div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <button className="create-artifact-btn" onClick={handleCreateArtifact}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
              Create Artifact...
            </button>
            
            <div className="input-container">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Start a new message..."
                rows={1}
              />

              {attachedFiles.length > 0 && (
                <div className="attached-files-bar">
                  {attachedFiles.map((file) => (
                    <div key={file.id} className="attached-file-chip">
                      <span className="file-chip-name" title={file.name}>{file.name}</span>
                      <span className="file-chip-size">{formatBytes(file.size)}</span>
                      <button onClick={() => removeAttachedFile(file.id)} title="Remove file">×</button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="input-actions">
                <button className="action-btn attach" title="Attach file" onClick={handleAttachFileClick}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
                
                <button 
                  className={`action-btn mic ${isRecording ? 'recording' : ''}`}
                  onClick={toggleRecording}
                  title="Voice input"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
                
                <div className="input-divider"></div>
                
                <button 
                  className={`action-btn auto-mode ${autoMode ? 'active' : ''}`}
                  onClick={toggleAutoMode}
                  title="Auto mode"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                  </svg>
                  Auto
                </button>
                
                <button className="action-btn messages-count" title="Message count">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {messages.length || 8}
                </button>
                
                <button className="action-btn settings" title="Settings">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
                
                <button 
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.markdown,.json,.csv,.tsv,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.go,.rs,.rb,.php,.sql,.yml,.yaml,.ini,.log,.png,.jpg,.jpeg,text/*,image/png,image/jpeg"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
      </main>

      {/* ============ MODEL SELECTOR MODAL ============ */}
      {showModelSelector && (
        <div className="modal-overlay" onClick={() => setShowModelSelector(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Select Model</h2>
            <div className="model-grid">
              {models.length === 0 && <p className="empty-state">No models available yet.</p>}
              {models.map((model) => (
                <div key={model.id} className={`model-card ${selectedModel === model.id ? 'active' : ''}`}>
                  <h3>{model.name}</h3>
                  <p>{model.description || 'No description'}</p>
                  <div className="model-meta">
                    <span className="meta-pill">Priority {model.priority ?? '—'}</span>
                    {model.fallback_group && <span className="meta-pill">Fallback {model.fallback_group}</span>}
                    {!model.is_active && <span className="meta-pill warning">Inactive</span>}
                  </div>
                  <button onClick={() => handleSelectModel(model.id)}>
                    {selectedModel === model.id ? 'Selected' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
            <button className="close-modal" onClick={() => setShowModelSelector(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
