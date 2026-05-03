import React, { useState, useEffect } from 'react';
import { useMapEvents, Marker, Polyline, Polygon, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { calculatePolygonArea, formatArea, formatDistance } from '@/utils/geometry';
import { Trash2 } from 'lucide-react';

interface MeasureToolProps {
    active: boolean;
}

const MeasureTool: React.FC<MeasureToolProps> = ({ active }) => {
    const [points, setPoints] = useState<L.LatLng[]>([]);
    const [mousePos, setMousePos] = useState<L.LatLng | null>(null);

    useMapEvents({
        click(e) {
            if (!active) return;
            setPoints(prev => [...prev, e.latlng]);
        },
        mousemove(e) {
            if (!active) return;
            setMousePos(e.latlng);
        }
    });

    // Reset when tool becomes inactive
    useEffect(() => {
        if (!active) {
            setPoints([]);
            setMousePos(null);
        }
    }, [active]);

    if (!active) return null;

    // Calculate metrics
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
        totalDistance += points[i].distanceTo(points[i + 1]);
    }

    // Add distance to current mouse position if drawing
    let currentSegmentDistance = 0;
    if (points.length > 0 && mousePos) {
        currentSegmentDistance = points[points.length - 1].distanceTo(mousePos);
    }

    const area = calculatePolygonArea(points);

    return (
        <>
            {/* Render Points */}
            {points.map((pos, idx) => (
                <Marker key={idx} position={pos} icon={
                    L.divIcon({
                        className: 'bg-white border-2 border-blue-600 rounded-full w-3 h-3',
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    })
                } />
            ))}

            {/* Render Line (if < 3 points) */}
            {points.length > 0 && (
                <Polyline
                    positions={mousePos ? [...points, mousePos] : points}
                    pathOptions={{ color: 'blue', dashArray: '5, 10' }}
                />
            )}

            {/* Render Polygon (if >= 3 points) */}
            {points.length >= 3 && (
                <Polygon
                    positions={points}
                    pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                />
            )}

            {/* Floating Info Panel */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur p-4 rounded-xl shadow-xl border border-white/20 z-[1000] flex items-center gap-6 min-w-[300px]">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Distance</span>
                    <span className="text-xl font-bold text-gray-800">
                        {formatDistance(totalDistance + (mousePos && points.length > 0 ? currentSegmentDistance : 0))}
                    </span>
                </div>

                {points.length >= 3 && (
                    <div className="flex flex-col border-l pl-6 border-gray-200">
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Area</span>
                        <span className="text-xl font-bold text-blue-600">
                            {formatArea(area)}
                        </span>
                    </div>
                )}

                <div className="flex-1" />

                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent map click
                        setPoints([]);
                    }}
                    className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                    title="Clear Measurements"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Instructions Tooltip following mouse */}
            {active && mousePos && points.length === 0 && (
                <Marker position={mousePos} opacity={0}>
                    <Tooltip permanent direction="right" offset={[10, 0]} className="bg-transparent border-0 shadow-none font-bold text-blue-600">
                        Click to start measuring
                    </Tooltip>
                </Marker>
            )}
        </>
    );
};

export default MeasureTool;
