'use client';

import dynamic from 'next/dynamic';

const UrbixMap = dynamic(() => import('./UrbixMap'), {
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100">Loading Map...</div>
});

interface MapWrapperProps {
    initialSearch?: string;
}

export default function MapWrapper({ initialSearch }: MapWrapperProps) {
    return <UrbixMap initialSearch={initialSearch} />;
}
