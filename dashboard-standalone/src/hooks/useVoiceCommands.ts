/**
 * Voice Commands Hook
 *
 * "Create it in the Mind, Watch it Come Alive"
 *
 * Enables hands-free voice control of LIV8 OS.
 * Users can navigate, create content, chat with AI staff, and more using voice.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceCommand {
  pattern: RegExp;
  action: string;
  handler?: (matches: RegExpMatchArray) => void;
}

interface UseVoiceCommandsOptions {
  onCommand?: (command: string, action: string) => void;
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
  continuous?: boolean;
  wakeWord?: string;
}

interface VoiceCommandsReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  speak: (text: string) => Promise<void>;
  isAwake: boolean;
}

// Define voice commands
const VOICE_COMMANDS: VoiceCommand[] = [
  // Navigation
  { pattern: /^(go to|open|show|navigate to) dashboard$/i, action: 'navigate:dashboard' },
  { pattern: /^(go to|open|show) (ai )?staff$/i, action: 'navigate:staff' },
  { pattern: /^(go to|open|show) (conversations|convos|messages)$/i, action: 'navigate:convos' },
  { pattern: /^(go to|open|show) calls$/i, action: 'navigate:calls' },
  { pattern: /^(go to|open|show) campaigns$/i, action: 'navigate:campaigns' },
  { pattern: /^(go to|open|show) (opportunities|leads|deals)$/i, action: 'navigate:opportunities' },
  { pattern: /^(go to|open|show) content( studio)?$/i, action: 'navigate:content' },
  { pattern: /^(go to|open|show) calendar$/i, action: 'navigate:calendar' },
  { pattern: /^(go to|open|show) (analytics|stats|statistics)$/i, action: 'navigate:analytics' },
  { pattern: /^(go to|open|show) settings$/i, action: 'navigate:settings' },

  // AI Staff
  { pattern: /^talk to (marketing|sales|support|assistant|caller|manager)$/i, action: 'staff:select' },
  { pattern: /^(chat with|message|speak to) (.+) (agent|staff|assistant)$/i, action: 'staff:select' },

  // Content Creation
  { pattern: /^create (a )?(social post|post|content) about (.+)$/i, action: 'content:create' },
  { pattern: /^write (a )?(blog|article|blog post) about (.+)$/i, action: 'content:blog' },
  { pattern: /^draft (an )?email (about|for) (.+)$/i, action: 'content:email' },
  { pattern: /^generate (an )?image (of|about) (.+)$/i, action: 'content:image' },

  // Quick Actions
  { pattern: /^(schedule|post) (this|it) (for )?tomorrow$/i, action: 'schedule:tomorrow' },
  { pattern: /^(schedule|post) (this|it) (for )?next week$/i, action: 'schedule:nextweek' },
  { pattern: /^approve( this)?$/i, action: 'approve' },
  { pattern: /^reject( this)?$/i, action: 'reject' },
  { pattern: /^send( this)?$/i, action: 'send' },
  { pattern: /^save( this)?$/i, action: 'save' },

  // System
  { pattern: /^(what can you do|help|commands)$/i, action: 'help' },
  { pattern: /^(stop|cancel|never mind)$/i, action: 'cancel' },
  { pattern: /^(hey liv|okay liv|liv eight)$/i, action: 'wake' }
];

export function useVoiceCommands(options: UseVoiceCommandsOptions = {}): VoiceCommandsReturn {
  const {
    onCommand,
    onTranscript,
    onError,
    language = 'en-US',
    continuous = true,
    wakeWord = 'hey liv'
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAwake, setIsAwake] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const awakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const transcriptText = result[0].transcript.trim().toLowerCase();

        setTranscript(transcriptText);
        onTranscript?.(transcriptText);

        // Only process final results
        if (result.isFinal) {
          processCommand(transcriptText);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        onError?.(event.error);

        if (event.error === 'no-speech') {
          // Restart if no speech detected
          if (isListening) {
            recognitionRef.current?.start();
          }
        }
      };

      recognitionRef.current.onend = () => {
        // Restart if still supposed to be listening
        if (isListening && continuous) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // Already started
          }
        }
      };
    }

    // Initialize speech synthesis
    synthesisRef.current = window.speechSynthesis;

    return () => {
      recognitionRef.current?.stop();
      if (awakeTimeoutRef.current) {
        clearTimeout(awakeTimeoutRef.current);
      }
    };
  }, [language, continuous, isListening, onTranscript, onError]);

  // Process voice command
  const processCommand = useCallback((text: string) => {
    // Check for wake word
    if (text.includes(wakeWord.toLowerCase())) {
      setIsAwake(true);
      speak("I'm listening");

      // Stay awake for 30 seconds
      if (awakeTimeoutRef.current) {
        clearTimeout(awakeTimeoutRef.current);
      }
      awakeTimeoutRef.current = setTimeout(() => {
        setIsAwake(false);
      }, 30000);

      return;
    }

    // Only process commands if awake (or if wake word not required)
    if (!isAwake && wakeWord) {
      return;
    }

    // Match against commands
    for (const command of VOICE_COMMANDS) {
      const match = text.match(command.pattern);
      if (match) {
        console.log('Voice command matched:', command.action, match);
        onCommand?.(text, command.action);

        // Reset awake timeout
        if (awakeTimeoutRef.current) {
          clearTimeout(awakeTimeoutRef.current);
        }
        awakeTimeoutRef.current = setTimeout(() => {
          setIsAwake(false);
        }, 30000);

        // Provide audio feedback
        if (command.action.startsWith('navigate:')) {
          const destination = command.action.split(':')[1];
          speak(`Opening ${destination}`);
        }

        return;
      }
    }

    // No command matched - might be conversational input for AI staff
    if (isAwake) {
      onCommand?.(text, 'conversation');
    }
  }, [isAwake, wakeWord, onCommand]);

  // Text to speech
  const speak = useCallback(async (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!synthesisRef.current) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      synthesisRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 1;
      utterance.pitch = 1;

      // Try to use a nice voice
      const voices = synthesisRef.current.getVoices();
      const preferredVoice = voices.find(v =>
        v.name.includes('Samantha') ||
        v.name.includes('Google') ||
        v.name.includes('Microsoft')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      synthesisRef.current.speak(utterance);
    });
  }, [language]);

  // Control functions
  const startListening = useCallback(() => {
    if (recognitionRef.current && isSupported) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        // Already started
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setIsAwake(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    speak,
    isAwake
  };
}

export default useVoiceCommands;
