'use client';

import { useState } from 'react';
import { Layers } from 'lucide-react';

interface LayerConfig {
    id: string;
    title: string; // Changed from name to title to match UrbixMap
    url: string;
    layers?: number[];
}

interface LayerControlProps {
    layers: LayerConfig[];
    activeLayers: Record<string, boolean>;
    onToggle: (layerId: string) => void;
}

export default function LayerControl({ layers, activeLayers, onToggle }: LayerControlProps) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden w-64">
            <div
                className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 font-semibold text-gray-700">
                    <Layers size={18} />
                    <span>Map Layers</span>
                </div>
                <span className="text-xs text-gray-500">{isOpen ? 'Hide' : 'Show'}</span>
            </div>

            {isOpen && (
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    {layers.map((layer) => (
                        <label
                            key={layer.id}
                            className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={!!activeLayers[layer.id]}
                                onChange={() => onToggle(layer.id)}
                                className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 leading-tight">{layer.title}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
