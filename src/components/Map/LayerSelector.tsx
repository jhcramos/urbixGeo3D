import React from 'react';
import { Layers, ChevronRight, MapPin, Box, Droplets, Zap, Home } from 'lucide-react';
import { getAssetTypeName } from '@/utils/AssetTypeMapping';

interface Feature {
    layerId: string;
    layerTitle?: string;
    properties?: any;
    geometry?: any;
}

interface LayerSelectorProps {
    features: Feature[];
    onSelect: (feature: Feature) => void;
    onClose: () => void;
    position: { x: number, y: number };
}

const LayerSelector: React.FC<LayerSelectorProps> = ({ features, onSelect, onClose, position }) => {
    if (!features || features.length === 0) return null;

    const getIcon = (layerId: string) => {
        if (layerId.includes('water')) return <Droplets size={16} className="text-blue-500" />;
        if (layerId.includes('waste') || layerId.includes('sewer')) return <Box size={16} className="text-amber-700" />;
        if (layerId.includes('util')) return <Zap size={16} className="text-yellow-500" />;
        if (layerId.includes('parcel')) return <Home size={16} className="text-green-600" />;
        return <Layers size={16} className="text-gray-500" />;
    };

    const getTitle = (feature: Feature) => {
        if (feature.layerTitle) return feature.layerTitle;
        // Fallback based on layerId
        const id = feature.layerId;
        return id.charAt(0).toUpperCase() + id.slice(1).replace(/([A-Z])/g, ' $1').trim();
    };



    const getSpecificType = (feature: Feature) => {
        return getAssetTypeName(feature.properties || {});
    };

    const getSubtitle = (feature: Feature) => {
        const specificType = getSpecificType(feature);
        if (specificType) return specificType;

        const p = feature.properties || {};
        // Fallback to ID
        return p.lotplan || p.asset_id || p.objectid || p.name || 'Feature Details';
    };

    return (
        <>
            {/* Backdrop to close on click outside */}
            <div className="fixed inset-0 z-[1001]" onClick={onClose} />

            <div
                className="absolute z-[1002] bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 w-[280px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                style={{ left: position.x, top: position.y }}
            >
                <div className="bg-gray-50/50 p-3 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Select Feature ({features.length})
                    </span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="sr-only">Close</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto py-1">
                    {features.map((feature, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSelect(feature)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 group border-b border-gray-50 last:border-0"
                        >
                            <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 group-hover:border-blue-200 transition-colors">
                                {getIcon(feature.layerId)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-gray-800 truncate">
                                    {getTitle(feature)}
                                </h4>
                                <p className="text-xs text-gray-500 truncate">
                                    {getSubtitle(feature)}
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};

export default LayerSelector;
