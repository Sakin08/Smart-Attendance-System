import { formatCoordinates } from '../utils/locationUtils';

export default function LocationStatus({ session, compact = false }) {
    if (!session?.location) {
        return null;
    }

    const { location, radiusMeters } = session;

    if (compact) {
        return (
            <div className="flex items-center gap-2 text-xs text-dark-400">
                <span>📍</span>
                <span>{radiusMeters}m zone</span>
            </div>
        );
    }

    return (
        <div className="bg-dark-800/30 rounded-lg p-3 border border-dark-700">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📍</span>
                <span className="text-sm font-medium text-dark-300">Location-Based Attendance</span>
            </div>
            <div className="space-y-1 text-xs text-dark-400">
                <div>Zone Radius: {radiusMeters} meters</div>
                <div className="font-mono">
                    Center: {formatCoordinates(location.lat, location.lng)}
                </div>
                <div className="text-dark-500">
                    Students must be within {radiusMeters}m to mark attendance
                </div>
            </div>
        </div>
    );
}