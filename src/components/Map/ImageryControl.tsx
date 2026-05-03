'use client';

import { Map, Satellite } from 'lucide-react';

interface ImageryControlProps {
    isSatellite: boolean;
    onToggle: (isSatellite: boolean) => void;
}

export default function ImageryControl({ isSatellite, onToggle }: ImageryControlProps) {
    return (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000]">
            <div className="bg-white p-1 rounded-full shadow-lg border border-gray-200 flex">

                <button
                    onClick={() => onToggle(false)}
                    className={`
            flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 text-sm font-medium
            ${!isSatellite
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50'
                        }
          `}
                >
                    <Map size={16} />
                    <span>Map</span>
                </button>

                <button
                    onClick={() => onToggle(true)}
                    className={`
            flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 text-sm font-medium
            ${isSatellite
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50'
                        }
          `}
                >
                    <Satellite size={16} />
                    <span>Satellite</span>
                </button>

            </div>
        </div>
    );
}
