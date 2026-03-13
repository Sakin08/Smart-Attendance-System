import { useState, useEffect } from 'react';
import { getCurrentLocationWithFallback, requestLocationPermission, formatCoordinates, openLocationSettings } from '../utils/locationUtils';

export default function LocationCapture({ onLocationChange, initialLocation = null, required = true }) {
    const [locationStatus, setLocationStatus] = useState('idle'); // idle | loading | granted | denied | error
    const [location, setLocation] = useState(initialLocation);
    const [error, setError] = useState('');

    useEffect(() => {
        if (required && !initialLocation && locationStatus === 'idle') {
            captureLocation();
        }
    }, [required, initialLocation, locationStatus]);

    useEffect(() => {
        if (onLocationChange && location !== initialLocation) {
            onLocationChange(location);
        }
    }, [location]); // Remove onLocationChange from dependencies to prevent loops

    const captureLocation = async () => {
        setLocationStatus('loading');
        setError('');

        try {
            // Check permission first
            const permission = await requestLocationPermission();

            if (permission === 'denied') {
                setLocationStatus('denied');
                setError('Location permission denied. Please enable location access in your browser.');
                return;
            }

            // Get current location
            const coords = await getCurrentLocationWithFallback();
            setLocation(coords);
            setLocationStatus('granted');

            if (coords.isDevelopmentFallback) {
                setError('Using development location (GPS unavailable)');
            }
        } catch (err) {
            console.error('Location error:', err);
            setLocationStatus('error');
            setError(err.message);
        }
    };

    const getStatusIcon = () => {
        switch (locationStatus) {
            case 'granted': return '📍';
            case 'loading': return '🔄';
            case 'denied':
            case 'error': return '⚠️';
            default: return '📍';
        }
    };

    const getStatusText = () => {
        switch (locationStatus) {
            case 'granted': return 'Location Captured';
            case 'loading': return 'Getting Location...';
            case 'denied': return 'Location Permission Denied';
            case 'error': return 'Location Error';
            default: return 'Location Pending';
        }
    };

    const getStatusColor = () => {
        switch (locationStatus) {
            case 'granted': return 'text-accent-400 bg-accent-500/10 border-accent-500/30';
            case 'loading': return 'text-primary-400 bg-primary-500/10 border-primary-500/30';
            case 'denied':
            case 'error': return 'text-red-400 bg-red-500/10 border-red-500/30';
            default: return 'text-dark-400 bg-dark-500/10 border-dark-500/30';
        }
    };

    return (
        <div className="space-y-4">
            {/* Location Status Banner */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${getStatusColor()}`}>
                <span className="text-2xl">{getStatusIcon()}</span>
                <div className="flex-1">
                    <div className="font-semibold text-sm">
                        {getStatusText()}
                    </div>
                    {location && locationStatus === 'granted' && (
                        <div className="text-xs text-dark-400 font-mono mt-1">
                            {formatCoordinates(location.lat, location.lng)}
                            {location.accuracy && (
                                <span className="ml-2">±{Math.round(location.accuracy)}m</span>
                            )}
                            {location.isDevelopmentFallback && (
                                <span className="ml-2 text-yellow-400">(Dev Mode)</span>
                            )}
                        </div>
                    )}
                    {error && (
                        <div className="text-xs mt-1">
                            {error}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {locationStatus === 'denied' && (
                        <button
                            onClick={openLocationSettings}
                            className="px-3 py-1 text-xs bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                        >
                            Settings
                        </button>
                    )}
                    {(locationStatus === 'error' || locationStatus === 'denied' || locationStatus === 'idle') && (
                        <button
                            onClick={captureLocation}
                            className="px-3 py-1 text-xs bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                        >
                            Retry
                        </button>
                    )}
                    {locationStatus === 'granted' && (
                        <button
                            onClick={captureLocation}
                            className="px-3 py-1 text-xs bg-accent-500/20 text-accent-400 rounded-lg hover:bg-accent-500/30 transition-colors"
                        >
                            Refresh
                        </button>
                    )}
                </div>
            </div>

            {/* Location Details */}
            {location && locationStatus === 'granted' && (
                <div className="text-xs text-dark-500 bg-dark-800/50 p-3 rounded-lg">
                    <div className="font-medium text-dark-400 mb-1">Attendance Zone Center:</div>
                    <div className="font-mono">{formatCoordinates(location.lat, location.lng)}</div>
                    {location.accuracy && (
                        <div className="mt-1">GPS Accuracy: ±{Math.round(location.accuracy)} meters</div>
                    )}
                </div>
            )}

            {/* Loading Indicator */}
            {locationStatus === 'loading' && (
                <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-dark-400">Accessing GPS...</span>
                </div>
            )}
        </div>
    );
}