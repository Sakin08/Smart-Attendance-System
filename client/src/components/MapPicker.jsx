import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    return position ? <Marker position={position} /> : null;
}

export default function MapPicker({ lat, lng, radius = 100, onLocationChange, readonly = false }) {
    const [position, setPosition] = useState(
        lat && lng ? [lat, lng] : [24.9128, 91.8315] // Default: SUST campus
    );

    useEffect(() => {
        if (lat && lng) {
            setPosition([lat, lng]);
        }
    }, [lat, lng]);

    const handleSetPosition = (pos) => {
        if (readonly) return;
        setPosition(pos);
        if (onLocationChange) {
            onLocationChange({ lat: pos[0], lng: pos[1] });
        }
    };

    return (
        <div className="rounded-xl overflow-hidden border border-primary-500/20">
            <MapContainer
                center={position}
                zoom={16}
                style={{ height: '300px', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {!readonly && <LocationMarker position={position} setPosition={handleSetPosition} />}
                {position && (
                    <>
                        <Marker position={position} />
                        <Circle
                            center={position}
                            radius={radius}
                            pathOptions={{
                                color: '#6366f1',
                                fillColor: '#6366f1',
                                fillOpacity: 0.15
                            }}
                        />
                    </>
                )}
            </MapContainer>
            {!readonly && (
                <div className="bg-dark-800/50 px-3 py-2 text-xs text-dark-400">
                    Click on the map to set location · Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
                </div>
            )}
        </div>
    );
}
