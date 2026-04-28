import { useState, useEffect, useCallback } from 'react';

export function useVoiceActivation(onTrigger: () => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onerror = (event: any) => setError(event.error);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.toLowerCase();
      
      // Look for multiple keywords
      if (command.includes('help') || command.includes('emergency') || command.includes('sos')) {
        onTrigger();
      }
    };

    recognition.start();
    return recognition;
  }, [onTrigger]);

  return { isListening, startListening, error };
}
