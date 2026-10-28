import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Navigation, MapPin } from 'lucide-react';
import Button from './Button';

// Child component to handle map clicks
const LocationMarker = ({ position, setPosition, onChange }) => {
  useMapEvents({
    click(e) {
      const newPos = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPosition(newPos);
      if (onChange) onChange(newPos);
    }
  });

  return position ? <Marker position={[position.lat, position.lng]} /> : null;
};

// Child component to dynamically re-center map
const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);
  return null;
};

const MapPicker = ({
  lat,
  lng,
  onChange,
  height = '280px',
  defaultCenter = { lat: 9.3159, lng: 76.6151 },
  zoom = 12
}) => {
  const [position, setPosition] = useState(() => {
    if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
      return { lat: Number(lat), lng: Number(lng) };
    }
    return defaultCenter;
  });

  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
      setPosition({ lat: Number(lat), lng: Number(lng) });
    }
  }, [lat, lng]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const newPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setPosition(newPos);
        if (onChange) onChange(newPos);
      },
      (err) => {
        setLocating(false);
        setLocationError('Could not retrieve current location: ' + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="map-picker-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <MapPin size={16} color="var(--primary)" />
          {position ? (
            <span>
              Lat: <strong>{position.lat.toFixed(5)}</strong>, Lng: <strong>{position.lng.toFixed(5)}</strong>
            </span>
          ) : (
            <span>Click map to place pin</span>
          )}
        </span>

        <Button
          size="sm"
          variant="secondary"
          onClick={handleUseCurrentLocation}
          loading={locating}
          icon={<Navigation size={14} />}
        >
          Use Current Location
        </Button>
      </div>

      {locationError && (
        <span style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>{locationError}</span>
      )}

      <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <MapContainer
          center={position ? [position.lat, position.lng] : [defaultCenter.lat, defaultCenter.lng]}
          zoom={zoom}
          scrollWheelZoom={false}
          style={{ height, width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} onChange={onChange} />
          <RecenterMap center={position} />
        </MapContainer>
      </div>

      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
        Tip: Click anywhere on the map above to select the coordinates for this bin.
      </span>
    </div>
  );
};

export default MapPicker;
