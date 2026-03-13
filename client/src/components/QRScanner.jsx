import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getCurrentLocationWithFallback, requestLocationPermission, openLocationSettings } from '../utils/locationUtils';

export default function QRScanner({ onScan, onError }) {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [locationStatus, setLocationStatus] = useState('idle'); // idle | checking | granted | denied
    const [scanPhase, setScanPhase] = useState('idle'); // idle | locating | submitting
    const scannerRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        checkLocationPermission();
        return () => {
            stopScanner();
        };
    }, []);

    const checkLocationPermission = async () => {
        setLocationStatus('checking');
        try {
            const permission = await requestLocationPermission();
            setLocationStatus(permission === 'granted' ? 'granted' : 'denied');
        } catch {
            setLocationStatus('denied');
        }
    };

    const startScanner = async () => {
        try {
            setError('');

            // Check location permission first
            if (locationStatus !== 'granted') {
                await checkLocationPermission();
                if (locationStatus !== 'granted') {
                    setError('Location permission is required for attendance verification');
                    return;
                }
            }

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
                    handleQRScanned(decodedText);
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

    const handleQRScanned = async (data) => {
        if (scanPhase !== 'idle') return; // Prevent multiple scans

        try {
            // Parse QR data
            let parsed;
            try {
                parsed = JSON.parse(data);
            } catch {
                setError('Invalid QR code format');
                return;
            }

            // Step 1: Get student location
            setScanPhase('locating');
            let studentLocation;
            try {
                studentLocation = await getCurrentLocationWithFallback();
            } catch (locErr) {
                setError('Could not get your location. Please ensure location services are enabled.');
                setScanPhase('idle');
                return;
            }

            // Step 2: Submit attendance with location
            setScanPhase('submitting');
            await onScan(data, studentLocation);

        } catch (error) {
            setError(error.message || 'Failed to process QR code');
        } finally {
            setScanPhase('idle');
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
        setScanPhase('idle');
    };

    const getScanStatusText = () => {
        if (scanPhase === 'locating') return '📍 Getting your location...';
        if (scanPhase === 'submitting') return '⏳ Verifying attendance...';
        if (scanning) return 'Align QR code within the frame';
        return 'Camera ready - scan QR code';
    };

    // Location permission denied screen
    if (locationStatus === 'denied') {
        return (
            <div className="space-y-4">
                <div className="glass-card p-6 text-center">
                    <div className="text-6xl mb-4">📍</div>
                    <h3 className="text-lg font-semibold text-dark-100 mb-2">Location Required</h3>
                    <p className="text-dark-400 text-sm mb-6 leading-relaxed">
                        Your location is needed to verify that you are within the classroom zone before marking attendance.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={openLocationSettings}
                            className="btn btn-primary w-full"
                        >
                            Open Browser Settings
                        </button>
                        <button
                            onClick={checkLocationPermission}
                            className="btn btn-outline w-full"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Location Status Bar */}
            <div className={`p-3 rounded-lg text-sm font-medium ${locationStatus === 'granted'
                ? 'bg-accent-500/10 border border-accent-500/20 text-accent-400'
                : 'bg-primary-500/10 border border-primary-500/20 text-primary-400'
                }`}>
                {locationStatus === 'granted' ? '📍 Location: Ready' : '⚠️ Location: Checking...'}
            </div>

            {/* Camera Container */}
            <div className="relative">
                <div
                    id="qr-reader"
                    ref={containerRef}
                    className="rounded-xl overflow-hidden bg-dark-800"
                    style={{ minHeight: scanning ? '300px' : '0px' }}
                ></div>

                {/* Scan Status Overlay */}
                {scanning && (
                    <div className="absolute bottom-4 left-4 right-4 text-center">
                        <div className="bg-dark-900/80 backdrop-blur-sm rounded-lg p-3">
                            <p className="text-white text-sm font-medium">
                                {getScanStatusText()}
                            </p>
                            {scanPhase !== 'idle' && (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mt-2"></div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div className="flex gap-3">
                {!scanning ? (
                    <button
                        onClick={startScanner}
                        disabled={locationStatus !== 'granted'}
                        className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        {locationStatus === 'granted' ? 'Open Scanner' : 'Location Required'}
                    </button>
                ) : (
                    <button
                        onClick={stopScanner}
                        disabled={scanPhase !== 'idle'}
                        className="btn btn-danger flex-1 disabled:opacity-50"
                    >
                        {scanPhase !== 'idle' ? 'Processing...' : 'Stop Scanner'}
                    </button>
                )}
            </div>
        </div>
    );
}
