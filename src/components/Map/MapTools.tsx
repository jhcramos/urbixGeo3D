import React, { useState, useRef, useEffect } from 'react';
import { MousePointer2, Wrench, Ruler, Mountain, GripHorizontal, Eye, TrendingUp, FileUp } from 'lucide-react';

export type ToolMode = 'default' | 'asset' | 'measure' | 'elevation' | 'streetview' | 'grade' | 'plan';

interface MapToolsProps {
    activeTool: ToolMode;
    onToolChange: (tool: ToolMode) => void;
}

const MapTools: React.FC<MapToolsProps> = ({ activeTool, onToolChange }) => {
    // Default position: Left side, vertically centered (approx)
    const [position, setPosition] = useState({ x: 20, y: 300 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });

    const tools = [
        { id: 'default', icon: MousePointer2, label: 'Property Mode', description: 'Select properties & land' },
        { id: 'asset', icon: Wrench, label: 'Asset Mode', description: 'Inspect infrastructure assets' },
        { id: 'measure', icon: Ruler, label: 'Measure', description: 'Measure distance & area' },
        { id: 'elevation', icon: Mountain, label: 'Elevation', description: 'Click on the map to get point levels' },
        { id: 'grade', icon: TrendingUp, label: 'Grade', description: 'Calculate slope between two points' },
        { id: 'plan', icon: FileUp, label: 'Overlay Plan', description: 'Align PDF/Image to map' },
        { id: 'streetview', icon: Eye, label: 'Street View', description: 'View street level imagery' },
    ];

    useEffect(() => {
        // Center vertically on mount if window exists
        if (typeof window !== 'undefined') {
            setPosition({ x: 20, y: window.innerHeight / 2 - 150 });
        }
    }, []);

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
        if ((e.target as HTMLElement).closest('button')) return;
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    return (
        <div
            className="absolute z-[1000] flex flex-col"
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
        >
            <div
                className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex flex-col items-center py-3 px-2 gap-2 cursor-move w-[60px]"
                onMouseDown={handleMouseDown}
            >
                {/* Drag Handle (Dots) */}
                <div className="grid grid-cols-2 gap-1 mb-1 opacity-30 hover:opacity-60 transition-opacity">
                    <div className="w-1 h-1 rounded-full bg-gray-800"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-800"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-800"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-800"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-800"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-800"></div>
                </div>

                {tools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;

                    return (
                        <button
                            key={tool.id}
                            onClick={() => onToolChange(tool.id as ToolMode)}
                            className={`
                                relative group p-3 rounded-xl transition-all duration-200 flex items-center justify-center w-10 h-10
                                ${isActive
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                                }
                            `}
                            title={tool.label}
                        >
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />

                            {/* Tooltip */}
                            <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50">
                                <div className="font-bold mb-0.5">{tool.label}</div>
                                <div className="text-gray-300 font-normal">{tool.description}</div>
                                {/* Arrow */}
                                <div className="absolute top-1/2 -left-1 -mt-1 border-4 border-transparent border-r-gray-900" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MapTools;
