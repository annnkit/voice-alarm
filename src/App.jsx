import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Square, Play, Trash2, Plus, Bell, Volume2, VolumeX, Clock, X, 
  MessageCircle, Activity, Heart, Home, Settings, Check, ChevronRight, 
  Sparkles, Brain, Loader, Fingerprint, ArrowRight, ShieldCheck, Info, Calendar, ChevronUp, ChevronDown, AlertTriangle
} from 'lucide-react';

// --- ASSETS CONFIGURATION ---
const ASSETS = {
  logo: "/STinstaLOGO.png",
  mascot: "/STmascot.jpg"
};

// --- CONFIGURATION & STORAGE ---
const getCleanKey = (keyName) => (localStorage.getItem(keyName) || '').trim();

const CONFIG = {
  elevenLabsKey: getCleanKey('sobertone_el_key'),
  geminiKey: getCleanKey('sobertone_gemini_key'),
};

const getDaysSober = () => {
  const start = localStorage.getItem('sobertone_start_date');
  if (!start) return 0;
  const diff = new Date() - new Date(start);
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const getSavedStage = () => {
  const score = localStorage.getItem('sobertone_stage_score');
  return score ? parseInt(score, 10) : null;
};

// --- HELPER: AUDIO UNLOCKER ---
// Essential for Mobile Safari/Chrome to allow audio playback later
const unlockAudioContext = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext) {
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    // Play a silent buffer to prime the audio pipeline
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  }
};

// --- HELPER: WAKE LOCK ---
// Keeps screen on so alarms trigger reliably
const useWakeLock = () => {
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake Lock error:', err);
      }
    };
    // Re-request wake lock if visibility changes (user switches apps)
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    requestWakeLock();
    return () => {
        wakeLock?.release();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};

// --- COMPONENT: TIME PICKER ---
const TimePicker = ({ value, onChange }) => {
  const parseTime = (t) => {
    if (!t) {
      const now = new Date();
      return { h: now.getHours() % 12 || 12, m: now.getMinutes(), ampm: now.getHours() >= 12 ? 'PM' : 'AM' };
    }
    const [h24, m] = t.split(':').map(Number);
    return { h: h24 % 12 || 12, m: m, ampm: h24 >= 12 ? 'PM' : 'AM' };
  };

  const [time, setTime] = useState(parseTime(value));

  useEffect(() => {
    let h24 = time.ampm === 'PM' ? (time.h % 12) + 12 : time.h % 12;
    if (time.ampm === 'PM' && time.h === 12) h24 = 12;
    if (time.ampm === 'AM' && time.h === 12) h24 = 0;
    const str = `${h24.toString().padStart(2, '0')}:${time.m.toString().padStart(2, '0')}`;
    onChange(str);
  }, [time]);

  const cycle = (key, max, min = 0) => {
    setTime(prev => {
      let val = prev[key] + 1;
      if (val > max) val = min;
      return { ...prev, [key]: val };
    });
  };
  
  const cycleDown = (key, max, min = 0) => {
    setTime(prev => {
        let val = prev[key] - 1;
        if (val < min) val = max;
        return { ...prev, [key]: val };
    });
  };

  return (
    <div className="flex items-center justify-center gap-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner" onClick={(e) => e.stopPropagation()}>
      {/* Hours */}
      <div className="flex flex-col items-center">
        <button onClick={() => cycle('h', 12, 1)} className="p-2 text-slate-500 hover:text-cyan-400 active:scale-90 transition-transform"><ChevronUp className="w-5 h-5"/></button>
        <div className="text-4xl font-bold text-white w-20 text-center tabular-nums font-mono">{time.h.toString().padStart(2, '0')}</div>
        <button onClick={() => cycleDown('h', 12, 1)} className="p-2 text-slate-500 hover:text-cyan-400 active:scale-90 transition-transform"><ChevronDown className="w-5 h-5"/></button>
      </div>
      <div className="text-4xl font-bold text-slate-600 mb-1 animate-pulse">:</div>
      {/* Minutes */}
      <div className="flex flex-col items-center">
        <button onClick={() => cycle('m', 59)} className="p-2 text-slate-500 hover:text-cyan-400 active:scale-90 transition-transform"><ChevronUp className="w-5 h-5"/></button>
        <div className="text-4xl font-bold text-white w-20 text-center tabular-nums font-mono">{time.m.toString().padStart(2, '0')}</div>
        <button onClick={() => cycleDown('m', 59)} className="p-2 text-slate-500 hover:text-cyan-400 active:scale-90 transition-transform"><ChevronDown className="w-5 h-5"/></button>
      </div>
      {/* AM/PM */}
      <div className="ml-4 flex flex-col gap-2">
        <button onClick={() => setTime(p => ({...p, ampm: 'AM'}))} className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${time.ampm === 'AM' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>AM</button>
        <button onClick={() => setTime(p => ({...p, ampm: 'PM'}))} className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${time.ampm === 'PM' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>PM</button>
      </div>
    </div>
  );
};

// --- COMPONENT: NAVIGATION BAR ---
const NavBar = ({ activeTab, setActiveTab }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 p-2 pb-6 flex justify-around items-center z-50 safe-area-pb shadow-2xl">
    <NavBtn id="home" icon={Home} label="Home" active={activeTab} set={setActiveTab} />
    <NavBtn id="voice-lab" icon={Fingerprint} label="Voice Lab" active={activeTab} set={setActiveTab} />
    <NavBtn id="lucy" icon={MessageCircle} label="Lucy AI" active={activeTab} set={setActiveTab} />
    <NavBtn id="reminders" icon={Clock} label="Reminders" active={activeTab} set={setActiveTab} />
  </div>
);

const NavBtn = ({ id, icon: Icon, label, active, set }) => (
  <button 
    onClick={() => { set(id); unlockAudioContext(); }}
    className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 ${
      active === id 
        ? 'text-cyan-400 bg-cyan-950/50 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
        : 'text-slate-400 hover:text-slate-200'
    }`}
  >
    <Icon className="w-6 h-6" strokeWidth={active === id ? 2.5 : 2} />
    <span className="text-[10px] font-medium tracking-wide">{label}</span>
  </button>
);

// --- COMPONENT: SETTINGS MODAL ---
const SettingsModal = ({ isOpen, onClose, onUpdate }) => {
  const [elKey, setElKey] = useState(CONFIG.elevenLabsKey);
  const [gKey, setGKey] = useState(CONFIG.geminiKey);
  const [soberDate, setSoberDate] = useState(localStorage.getItem('sobertone_start_date') || new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSave = () => {
    // TRIM WHITESPACE - Crucial fix for mobile copy/paste
    localStorage.setItem('sobertone_el_key', elKey.trim());
    localStorage.setItem('sobertone_gemini_key', gKey.trim());
    localStorage.setItem('sobertone_start_date', soberDate);
    onUpdate(); 
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 p-4">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-700 w-full max-w-sm space-y-6 shadow-2xl transform transition-all scale-100">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white">SoberTone Engine</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><X className="text-slate-400" /></button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
            <p className="text-xs text-blue-200 flex gap-2">
              <Info className="w-4 h-4 shrink-0" />
              Enter keys here to enable Real AI & Voice.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Sobriety Start Date
            </label>
            <input 
              type="date" 
              value={soberDate}
              onChange={(e) => setSoberDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-3 h-3" /> ElevenLabs API Key
            </label>
            <input 
              type="password" 
              value={elKey}
              onChange={(e) => setElKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:border-slate-500 outline-none"
              placeholder="sk_..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-3 h-3" /> Gemini API Key
            </label>
            <input 
              type="password" 
              value={gKey}
              onChange={(e) => setGKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:border-slate-500 outline-none"
              placeholder="AIza..."
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-cyan-900/20 transition-transform active:scale-95"
        >
          Save & Restart App
        </button>
      </div>
    </div>
  );
};

// --- COMPONENT: VOICE LAB ---
const VoiceLabView = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceModel, setVoiceModel] = useState(localStorage.getItem('sobertone_voice_model') ? JSON.parse(localStorage.getItem('sobertone_voice_model')) : null);
  const [audioBlob, setAudioBlob] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // REAL Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        // Simulate "Saving" the model
        const mockModel = { id: 'cloned-voice-1', name: "Mom's Voice (AI)", date: new Date().toLocaleDateString() };
        setVoiceModel(mockModel);
        localStorage.setItem('sobertone_voice_model', JSON.stringify(mockModel));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access needed. Check browser settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      new Audio(url).play();
    } else {
      alert("Recording saved to memory. (Refresh clears it in demo mode)");
    }
  };

  return (
    <div className="p-6 space-y-6 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500" onClick={unlockAudioContext}>
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          Voice Lab <span className="bg-cyan-500/20 text-cyan-400 text-[10px] px-2 py-1 rounded-full uppercase tracking-widest border border-cyan-500/30">Beta</span>
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">Create a neural clone of a loved one's voice to power Lucy.</p>
      </header>

      {!voiceModel ? (
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-3xl border border-slate-700/50 shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Fingerprint className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">How to Clone</h3>
                <p className="text-xs text-slate-400 mt-1">High-fidelity voice replication engine</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                "Find a quiet room.",
                "Press mic to start. Press again to stop.",
                "Speak naturally, reading the script below."
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-300 bg-slate-950/30 p-3 rounded-xl border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">{i+1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Recorder */}
          <div className="bg-slate-800 p-8 rounded-[2rem] border border-slate-700 text-center space-y-8 relative overflow-hidden shadow-2xl">
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse"></div>
              )}
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative z-10 w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                  isRecording 
                  ? 'bg-red-500 border-red-400 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.4)]' 
                  : 'bg-gradient-to-b from-slate-700 to-slate-800 border-slate-600 hover:border-cyan-500 shadow-xl'
                }`}
              >
                {isRecording ? <Square className="w-8 h-8 text-white fill-current" /> : <Mic className="w-10 h-10 text-slate-400" />}
              </button>
            </div>
            
            <div className="text-left bg-slate-950/50 p-5 rounded-2xl border border-white/5">
              <p className="text-slate-500 text-xs uppercase font-bold mb-2 tracking-wider">Script</p>
              <p className="text-slate-200 italic text-lg font-serif leading-relaxed">
                "I believe in you. No matter how hard it gets, remember that you are loved and you are strong enough to get through this."
              </p>
            </div>
            
            <p className="text-xs text-slate-500">{isRecording ? "Recording... Tap to Stop" : "Tap mic to start"}</p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-cyan-900/40 to-slate-900 p-8 rounded-[2rem] border border-cyan-500/30 space-y-6 animate-in zoom-in duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <div className="flex flex-col gap-4 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-900/20">
              <Fingerprint className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{voiceModel.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider flex items-center gap-1 border border-green-500/20">
                  <Check className="w-3 h-3" /> Active
                </span>
                <span className="text-slate-500 text-xs">{voiceModel.date}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center mb-3">
                <p className="text-xs text-slate-500 uppercase font-bold">Voice DNA</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={playRecording} className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 hover:bg-slate-700 hover:text-white transition-all border border-slate-700">
                <Play className="w-5 h-5 fill-current ml-1" />
              </button>
              <div className="h-10 flex-1 flex items-center gap-[3px] opacity-60">
                {[...Array(25)].map((_,i) => (
                  <div key={i} className="w-1.5 bg-cyan-400 rounded-full transition-all duration-1000 animate-pulse" style={{
                    height: `${30 + Math.random() * 70}%`,
                    animationDelay: `${i * 0.05}s`
                  }}></div>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => { setVoiceModel(null); setAudioBlob(null); localStorage.removeItem('sobertone_voice_model'); }} className="w-full py-4 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium">
            <Trash2 className="w-4 h-4" /> Delete Model
          </button>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: LUCY CHAT ---
const LucyChatView = () => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'lucy', text: "Hi, I'm Lucy. I'm here to support you using the voice of someone you trust. How are you feeling right now?" }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages, isThinking]);

  const speakText = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.pitch = 1.1; 
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // AI LOGIC: ERROR REPORTING
  const generateAIResponse = async (userText) => {
    setIsThinking(true);
    try {
      const keyToUse = CONFIG.geminiKey;
      if (!keyToUse) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        finishResponse("I can't connect to my brain. Please add a valid Gemini API Key in Settings.");
        return;
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToUse}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: `You are Lucy, an empathetic AI addiction recovery companion. Be supportive, gentle, and concise. User: "${userText}"` }] }] })
      });
      
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      finishResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm listening.");
    } catch (error) {
      console.error(error);
      finishResponse(`Connection Error: ${error.message}. Please check your API Key.`);
    }
  };

  const finishResponse = (text) => {
    setMessages(prev => [...prev, { id: Date.now(), sender: 'lucy', text }]);
    setIsThinking(false);
    speakText(text);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: input }]);
    setInput("");
    generateAIResponse(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-90px)] bg-slate-950" onClick={unlockAudioContext}>
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full p-[2px] ${isSpeaking ? 'animate-pulse bg-cyan-400' : 'bg-gradient-to-br from-cyan-400 to-purple-500'}`}>
              <img 
                src={ASSETS.mascot} 
                className="w-full h-full rounded-full object-cover bg-slate-800" 
                alt="Lucy" 
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentNode.classList.add('bg-cyan-500'); }}
              />
            </div>
            {isSpeaking && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-slate-900 rounded-full p-1 border-2 border-slate-900">
                <Volume2 className="w-3 h-3" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Lucy</h3>
            <p className="text-xs text-cyan-400 flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3" /> AI Companion
            </p>
          </div>
        </div>
        <button onClick={() => { setVoiceEnabled(!voiceEnabled); window.speechSynthesis.cancel(); }} className={`p-3 rounded-xl transition-colors ${voiceEnabled ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
          {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-4">
        {!CONFIG.geminiKey && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-3 text-yellow-200 text-xs">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>Demo Mode: AI Brain is inactive. Add a free Gemini API Key in Settings.</p>
            </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'lucy' && <img src={ASSETS.mascot} className="w-8 h-8 rounded-full mr-2 self-end mb-1 border border-slate-700" onError={(e) => e.target.style.display = 'none'} />}
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-md ${
              msg.sender === 'user' 
                ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start items-center gap-2 animate-in fade-in">
            <img src={ASSETS.mascot} className="w-8 h-8 rounded-full border border-slate-700" onError={(e) => e.target.style.display = 'none'} />
            <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-700 flex gap-1">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-0"></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3 pb-6">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type message to Lucy..."
          className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none placeholder:text-slate-600"
        />
        <button type="submit" disabled={!input.trim() || isThinking} className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 p-4 rounded-2xl transition-all shadow-lg shadow-cyan-500/20">
          <ArrowRight className="w-6 h-6" strokeWidth={3} />
        </button>
      </form>
    </div>
  );
};

// --- COMPONENT: REMINDERS VIEW ---
const RemindersView = () => {
  const [alarms, setAlarms] = useState([]);
  const [reminderText, setReminderText] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [ringingAlarm, setRingingAlarm] = useState(null);
  const audioPlayerRef = useRef(null);
  const speechTimeoutRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const h24 = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${h24}:${m}`;
      
      alarms.forEach(a => { 
        if (a.isActive && a.time === currentTime && !ringingAlarm) {
            triggerAlarm(a); 
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [alarms, ringingAlarm]);

  const generateAudio = async (text) => {
    if (CONFIG.elevenLabsKey) {
      try {
        // Added streaming optimization
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM?optimize_streaming_latency=0`, {
          method: "POST", headers: { "xi-api-key": CONFIG.elevenLabsKey, "Content-Type": "application/json" },
          body: JSON.stringify({ text, model_id: "eleven_monolingual_v1" })
        });
        if (!res.ok) throw new Error(`ElevenLabs Error ${res.status}`);
        return URL.createObjectURL(await res.blob());
      } catch (e) { 
        console.error(e);
        alert(`Voice Gen Error: ${e.message}. Using System Voice.`);
        return null; 
      }
    }
    return null;
  };

  const addAlarm = async () => {
    if (!reminderTime || !reminderText) return;
    setIsGenerating(true);
    const audioUrl = await generateAudio(reminderText);
    setAlarms([...alarms, { id: Date.now(), time: reminderTime, text: reminderText, audioUrl, isActive: true }]);
    setReminderText('');
    setIsGenerating(false);
  };

  const triggerAlarm = (alarm) => {
    setRingingAlarm(alarm);
    if (audioPlayerRef.current) { audioPlayerRef.current.pause(); audioPlayerRef.current.currentTime = 0; }
    window.speechSynthesis.cancel();
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);

    if (alarm.audioUrl) {
      audioPlayerRef.current = new Audio(alarm.audioUrl);
      audioPlayerRef.current.loop = true;
      audioPlayerRef.current.play().catch(e => {
          console.error("Play blocked", e);
          triggerSystemVoice(alarm);
      });
    } else {
      triggerSystemVoice(alarm);
    }
  };

  const triggerSystemVoice = (alarm) => {
      window.activeAlarmId = alarm.id;
      const u = new SpeechSynthesisUtterance(alarm.text);
      u.rate = 0.9;
      const speakLoop = () => {
        if (window.activeAlarmId !== alarm.id) return; 
        window.speechSynthesis.speak(u);
        u.onend = () => { if (window.activeAlarmId === alarm.id) speechTimeoutRef.current = setTimeout(speakLoop, 1500); };
      };
      speakLoop();
  };

  const stopAlarm = () => {
    if (audioPlayerRef.current) { audioPlayerRef.current.pause(); audioPlayerRef.current.currentTime = 0; }
    window.activeAlarmId = null; 
    window.speechSynthesis.cancel(); 
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    if (ringingAlarm) { setAlarms(prev => prev.map(a => a.id === ringingAlarm.id ? { ...a, isActive: false } : a)); }
    setRingingAlarm(null);
  };

  return (
    <div className="p-6 pb-32 space-y-8 animate-in slide-in-from-right duration-500" onClick={unlockAudioContext}>
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-white relative z-10">
          <div className="p-2 bg-purple-500/20 rounded-lg"><Sparkles className="w-5 h-5 text-purple-400" /></div>
          Create AI Reminder
        </h2>
        <div className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-bold ml-1 uppercase tracking-wider">Script for Lucy</label>
            <textarea value={reminderText} onChange={(e) => setReminderText(e.target.value)} placeholder="Hey, it's time for your meditation. We are so proud of you." className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none h-24 resize-none leading-relaxed" />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-bold ml-1 uppercase tracking-wider">Time</label>
            <TimePicker value={reminderTime} onChange={setReminderTime} />
          </div>
          <button onClick={addAlarm} disabled={!reminderTime || !reminderText || isGenerating} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30">
            {isGenerating ? <Loader className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
            {isGenerating ? "Synthesizing..." : "Set AI Reminder"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase pl-2">Scheduled</h3>
        {alarms.map(alarm => (
          <div key={alarm.id} className={`bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 flex justify-between items-center backdrop-blur-sm transition-all ${!alarm.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-5">
                <div className="text-2xl text-white font-light tracking-tight">{alarm.time}</div>
                <div className="h-8 w-px bg-slate-700"></div>
                <div className="flex flex-col max-w-[160px]">
                    <span className="text-slate-200 text-sm font-medium truncate">"{alarm.text}"</span>
                    <span className="text-purple-400 text-[10px] font-bold flex items-center gap-1 uppercase mt-1"><Brain className="w-3 h-3"/> Generated</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${alarm.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                <button onClick={() => setAlarms(alarms.filter(a => a.id !== alarm.id))} className="p-3 text-slate-500 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
            </div>
          </div>
        ))}
      </div>

      {ringingAlarm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-lg animate-in zoom-in duration-300">
          <div className="w-full max-w-sm text-center relative p-8">
            <div className="w-40 h-40 mx-auto mb-8 relative">
               <div className="absolute inset-0 bg-cyan-500/30 rounded-full animate-ping"></div>
               <div className="absolute inset-0 bg-purple-500/30 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
               <img 
                 src={ASSETS.mascot} 
                 className="w-full h-full rounded-full border-4 border-slate-800 relative z-10 shadow-2xl bg-slate-800 object-cover" 
                 alt="Lucy" 
                 onError={(e) => e.target.src = 'https://via.placeholder.com/150/3b82f6/ffffff?text=Lucy'} 
               />
            </div>
            <h2 className="text-7xl font-bold text-white tracking-tighter mb-2">{ringingAlarm.time}</h2>
            <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/10 backdrop-blur-md mb-8">
                <p className="text-cyan-200 text-lg font-medium leading-relaxed">"{ringingAlarm.text}"</p>
            </div>
            <button onClick={stopAlarm} className="w-full py-5 bg-white hover:bg-slate-200 text-slate-900 rounded-2xl font-bold text-xl shadow-xl transform active:scale-95 transition-all">I'm Listening</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: ASSESSMENT ---
const AssessmentView = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const qs = [
    { t: "How often do you use substances to cope with stress?", o: [{l:"Rarely",v:1}, {l:"Sometimes",v:3}, {l:"Daily",v:5}] },
    { t: "Have you unsuccessfully tried to cut down?", o: [{l:"Never",v:0}, {l:"Once",v:2}, {l:"Multiple times",v:5}] },
    { t: "Do you hide your usage from friends/family?", o: [{l:"No",v:0}, {l:"Yes",v:5}] },
    { t: "Has it impacted your work or responsibilities?", o: [{l:"No",v:0}, {l:"Slightly",v:2}, {l:"Severely",v:5}] }
  ];

  const answer = (v) => {
    const ns = score + v;
    if (step < qs.length - 1) { setScore(ns); setStep(step + 1); } else { 
      setScore(ns); 
      setFinished(true);
      localStorage.setItem('sobertone_stage_score', ns);
      onComplete();
    }
  };

  const getStageFromScore = (s) => s < 5 ? "Stage 1" : s < 10 ? "Stage 2" : s < 15 ? "Stage 3" : "Stage 4+";

  return (
    <div className="p-6 pt-10 pb-32 animate-in fade-in" onClick={unlockAudioContext}>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-purple-400" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-white">Assessment</h2>
            <p className="text-slate-400 text-sm">Determine your support stage.</p>
        </div>
      </div>

      {!finished ? (
        <div className="bg-slate-800 p-8 rounded-[2rem] border border-slate-700 shadow-xl">
          <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-6">
            <span>Question {step + 1}</span>
            <span>{qs.length} Total</span>
          </div>
          <h3 className="text-xl text-white font-medium mb-10 leading-relaxed">{qs[step].t}</h3>
          <div className="space-y-3">
            {qs[step].o.map((opt, i) => (
              <button key={i} onClick={() => answer(opt.v)} className="w-full p-5 text-left rounded-2xl bg-slate-900 hover:bg-slate-700 border border-slate-800 text-slate-200 transition-all flex justify-between items-center group active:scale-[0.98]">
                {opt.l}
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2rem] border border-slate-700 text-center space-y-8 shadow-2xl">
          <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-2">Your Assessment Result</p>
            <h3 className="text-4xl font-bold text-white mb-4">{getStageFromScore(score)}</h3>
            <p className="text-slate-300 leading-relaxed text-sm px-4">
              Based on your score, we recommend utilizing <strong>Lucy's daily check-ins</strong> and setting up <strong>AI Reminders</strong> immediately.
            </p>
          </div>
          <button onClick={() => {setStep(0); setScore(0); setFinished(false)}} className="text-cyan-400 font-bold hover:text-cyan-300 py-2 px-4 rounded-xl hover:bg-cyan-500/10 transition-colors">Retake Assessment</button>
        </div>
      )}
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const SobertoneApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [soberDays, setSoberDays] = useState(0);
  const [stageScore, setStageScore] = useState(null);

  useWakeLock();

  const refreshData = () => {
    setSoberDays(getDaysSober());
    setStageScore(getSavedStage());
  };

  useEffect(() => {
    if (!localStorage.getItem('sobertone_start_date')) {
      localStorage.setItem('sobertone_start_date', new Date().toISOString().split('T')[0]);
    }
    refreshData();
  }, []);

  const getStageDisplay = () => {
    if (stageScore === null) return "Unset";
    if (stageScore < 5) return "Stage 1";
    if (stageScore < 10) return "Stage 2";
    if (stageScore < 15) return "Stage 3";
    return "Stage 4+";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 overflow-hidden" onClick={unlockAudioContext}>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onUpdate={refreshData} />

      {activeTab === 'home' && (
        <div className="p-6 pb-32 space-y-8 animate-in fade-in duration-500">
          <header className="flex items-center justify-between pt-4">
            <img src={ASSETS.logo} alt="SoberTone" className="h-12 w-auto object-contain" />
            <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors backdrop-blur-sm">
              <Settings className="w-6 h-6 text-slate-400" />
            </button>
          </header>

          {/* Hero Card */}
          <div className="bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] rounded-[2.5rem] p-8 shadow-2xl shadow-cyan-900/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-colors duration-700"></div>
            
            <div className="relative z-10 flex flex-col items-start">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white mb-4 border border-white/20">
                <Sparkles className="w-3 h-3" /> Daily Motivation
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 leading-tight">You are stronger<br/>than you think.</h2>
              <p className="text-cyan-50/90 text-sm mb-8 max-w-[90%] leading-relaxed font-medium">
                "Recovery is not about seeing the whole staircase, just taking the first step."
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setActiveTab('lucy')} className="flex-1 bg-white text-blue-900 py-4 rounded-2xl font-bold text-sm hover:bg-blue-50 transition-all shadow-lg flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Talk to Lucy
                </button>
                <button onClick={() => setActiveTab('voice-lab')} className="px-6 bg-blue-900/40 text-white py-4 rounded-2xl font-bold text-sm hover:bg-blue-900/60 transition-all backdrop-blur-md border border-white/20">
                  <Fingerprint className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Mascot Peeking Image */}
            <img src={ASSETS.mascot} className="absolute -bottom-10 -right-6 w-40 opacity-20 grayscale mix-blend-overlay rotate-12 pointer-events-none" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/40 p-6 rounded-[2rem] border border-slate-700/50 backdrop-blur-sm">
                <div className="text-4xl font-bold text-white mb-2">{soberDays}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Days Sober</div>
            </div>
            <button onClick={() => setActiveTab('assessment')} className="bg-slate-800/40 p-6 rounded-[2rem] border border-slate-700/50 backdrop-blur-sm text-left hover:bg-slate-800/60 transition-colors group">
                <div className="text-4xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors flex items-center gap-2">
                  {getStageDisplay()} <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Check Stage</div>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'voice-lab' && <VoiceLabView />}
      {activeTab === 'lucy' && <LucyChatView />}
      {activeTab === 'assessment' && <AssessmentView onComplete={refreshData} />}
      {activeTab === 'reminders' && <RemindersView />}

      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default SobertoneApp;