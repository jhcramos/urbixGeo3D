'use client';

import { X, Info, Activity, Calendar, Ruler, Hash } from 'lucide-react';
import { getAssetTypeName } from '@/utils/AssetTypeMapping';
import { useState, useRef, useEffect } from 'react';

interface AssetPopupProps {
    feature: any;
    initialPosition?: { x: number, y: number } | null;
    onClose: () => void;
}

const AssetPopup = ({ feature, initialPosition, onClose }: AssetPopupProps) => {
    // Default to top-right (will be adjusted in useEffect)
    const [position, setPosition] = useState({ x: 800, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    // Set initial position based on click or default
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (initialPosition) {
                // Position to the LEFT of the click
                // Popup width is 350px. Let's add 20px margin.
                // x = click.x - 370
                let x = initialPosition.x - 370;
                let y = initialPosition.y - 100; // Center vertically relative to click

                // Boundary checks
                if (x < 20) x = initialPosition.x + 20; // If too far left, flip to right
                if (y < 80) y = 80; // Keep below header
                if (y > window.innerHeight - 400) y = window.innerHeight - 400;

                setPosition({ x, y });
            } else {
                // Default center
                setPosition({
                    x: (window.innerWidth / 2) - 175,
                    y: (window.innerHeight / 2) - 200
                });
            }
        }
    }, [initialPosition]);

    if (!feature) return null;

    const properties = feature.properties || {};

    // Helper to find specific asset type
    const getSpecificType = () => {
        return getAssetTypeName(properties);
    };

    const specificType = getSpecificType();
    const layerTitle = feature.layerTitle || 'Asset Details';
    const displayTitle = specificType ? `${layerTitle} - ${specificType}` : layerTitle;

    // Filter out internal Esri fields and empty values
    const displayProps = Object.entries(properties).filter(([key, value]) => {
        const lowerKey = key.toLowerCase();
        return (
            !lowerKey.includes('shape') &&
            !lowerKey.includes('objectid') &&
            !lowerKey.includes('globalid') &&
            value !== null &&
            value !== '' &&
            value !== ' '
        );
    });

    // Helper to format keys (e.g., "INSTALL_DATE" -> "Install Date")
    const formatKey = (key: string) => {
        return key
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    // Helper to get icon based on key
    const getIcon = (key: string) => {
        const lower = key.toLowerCase();
        if (lower.includes('date')) return <Calendar className="w-4 h-4 text-gray-400" />;
        if (lower.includes('diam') || lower.includes('width') || lower.includes('length')) return <Ruler className="w-4 h-4 text-gray-400" />;
        if (lower.includes('id') || lower.includes('code')) return <Hash className="w-4 h-4 text-gray-400" />;
        return <Activity className="w-4 h-4 text-gray-400" />;
    };

    // Dragging logic (same as PropertySummaryPanel)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const newX = e.clientX - dragStartPos.current.x;
            const newY = e.clientY - dragStartPos.current.y;
            setPosition({ x: newX, y: newY });
        };
        const handleMouseUp = () => {
            setIsDragging(false);
        };
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    return (
        <div
            ref={panelRef}
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
            className="absolute w-[350px] bg-white rounded-lg shadow-2xl z-[1001] overflow-hidden flex flex-col border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
            {/* Header */}
            <div
                className="bg-slate-800 text-white p-4 flex justify-between items-center cursor-move select-none"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500 rounded-md">
                        <Info className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-base leading-tight">{displayTitle}</h2>
                        <p className="text-slate-400 text-xs">Infrastructure Asset</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-full"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="p-0 max-h-[60vh] overflow-y-auto bg-gray-50">
                <div className="divide-y divide-gray-100">
                    {displayProps.map(([key, value], index) => (
                        <div key={key} className="p-3 hover:bg-white transition-colors flex items-start gap-3 group">
                            <div className="mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                                {getIcon(key)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                                    {formatKey(key)}
                                </p>
                                <p className="text-sm text-gray-900 font-medium break-words">
                                    {String(value)}
                                </p>
                            </div>
                        </div>
                    ))}

                    {displayProps.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            <p>No attributes available for this asset.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-3 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-400">
                    Data provided by Sunshine Coast Council
                </p>
            </div>
        </div>
    );
};

export default AssetPopup;
