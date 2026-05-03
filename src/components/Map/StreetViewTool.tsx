import React, { useState, useEffect } from 'react';
import { useMapEvents, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { X, Maximize2, Minimize2, Move, ExternalLink } from 'lucide-react';

interface StreetViewToolProps {
    active: boolean;
}

const StreetViewTool: React.FC<StreetViewToolProps> = ({ active }) => {
    const map = useMap();
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Window state
    const [windowPos, setWindowPos] = useState({ x: 20, y: 80 });
    const [windowSize, setWindowSize] = useState({ w: 400, h: 300 });

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

    useMapEvents({
        click(e) {
            if (!active) return;
            setPosition(e.latlng);
            setIsOpen(true);
            setIsMinimized(false);
        }
    });

    // Reset when tool becomes inactive
    useEffect(() => {
        if (!active) {
            setIsOpen(false);
            setPosition(null);
        }
    }, [active]);

    // Global Mouse Move / Up for Dragging & Resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setWindowPos({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                });
            } else if (isResizing) {
                setWindowSize({
                    w: Math.max(300, resizeStart.w + (e.clientX - resizeStart.x)),
                    h: Math.max(200, resizeStart.h + (e.clientY - resizeStart.y))
                });
            }
        };

        const handleMouseUp = () => {
            if (isDragging || isResizing) {
                setIsDragging(false);
                setIsResizing(false);
                // Re-enable map dragging
                map.dragging.enable();
            }
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, isResizing, resizeStart, map]);

    const startDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Disable map dragging
        map.dragging.disable();

        setIsDragging(true);
        setDragStart({
            x: e.clientX - windowPos.x,
            y: e.clientY - windowPos.y
        });
    };

    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Disable map dragging
        map.dragging.disable();

        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            w: windowSize.w,
            h: windowSize.h
        });
    };

    // Ref for scroll blocking only
    const overlayRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (overlayRef.current) {
            L.DomEvent.disableScrollPropagation(overlayRef.current);
        }
    }, [isOpen]);

    if (!active || !isOpen || !position) return null;

    const streetViewUrl = `https://www.google.com/maps?q=&layer=c&cbll=${position.lat},${position.lng}&cbp=11,0,0,0,0`;

    return (
        <>
            <Marker position={position} icon={L.divIcon({
                className: 'bg-transparent',
                html: '<div class="w-4 h-4 bg-yellow-400 border-2 border-black rounded-full shadow-lg animate-bounce"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })} />

            {/* Overlay Window */}
            <div
                ref={overlayRef}
                className="fixed z-[1000] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col border border-gray-200"
                style={{
                    left: windowPos.x,
                    top: windowPos.y,
                    width: isMinimized ? 200 : windowSize.w,
                    height: isMinimized ? 40 : windowSize.h,
                    transition: (isDragging || isResizing) ? 'none' : 'width 0.2s, height 0.2s'
                }}
            >
                {/* Header */}
                <div
                    className="bg-gray-800 text-white px-3 py-2 flex items-center justify-between cursor-move select-none"
                    onMouseDown={startDrag}
                >
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Move size={14} className="text-gray-400" />
                        <span>Street View</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <a
                            href={streetViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-blue-600 rounded transition-colors text-white"
                            title="Open in Google Maps"
                            onMouseDown={(e) => e.stopPropagation()} // Allow click but stop drag start
                        >
                            <ExternalLink size={14} />
                        </a>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                            className="p-1 hover:bg-red-500 rounded transition-colors"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {!isMinimized && (
                    <div className="flex-1 bg-gray-100 relative h-full group">
                        <iframe
                            width="100%"
                            height="100%"
                            style={{ border: 0, pointerEvents: isDragging || isResizing ? 'none' : 'auto' }} // Disable iframe events while dragging/resizing
                            loading="lazy"
                            allowFullScreen
                            src={`https://www.google.com/maps/embed/v1/streetview?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&location=${position.lat},${position.lng}`}
                        ></iframe>

                        {/* Resize Handle */}
                        <div
                            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center z-10 bg-gray-100 hover:bg-gray-200 rounded-tl"
                            onMouseDown={startResize}
                        >
                            <div className="w-0 h-0 border-b-[6px] border-r-[6px] border-b-transparent border-r-gray-400 transform rotate-0 translate-x-[-2px] translate-y-[-2px]"></div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default StreetViewTool;
