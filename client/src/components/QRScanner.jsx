import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan, onError }) {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const scannerRef = useRef(null);
    const containerRef = useRef(null);

    const startScanner = async () => {
        try {
            setError('');
            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1,
                },
                (decodedText) => {
                    stopScanner();
                    onScan(decodedText);
                },
                (errorMessage) => {
                    // Ignore scan errors (no QR found in frame)
                }
            );
            setScanning(true);
        } catch (err) {
            const msg = err?.message || 'Camera access denied';
            setError(msg);
            if (onError) onError(msg);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                await scannerRef.current.clear();
            } catch (e) {
                // ignore
            }
            scannerRef.current = null;
        }
        setScanning(false);
    };

    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, []);

    return (
        <div className="space-y-4">
            <div
                id="qr-reader"
                ref={containerRef}
                className="rounded-xl overflow-hidden bg-dark-800"
                style={{ minHeight: scanning ? '300px' : '0px' }}
            ></div>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div className="flex gap-3">
                {!scanning ? (
                    <button
                        id="start-scanner-btn"
                        onClick={startScanner}
                        className="btn btn-primary flex-1"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Open Scanner
                    </button>
                ) : (
                    <button
                        id="stop-scanner-btn"
                        onClick={stopScanner}
                        className="btn btn-danger flex-1"
                    >
                        Stop Scanner
                    </button>
                )}
            </div>
        </div>
    );
}
