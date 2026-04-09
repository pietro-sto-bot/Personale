import { useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UseScannerReturn {
  isScanning: boolean;
  error: string | null;
  startScan: (elementId: string, onDetected: (isbn: string) => void) => Promise<void>;
  stopScan: () => Promise<void>;
}

export function useScanner(): UseScannerReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScan = useCallback(async (elementId: string, onDetected: (isbn: string) => void) => {
    try {
      setError(null);
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 120 } },
        (decodedText) => {
          onDetected(decodedText);
        },
        undefined,
      );
      setIsScanning(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore fotocamera');
      setIsScanning(false);
    }
  }, []);

  const stopScan = useCallback(async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  return { isScanning, error, startScan, stopScan };
}
