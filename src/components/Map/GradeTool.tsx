import React, { useState, useEffect } from 'react';
import { useMapEvents, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import * as Esri from 'esri-leaflet';
import { TrendingUp, X, ArrowRight } from 'lucide-react';

interface GradeToolProps {
    active: boolean;
}

interface GradePoint {
    latlng: L.LatLng;
    elevation: number | null;
    loading: boolean;
    error: string | null;
}

const CONTOURS_URL = 'https://services-ap1.arcgis.com/YQyt7djuXN7rQyg4/arcgis/rest/services/Contours2022/FeatureServer/0';

const GradeTool: React.FC<GradeToolProps> = ({ active }) => {
    const [points, setPoints] = useState<GradePoint[]>([]);

    useMapEvents({
        click(e) {
            if (!active) return;
            if (points.length >= 2) {
                // Reset and start new if we already have 2 points
                setPoints([{ latlng: e.latlng, elevation: null, loading: true, error: null }]);
                fetchElevation(e.latlng, 0);
            } else {
                setPoints(prev => [...prev, { latlng: e.latlng, elevation: null, loading: true, error: null }]);
                fetchElevation(e.latlng, points.length);
            }
        }
    });

    useEffect(() => {
        if (!active) {
            setPoints([]);
        }
    }, [active]);

    const fetchElevation = (latlng: L.LatLng, index: number) => {
        Esri.query({ url: CONTOURS_URL })
            .nearby(latlng, 100)
            .run((error, featureCollection) => {
                if (error || !featureCollection || !featureCollection.features || featureCollection.features.length === 0) {
                    updatePoint(index, { loading: false, error: 'No Data' });
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
                        const d = latlng.distanceTo(p);
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
                    updatePoint(index, { loading: false, elevation: calculatedElevation });
                } else {
                    updatePoint(index, { loading: false, error: 'No Data' });
                }
            });
    };

    const updatePoint = (index: number, updates: Partial<GradePoint>) => {
        setPoints(prev => prev.map((p, i) => i === index ? { ...p, ...updates } : p));
    };

    const calculateGrade = () => {
        if (points.length < 2) return null;
        const p1 = points[0];
        const p2 = points[1];

        if (p1.elevation === null || p2.elevation === null) return null;

        const rise = p2.elevation - p1.elevation;
        const run = p1.latlng.distanceTo(p2.latlng);
        const grade = (rise / run) * 100;

        return { rise, run, grade };
    };

    const result = calculateGrade();

    if (!active) return null;

    return (
        <>
            {points.map((p, i) => (
                <Marker
                    key={i}
                    position={p.latlng}
                    icon={L.divIcon({
                        className: 'bg-transparent',
                        html: `<div class="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold border-2 border-white shadow-md">${i + 1}</div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })}
                >
                    {p.loading && <Popup>Loading elevation...</Popup>}
                    {p.error && <Popup>Error: {p.error}</Popup>}
                </Marker>
            ))}

            {points.length === 2 && (
                <>
                    <Polyline
                        positions={[points[0].latlng, points[1].latlng]}
                        pathOptions={{ color: '#2563eb', weight: 4, dashArray: '10, 10', opacity: 0.8 }}
                    />

                    {/* Result Popup on the second point */}
                    <Popup position={points[1].latlng} closeButton={false} autoClose={false} closeOnClick={false} className="grade-popup">
                        <div className="p-2 min-w-[200px]">
                            <div className="flex justify-between items-start mb-2 border-b pb-2">
                                <div className="flex items-center gap-2 font-bold text-gray-800">
                                    <TrendingUp size={16} />
                                    <span>Grade Result</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPoints([]);
                                    }}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {result ? (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                        <span className="text-gray-600">Grade</span>
                                        <span className={`font-bold text-lg ${result.grade > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.grade.toFixed(2)}%
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                        <div>
                                            <span className="block mb-1">Elevation A</span>
                                            <span className="font-medium text-gray-800">{points[0].elevation?.toFixed(2)}m</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block mb-1">Elevation B</span>
                                            <span className="font-medium text-gray-800">{points[1].elevation?.toFixed(2)}m</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-dashed">
                                        <span>Distance: {result.run.toFixed(1)}m</span>
                                        <span>Diff: {result.rise > 0 ? '+' : ''}{result.rise.toFixed(2)}m</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm italic py-2 text-center">
                                    Calculating grade...
                                </div>
                            )}
                        </div>
                    </Popup>
                </>
            )}
        </>
    );
};

export default GradeTool;
