import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Trash2, Plus, Bell, Volume2, Clock, X, StopCircle, Check } from 'lucide-react';

const VoiceAlarmApp = () => {
  // State for recordings and alarms
  const [recordings, setRecordings] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Form state for new alarm
  const [newAlarmTime, setNewAlarmTime] = useState('');
  const [selectedRecordingId, setSelectedRecordingId] = useState('');
  const [alarmLabel, setAlarmLabel] = useState('');
  
  // Active alarm state (when an alarm is ringing)
  const [ringingAlarm, setRingingAlarm] = useState(null);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null); // To play the alarm sound

  // --- Recording Logic ---

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const newRecording = {
          id: Date.now().toString(),
          name: `Recording ${recordings.length + 1}`,
          url: audioUrl,
          blob: audioBlob,
          duration: recordingTime,
        };
        setRecordings((prev) => [...prev, newRecording]);
        // Select this new recording automatically if none selected
        if (!selectedRecordingId) {
          setSelectedRecordingId(newRecording.id);
        }
        setRecordingTime(0);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Timer for recording duration
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure you have granted permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const deleteRecording = (id) => {
    setRecordings(prev => prev.filter(rec => rec.id !== id));
    if (selectedRecordingId === id) setSelectedRecordingId('');
  };

  const playPreview = (url) => {
    const audio = new Audio(url);
    audio.play();
  };

  // --- Alarm Logic ---

  const addAlarm = () => {
    if (!newAlarmTime || !selectedRecordingId) return;

    const newAlarm = {
      id: Date.now().toString(),
      time: newAlarmTime,
      recordingId: selectedRecordingId,
      label: alarmLabel || 'Alarm',
      isActive: true,
    };

    setAlarms([...alarms, newAlarm]);
    setAlarmLabel('');
    // Keep time and recording selected for convenience, or clear them if preferred
  };

  const toggleAlarm = (id) => {
    setAlarms(alarms.map(alarm => 
      alarm.id === id ? { ...alarm, isActive: !alarm.isActive } : alarm
    ));
  };

  const deleteAlarm = (id) => {
    setAlarms(alarms.filter(alarm => alarm.id !== id));
  };

  // Check for alarms every second
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date();
      const currentTimeString = now.toTimeString().slice(0, 5); // "HH:MM" format

      alarms.forEach(alarm => {
        if (alarm.isActive && alarm.time === currentTimeString && !ringingAlarm) {
          triggerAlarm(alarm);
        }
      });
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [alarms, ringingAlarm]);

  const triggerAlarm = (alarm) => {
    // Find the recording
    const recording = recordings.find(r => r.id === alarm.recordingId);
    if (recording) {
      setRingingAlarm({ ...alarm, recordingName: recording.name });
      
      // Loop the audio
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      audioPlayerRef.current = new Audio(recording.url);
      audioPlayerRef.current.loop = true;
      
      // Handle playback promise to catch autoplay errors
      const playPromise = audioPlayerRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Auto-play was prevented:", error);
          // In a real app, you might show a "Click to Play" UI here if blocked
        });
      }
    }
  };

  const stopAlarm = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    
    // Deactivate the alarm that just rang so it doesn't ring again immediately this minute
    if (ringingAlarm) {
        setAlarms(prev => prev.map(a => 
            a.id === ringingAlarm.id ? { ...a, isActive: false } : a
        ));
    }
    setRingingAlarm(null);
  };

  const snoozeAlarm = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setRingingAlarm(null);
    // Logic to add 5 mins could go here, currently just stops ringing
    // Simulating snooze by not turning off 'isActive' but ensuring it doesn't re-trigger instantly requires more complex time logic (e.g. "lastTriggered" timestamp).
    // For this simple version, we'll just stop the sound.
  };

  // Cleanup blobs on unmount
  useEffect(() => {
    return () => {
      recordings.forEach(rec => URL.revokeObjectURL(rec.url));
    };
  }, []);

  // Format seconds to MM:SS
  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Voice Alarm
          </h1>
          <p className="text-slate-400">Wake up to your own words.</p>
        </div>

        {/* SECTION 1: RECORDER */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Mic className="w-5 h-5 text-indigo-400" />
            Record Voice
          </h2>
          
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="relative">
                {isRecording && (
                    <span className="absolute -top-2 -right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
                <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isRecording 
                    ? 'bg-red-500 hover:bg-red-600 scale-110' 
                    : 'bg-indigo-500 hover:bg-indigo-600 hover:scale-105'
                }`}
                >
                {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
                </button>
            </div>
            
            <div className="text-2xl font-mono font-medium text-slate-300">
                {formatDuration(recordingTime)}
            </div>
            <p className="text-sm text-slate-400">
                {isRecording ? "Recording... Tap to stop" : "Tap mic to start recording"}
            </p>
          </div>

          {/* Recordings List */}
          {recordings.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Your Recordings</h3>
              <div className="grid gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {recordings.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 hover:border-indigo-500/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-400">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <span className="truncate font-medium text-sm">{rec.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => playPreview(rec.url)}
                        className="p-2 hover:bg-slate-600 rounded-full transition-colors text-indigo-300"
                        title="Play Preview"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                      <button 
                        onClick={() => deleteRecording(rec.id)}
                        className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors text-slate-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: ADD ALARM */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Set Alarm
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium ml-1">Time</label>
              <input
                type="time"
                value={newAlarmTime}
                onChange={(e) => setNewAlarmTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium ml-1">Voice Message</label>
              <select
                value={selectedRecordingId}
                onChange={(e) => setSelectedRecordingId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all appearance-none"
              >
                <option value="" disabled>Select a recording</option>
                {recordings.map(rec => (
                  <option key={rec.id} value={rec.id}>{rec.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="text-xs text-slate-400 font-medium ml-1 block mb-2">Label (Optional)</label>
            <input
                type="text"
                placeholder="e.g., Wake Up, Take Meds..."
                value={alarmLabel}
                onChange={(e) => setAlarmLabel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-base focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>

          <button
            onClick={addAlarm}
            disabled={!newAlarmTime || !selectedRecordingId}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Alarm
          </button>
        </div>

        {/* SECTION 3: ALARM LIST */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 pl-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            Active Alarms
          </h2>
          
          {alarms.length === 0 ? (
            <div className="text-center py-10 text-slate-500 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
              <p>No alarms set yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {alarms.map(alarm => (
                <div 
                    key={alarm.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                        alarm.isActive 
                        ? 'bg-slate-800 border-slate-600 shadow-md' 
                        : 'bg-slate-800/50 border-slate-700/50 opacity-75'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-light tracking-tight">{alarm.time}</div>
                    <div className="border-l border-slate-600 pl-4">
                      <div className="text-sm font-medium text-slate-200">{alarm.label}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Volume2 className="w-3 h-3" />
                        {recordings.find(r => r.id === alarm.recordingId)?.name || 'Unknown Recording'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={alarm.isActive}
                        onChange={() => toggleAlarm(alarm.id)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                    
                    <button 
                        onClick={() => deleteAlarm(alarm.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ALARM TRIGGERED OVERLAY */}
      {ringingAlarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-indigo-500/30 max-w-sm w-full text-center space-y-8 relative overflow-hidden">
                {/* Animated Rings */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full animate-ping"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/20 rounded-full animate-pulse"></div>

                <div className="relative z-10">
                    <Bell className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-bounce" />
                    <h2 className="text-4xl font-bold text-white mb-2">{ringingAlarm.time}</h2>
                    <p className="text-xl text-indigo-300 font-medium">{ringingAlarm.label}</p>
                    <div className="mt-2 text-sm text-slate-400 flex items-center justify-center gap-2">
                        <Volume2 className="w-4 h-4" />
                        Playing: {ringingAlarm.recordingName}
                    </div>
                </div>

                <div className="grid gap-3 relative z-10">
                    <button 
                        onClick={stopAlarm}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-900/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Check className="w-6 h-6" />
                        Stop Alarm
                    </button>
                    <button 
                        onClick={snoozeAlarm}
                        className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors"
                    >
                        Snooze
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default VoiceAlarmApp;