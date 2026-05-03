'use client';

import { useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';

interface GlobalIdentifyProps {
    layers: Array<{
        id: string;
        title: string;
        url: string;
        type: 'dynamic' | 'feature' | 'feature-collection';
    }>;
    visibleSublayers: Record<string, number[]>;
    onIdentifyComplete?: (features: any[], latlng: L.LatLng) => void;
}

const GlobalIdentify = ({ layers, visibleSublayers, onIdentifyComplete }: GlobalIdentifyProps) => {
    const map = useMap();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!map) return;

        const handleMapClick = async (e: L.LeafletMouseEvent) => {
            console.log('Map clicked:', e.latlng);
            console.log('Visible Sublayers:', visibleSublayers);

            // Only proceed if there are visible layers
            const activeServices = layers.filter(layer =>
                visibleSublayers[layer.id] && visibleSublayers[layer.id].length > 0
            );

            console.log('Active Services:', activeServices);

            if (activeServices.length === 0) {
                console.log('No active services to identify.');
                return;
            }

            setIsLoading(true);

            // Dynamically import esri-leaflet
            const { identifyFeatures, query } = await import('esri-leaflet');

            const identifyPromises = activeServices.map(layer => {
                if (layer.type === 'feature-collection') {
                    // ... (existing code)
                    const sublayerIds = visibleSublayers[layer.id] || [];
                    const subPromises = sublayerIds.map(id => {
                        return new Promise<any[]>((resolve) => {
                            query({ url: `${layer.url}/${id}` })
                                .nearby(e.latlng, 10)
                                .run((error: any, featureCollection: any) => {
                                    if (error) {
                                        console.error(`Query error for ${layer.title} sublayer ${id}:`, error);
                                        resolve([]);
                                        return;
                                    }
                                    console.log(`Query success for ${layer.title} sublayer ${id}:`, featureCollection);
                                    const features = featureCollection.features.map((f: any) => ({
                                        ...f,
                                        layerTitle: layer.title, // We could fetch specific layer name if needed
                                        layerId: layer.id
                                    }));
                                    resolve(features);
                                });
                        });
                    });
                    return Promise.all(subPromises).then(results => results.flat());
                }

                return new Promise<any[]>((resolve) => {
                    const visibleIds = visibleSublayers[layer.id].join(',');
                    console.log(`Identifying on ${layer.title} with visible IDs: ${visibleIds}`);

                    identifyFeatures({
                        url: layer.url,
                        useCors: false
                    })
                        .on(map)
                        .at(e.latlng)
                        .layers(`visible:${visibleIds}`)
                        .run((error: any, featureCollection: any) => {
                            if (error) {
                                console.error(`Identify error for ${layer.title}:`, error);
                                resolve([]);
                                return;
                            }
                            console.log(`Identify success for ${layer.title}:`, featureCollection);
                            // Add layer title to each feature for context
                            const features = featureCollection.features.map((f: any) => ({
                                ...f,
                                layerTitle: layer.title,
                                layerId: layer.id
                            }));
                            resolve(features);
                        });
                });
            });

            try {
                const results = await Promise.all(identifyPromises);
                const allFeatures = results.flat();

                if (allFeatures.length > 0) {
                    if (onIdentifyComplete) {
                        onIdentifyComplete(allFeatures, e.latlng);
                    } else {
                        // Fallback to popup if no callback provided (legacy behavior)
                        const content = document.createElement('div');
                        content.className = 'p-2 max-h-[300px] overflow-y-auto';

                        allFeatures.forEach((feature, index) => {
                            const featureDiv = document.createElement('div');
                            featureDiv.className = `mb-4 ${index !== allFeatures.length - 1 ? 'border-b border-gray-200 pb-2' : ''}`;

                            const title = document.createElement('h4');
                            title.className = 'font-bold text-sm mb-2 text-blue-600';
                            title.textContent = feature.layerTitle;
                            featureDiv.appendChild(title);

                            const attributes = document.createElement('div');
                            attributes.className = 'text-xs space-y-1';

                            Object.entries(feature.properties).forEach(([key, value]) => {
                                if (['OBJECTID', 'Shape', 'Shape_Length', 'Shape_Area', 'GlobalID'].includes(key)) return;

                                const row = document.createElement('p');
                                row.innerHTML = `<span class="font-semibold text-gray-600">${key}:</span> ${value || 'N/A'}`;
                                attributes.appendChild(row);
                            });

                            featureDiv.appendChild(attributes);
                            content.appendChild(featureDiv);
                        });

                        L.popup()
                            .setLatLng(e.latlng)
                            .setContent(content)
                            .openOn(map);
                    }
                }
            } catch (error) {
                console.error('Global identify error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        map.on('click', handleMapClick);

        return () => {
            map.off('click', handleMapClick);
        };
    }, [map, layers, visibleSublayers, onIdentifyComplete]);

    return null; // Headless component
};

export default GlobalIdentify;
