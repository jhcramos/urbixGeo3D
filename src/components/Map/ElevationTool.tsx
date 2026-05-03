import React, { useState, useEffect } from 'react';
import { useMapEvents, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import * as Esri from 'esri-leaflet';
import { Mountain, X } from 'lucide-react';

interface ElevationToolProps {
    active: boolean;
}

const CONTOURS_URL = 'https://services-ap1.arcgis.com/YQyt7djuXN7rQyg4/arcgis/rest/services/Contours2022/FeatureServer/0';

const ElevationTool: React.FC<ElevationToolProps> = ({ active }) => {
    const [points, setPoints] = useState<{ id: number; latlng: L.LatLng; elevation: number | null; loading: boolean; error: string | null }[]>([]);

    useMapEvents({
        click(e) {
            if (!active) return;
            addPoint(e.latlng);
        }
    });

    // Clear points when tool becomes inactive (optional, or keep them? User said "leave the point marked", usually implies while tool is active or session. Let's clear on inactive for now to avoid clutter when switching tools, or maybe keep them? The prompt implies "leave the point marked", let's keep them until tool is deactivated)
    useEffect(() => {
        if (!active) {
            setPoints([]);
        }
    }, [active]);

    const addPoint = (latlng: L.LatLng) => {
        const newPoint = { id: Date.now(), latlng, elevation: null, loading: true, error: null };
        setPoints(prev => [...prev, newPoint]);
        calculateElevation(newPoint);
    };

    const calculateElevation = (point: { id: number; latlng: L.LatLng }) => {
        // Query for contours within a larger radius (100m)
        Esri.query({ url: CONTOURS_URL })
            .nearby(point.latlng, 100)
            .run((error, featureCollection) => {
                if (error) {
                    console.error('Error querying contours:', error);
                    updatePoint(point.id, { loading: false, error: 'Failed' });
                    return;
                }

                if (!featureCollection || !featureCollection.features || featureCollection.features.length === 0) {
                    updatePoint(point.id, { loading: false, error: 'No Data' });
                    return;
                }

                const features = featureCollection.features;
                const distances: { dist: number, elev: number }[] = [];

                features.forEach((f: any) => {
                    const props = f.properties;
                    const elev = parseFloat(props.ELEVATION || props.Elevation || props.cv || props.CV || 'NaN');

                    if (isNaN(elev)) return;

                    let minD = Infinity;
                    const geometry = f.geometry;
                    const coords = geometry.type === 'MultiLineString' ? geometry.coordinates.flat() : geometry.coordinates;

                    coords.forEach((coord: number[]) => {
                        const p = L.latLng(coord[1], coord[0]);
                        const d = point.latlng.distanceTo(p);
                        if (d < minD) minD = d;
                    });

                    distances.push({ dist: minD, elev });
                });

                distances.sort((a, b) => a.dist - b.dist);

                let calculatedElevation = null;
                if (distances.length >= 2) {
                    const c1 = distances[0];
                    const c2 = distances[1];
                    const totalDist = c1.dist + c2.dist;
                    if (totalDist === 0) {
                        calculatedElevation = c1.elev;
                    } else {
                        calculatedElevation = (c1.elev * c2.dist + c2.elev * c1.dist) / (c1.dist + c2.dist);
                    }
                } else if (distances.length === 1) {
                    calculatedElevation = distances[0].elev;
                }

                if (calculatedElevation !== null) {
                    updatePoint(point.id, { loading: false, elevation: calculatedElevation });
                } else {
                    updatePoint(point.id, { loading: false, error: 'No Data' });
                }
            });
    };

    const updatePoint = (id: number, updates: Partial<typeof points[0]>) => {
        setPoints(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    if (!active) return null;

    const removePoint = (id: number) => {
        setPoints(prev => prev.filter(p => p.id !== id));
    };

    if (!active) return null;

    return (
        <>
            {points.map(point => (
                <Marker
                    key={point.id}
                    position={point.latlng}
                    icon={L.divIcon({
                        className: 'custom-elevation-marker',
                        html: `
                            <div class="flex flex-col items-center">
                                <div class="w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow-md mb-1"></div>
                                <div class="bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-blue-100 text-xs font-bold text-blue-800 whitespace-nowrap">
                                    ${point.loading ? '...' : point.error ? point.error : point.elevation?.toFixed(2) + 'm'}
                                </div>
                            </div>
                        `,
                        iconSize: [60, 40],
                        iconAnchor: [30, 6]
                    })}
                    eventHandlers={{
                        click: (e) => {
                            // Prevent map click event (which adds a new point)
                            L.DomEvent.stopPropagation(e.originalEvent);
                        }
                    }}
                >
                    <Popup className="custom-popup-clean" closeButton={false} offset={[0, -10]}>
                        <div className="p-3 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 min-w-[140px] text-center relative group">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removePoint(point.id);
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-50"
                                title="Remove Point"
                            >
                                <X size={12} />
                            </button>

                            <div className="flex justify-center mb-1">
                                <div className="p-1.5 bg-blue-50 rounded-full text-blue-600">
                                    <Mountain size={16} />
                                </div>
                            </div>

                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Level</h3>

                            <div className="text-2xl font-black text-gray-800 tracking-tight">
                                {point.loading ? '...' : point.elevation?.toFixed(2)}
                                <span className="text-sm text-gray-400 font-medium ml-0.5">m</span>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
};

export default ElevationTool;
