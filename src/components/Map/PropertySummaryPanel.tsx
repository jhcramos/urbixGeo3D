'use client';

import { useState, useRef, useEffect } from 'react';
import { X, MapPin, Layers, ShoppingCart, ChevronRight, Check, Minus, Maximize2 } from 'lucide-react';
import { PlanningData } from '@/utils/PlanningFetcher';

interface PropertySummaryPanelProps {
    feature: any;
    planningData: PlanningData | null;
    onClose: () => void;
    onBuy: (product: any) => void;
}

const PropertySummaryPanel = ({ feature, planningData, onClose, onBuy }: PropertySummaryPanelProps) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'planning' | 'shop'>('summary');
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 280 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    if (!feature) return null;

    const properties = feature.properties || {};
    const address = properties.address_short || properties.address || 'Selected Property';
    const lotPlan = properties.lotplan || 'N/A';
    const area = properties.area_sqm ? `${properties.area_sqm} m²` : 'N/A';

    const products = [
        {
            id: 'title_search',
            title: 'Current Title / State Lease',
            description: 'Verify up-to-the-minute ownership and registered interests.',
            price: 74.50
        },
        {
            id: 'survey_plan',
            title: 'Image of Survey Plan (SP/RP)',
            description: 'View the official survey plan to confirm boundaries and easements.',
            price: 85.90
        },
        {
            id: 'historical_title',
            title: 'Historical Title Search',
            description: 'Track ownership changes and dealings since 1994.',
            price: 86.50
        }
    ];

    // Center the panel by default
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPosition({
                x: (window.innerWidth / 2) - 175, // Center horizontally (350px width)
                y: (window.innerHeight / 2) - 250  // Center vertically (approx height)
            });
        }
    }, []);

    // Dragging logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const newX = e.clientX - dragStartPos.current.x;
            const newY = e.clientY - dragStartPos.current.y;

            setPosition({
                x: newX,
                y: newY
            });
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
        // Only allow dragging from the header
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
            className={`absolute w-[400px] bg-white rounded-lg shadow-xl z-[1000] overflow-hidden flex flex-col ${isDragging ? '' : 'transition-all duration-200'} ${isMinimized ? 'h-auto' : 'max-h-[calc(100vh-160px)]'}`}
        >
            {/* Header - Draggable Area */}
            <div
                className="bg-gray-900 text-white p-4 flex justify-between items-start cursor-move select-none"
                onMouseDown={handleMouseDown}
            >
                <div>
                    <h2 className="font-bold text-lg leading-tight truncate max-w-[250px]">{address}</h2>
                    {!isMinimized && <p className="text-gray-400 text-sm mt-1">Lot {lotPlan}</p>}
                </div>
                <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                        {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content - Hidden when minimized */}
            {!isMinimized && (
                <>
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'summary' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <MapPin className="w-4 h-4" /> Summary
                        </button>
                        <button
                            onClick={() => setActiveTab('planning')}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'planning' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Layers className="w-4 h-4" /> Planning
                        </button>
                        <button
                            onClick={() => setActiveTab('shop')}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'shop' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <ShoppingCart className="w-4 h-4" /> Shop
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                        {activeTab === 'summary' && (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-md shadow-sm border border-gray-100">
                                    <h3 className="font-semibold text-gray-800 mb-3">Property Details</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500">Lot/Plan</p>
                                            <p className="font-medium">{lotPlan}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Area</p>
                                            <p className="font-medium">{area}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Tenure</p>
                                            <p className="font-medium">{properties.tenure || 'Freehold'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Local Gov</p>
                                            <p className="font-medium">Sunshine Coast</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Land Area</p>
                                            <p className="font-medium">{planningData?.landArea || area}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Building Area</p>
                                            <p className="font-medium">{planningData?.buildingArea || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'planning' && (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-md shadow-sm border border-gray-100">
                                    <h3 className="font-semibold text-gray-800 mb-3">Zoning & Overlays</h3>

                                    {!planningData ? (
                                        <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                            Loading planning info...
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Zones */}
                                            {planningData.zones.length > 0 ? (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Zones</p>
                                                    {planningData.zones.map((zone, i) => (
                                                        <div key={i} className="flex items-start gap-2">
                                                            <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-800">{zone.name}</p>
                                                                <p className="text-xs text-gray-500">{zone.code}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">No zoning information found.</p>
                                            )}

                                            {/* Overlays */}
                                            {planningData.overlays.length > 0 ? (
                                                <div className="space-y-2 pt-2 border-t border-gray-100">
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overlays</p>
                                                    {planningData.overlays.map((overlay, i) => (
                                                        <div key={i} className="flex items-start gap-2">
                                                            <div className="w-2 h-2 mt-1.5 rounded-full bg-orange-500 shrink-0" />
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-800">{overlay.name}</p>
                                                                <p className="text-xs text-gray-500">{overlay.type}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">No overlays found.</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-xs rounded-md">
                                        Note: This is a summary. Purchase a full planning report for detailed analysis.
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'shop' && (
                            <div className="space-y-4">
                                {products.map(product => (
                                    <div key={product.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-100 hover:border-blue-300 transition-colors">
                                        <h3 className="font-bold text-gray-800">{product.title}</h3>
                                        <p className="text-xs text-gray-500 mt-1 mb-3 leading-relaxed">
                                            {product.description}
                                        </p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-bold text-gray-900">${product.price.toFixed(2)}</span>
                                            <button
                                                onClick={() => onBuy(product)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded transition-colors flex items-center"
                                            >
                                                BUY NOW <ChevronRight className="w-3 h-3 ml-1" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default PropertySummaryPanel;
