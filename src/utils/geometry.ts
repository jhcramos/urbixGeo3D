import L from 'leaflet';

export const calculatePolygonArea = (latLngs: L.LatLng[]): number => {
    if (latLngs.length < 3) return 0;

    let area = 0;
    const R = 6378137; // Earth radius in meters

    for (let i = 0; i < latLngs.length; i++) {
        const p1 = latLngs[i];
        const p2 = latLngs[(i + 1) % latLngs.length];

        const x1 = (p1.lng * Math.PI) / 180;
        const y1 = (p1.lat * Math.PI) / 180;
        const x2 = (p2.lng * Math.PI) / 180;
        const y2 = (p2.lat * Math.PI) / 180;

        area += (x2 - x1) * (2 + Math.sin(y1) + Math.sin(y2));
    }

    area = (area * R * R) / 2.0;
    return Math.abs(area);
};

export const formatArea = (areaSqMeters: number): string => {
    if (areaSqMeters >= 10000) {
        return `${(areaSqMeters / 10000).toFixed(2)} ha`;
    }
    return `${areaSqMeters.toFixed(1)} m²`;
};

export const formatDistance = (distanceMeters: number): string => {
    if (distanceMeters >= 1000) {
        return `${(distanceMeters / 1000).toFixed(2)} km`;
    }
    return `${distanceMeters.toFixed(1)} m`;
};
