'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, List } from 'lucide-react';

interface LegendItem {
    label: string;
    url: string;
    imageData: string;
    contentType: string;
    height: number;
    width: number;
}

interface LegendLayer {
    layerId: number;
    layerName: string;
    layerType: string;
    minScale: number;
    maxScale: number;
    legend: LegendItem[];
}

interface LegendResponse {
    layers: LegendLayer[];
}

interface LegendProps {
    activeLayers: Record<string, boolean>;
    layerConfigs: {
        id: string;
        title: string;
        url: string;
    }[];
}

const Legend = ({ activeLayers, layerConfigs }: LegendProps) => {
    const [legends, setLegends] = useState<Record<string, LegendResponse>>({});
    const [isOpen, setIsOpen] = useState(true);
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchLegends = async () => {
            for (const layer of layerConfigs) {
                if (activeLayers[layer.id] && !legends[layer.id] && !loading[layer.id]) {
                    setLoading(prev => ({ ...prev, [layer.id]: true }));
                    try {
                        const response = await fetch(`${layer.url}/legend?f=json`);
                        const data = await response.json();
                        setLegends(prev => ({ ...prev, [layer.id]: data }));
                    } catch (error) {
                        console.error(`Failed to fetch legend for ${layer.title}`, error);
                    } finally {
                        setLoading(prev => ({ ...prev, [layer.id]: false }));
                    }
                }
            }
        };

        fetchLegends();
    }, [activeLayers, layerConfigs, legends, loading]);

    if (!Object.values(activeLayers).some(v => v)) {
        return null;
    }

    return (
        <div className="leaflet-bottom leaflet-left" style={{ bottom: '20px', left: '20px', pointerEvents: 'auto' }}>
            <div className="bg-white rounded-lg shadow-lg max-h-[60vh] overflow-y-auto w-64 flex flex-col">
                <div
                    className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer sticky top-0 z-10"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="flex items-center gap-2 font-semibold text-gray-700">
                        <List size={18} />
                        <span>Legend</span>
                    </div>
                    {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>

                {isOpen && (
                    <div className="p-3 space-y-4">
                        {layerConfigs.map(layer => {
                            if (!activeLayers[layer.id]) return null;
                            const layerLegend = legends[layer.id];

                            return (
                                <div key={layer.id} className="space-y-2">
                                    <h4 className="font-medium text-sm text-gray-900 border-b border-gray-100 pb-1">
                                        {layer.title}
                                    </h4>

                                    {!layerLegend ? (
                                        <div className="text-xs text-gray-500 animate-pulse">Loading legend...</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {layerLegend.layers.map(sublayer => (
                                                <div key={sublayer.layerId} className="text-xs">
                                                    <div className="font-medium text-gray-600 mb-1">{sublayer.layerName}</div>
                                                    <div className="space-y-1 ml-2">
                                                        {sublayer.legend.map((item, idx) => (
                                                            <div key={idx} className="flex items-center gap-2">
                                                                <img
                                                                    src={`data:${item.contentType};base64,${item.imageData}`}
                                                                    alt={item.label}
                                                                    width={item.width}
                                                                    height={item.height}
                                                                />
                                                                <span className="text-gray-500">{item.label || sublayer.layerName}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Legend;
