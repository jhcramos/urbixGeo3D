'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { featureLayer, dynamicMapLayer } from 'esri-leaflet';
import 'esri-leaflet-renderers';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { mockProperties } from '@/data/mockProperties';
import L from 'leaflet';
import LayerTOC from './LayerTOC';
import ImageryControl from './ImageryControl';
import GlobalIdentify from './GlobalIdentify';
import { findLayerConfig } from '@/utils/LayerMapping';
import SearchControl from './SearchControl';
import { GeoJSON } from 'react-leaflet';
import './map-animations.css';
import PropertySummaryPanel from './PropertySummaryPanel';
import CheckoutModal from './CheckoutModal';
import ChatWidget from '../Chat/ChatWidget';
import { fetchPlanningData, PlanningData } from '@/utils/PlanningFetcher';
import AssetPopup from './AssetPopup';
import MapTools, { ToolMode } from './MapTools';
import MeasureTool from './MeasureTool';
import ElevationTool from './ElevationTool';
import GradeTool from './GradeTool';
import PlanOverlayTool from './PlanOverlayTool';
import StreetViewTool from './StreetViewTool';
import LayerSelector from './LayerSelector';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper to generate number ranges
const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

const COUNCIL_LAYERS = [
    {
        id: 'utilities',
        title: 'Utilities Communication',
        url: 'https://geopublic.scc.qld.gov.au/arcgis/rest/services/UtilitiesCommunication/Utilities_SCRC/MapServer',
        type: 'dynamic' as const,
        defaultLayers: [4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18] // Stormwater Network only
    },
    {
        id: 'parcel',
        title: 'Parcel Information',
        url: 'https://geopublic.scc.qld.gov.au/arcgis/rest/services/PlanningCadastre/ParcelInformation_SCRC/MapServer',
        type: 'dynamic' as const,
        defaultLayers: [0, 1, 3] // 0: Covenants, 1: Easements, 3: Land Parcel Boundaries
    },
    {
        id: 'inlandWaters',
        title: 'Inland Waters',
        url: 'https://geopublic.scc.qld.gov.au/arcgis/rest/services/InlandWaters/InlandWaters_SCRC/MapServer',
        type: 'dynamic' as const,
        defaultLayers: []
    },
    {
        id: 'planningApps',
        title: 'Planning Applications',
        url: 'https://geopublic.scc.qld.gov.au/arcgis/rest/services/PlanningCadastre/Applications_SCRC/MapServer',
        type: 'dynamic' as const,
        defaultLayers: []
    },
    {
        id: 'planningLabels',
        title: 'Planning Labels',
        url: 'https://geopublic.scc.qld.gov.au/arcgis/rest/services/PlanningCadastre/Labels_SCRC/MapServer',
        type: 'dynamic' as const,
        defaultLayers: [0] // 0: Lot and Plan (Labels)
    },
    {
        id: 'planningOverlays',
        title: 'Planning Scheme Overlays',
        url: 'https://geoimage.scc.qld.gov.au/arcgis/rest/services/PlanningCadastre/PlanningScheme_SunshineCoast_Overlays_SCC/MapServer',
        type: 'dynamic' as const,
        defaultLayers: []
    },
    {
        id: 'zoning',
        title: 'Zoning',
        url: 'https://geoimage.scc.qld.gov.au/arcgis/rest/services/PlanningCadastre/PlanningScheme_SunshineCoast_Zoning_SCC/MapServer',
        type: 'dynamic' as const,
        defaultLayers: [5]
    },
    {
        id: 'contours',
        title: 'Contours (2022)',
        url: 'https://services-ap1.arcgis.com/YQyt7djuXN7rQyg4/arcgis/rest/services/Contours2022/FeatureServer',
        type: 'feature-collection' as const,
        defaultLayers: [],
        labelField: 'ELEVATION'
    },
    {
        id: 'buildingFootprints',
        title: 'Building Footprints (2022)',
        url: 'https://services-ap1.arcgis.com/YQyt7djuXN7rQyg4/arcgis/rest/services/Building_Footprints_2022/FeatureServer',
        type: 'feature-collection' as const,
        defaultLayers: [],
    },
    {
        id: 'water',
        title: 'Water Infrastructure',
        url: 'https://services2.arcgis.com/tQg86iShPXJPWQWw/ArcGIS/rest/services/UWPublicAccessWaterInfrastructureLayers/FeatureServer',
        type: 'feature-collection' as const,
        defaultLayers: [10], // Water Main
    },
    {
        id: 'wastewater',
        title: 'Wastewater Infrastructure',
        url: 'https://services2.arcgis.com/tQg86iShPXJPWQWw/ArcGIS/rest/services/UWPublicAccessSewerInfrastructureLayers/FeatureServer',
        type: 'feature-collection' as const,
        defaultLayers: [5, 11], // Sewer Maintenance Hole, Sewer Gravity Main
    }
];

const EsriLayer = ({ url, type = 'dynamic', opacity = 0.7, layers, labelField }: { url: string, type?: 'dynamic' | 'feature' | 'feature-collection', opacity?: number, layers?: number[], labelField?: string }) => {
    const map = useMap();
    const layerRef = useRef<any>(null);
    const featureLayersRef = useRef<Map<number, any>>(new Map());

    // 1. Initialization and Cleanup Effect
    useEffect(() => {
        if (!map) return;

        // Common onEachFeature for labeling
        const onEachFeature = (feature: any, layer: any) => {
            if (labelField && feature.properties && feature.properties[labelField]) {
                const label = feature.properties[labelField];
                layer.bindTooltip(String(label), {
                    permanent: true,
                    direction: 'center',
                    className: 'map-label'
                });
            }
        };

        // Initialize Dynamic or Single Feature Layer
        if (type === 'dynamic') {
            const options: any = {
                url,
                useCors: false,
                opacity,
                f: 'image'
            };
            // Initial layers
            if (layers && layers.length > 0) {
                options.layers = layers;
            }
            layerRef.current = dynamicMapLayer(options).addTo(map);
        } else if (type === 'feature') {
            layerRef.current = featureLayer({
                url,
                useCors: false,
                // @ts-ignore
                opacity,
                onEachFeature: onEachFeature
            }).addTo(map);
        }

        // Cleanup function
        return () => {
            if (layerRef.current && map) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
            // Cleanup feature collection layers
            if (featureLayersRef.current.size > 0 && map) {
                featureLayersRef.current.forEach(layer => map.removeLayer(layer));
                featureLayersRef.current.clear();
            }
        };
    }, [map, url, type, labelField]); // Only re-run if map/url/type changes

    // 2. Update Effect (Layers & Opacity)
    useEffect(() => {
        if (!map) return;

        // Handle Dynamic Layer Updates
        if (type === 'dynamic' && layerRef.current) {
            if (layers) {
                layerRef.current.setLayers(layers);
            }
            if (opacity !== undefined) {
                layerRef.current.setOpacity(opacity);
            }
        }
        // Handle Feature Collection Updates (Diffing)
        else if (type === 'feature-collection') {
            const onEachFeature = (feature: any, layer: any) => {
                if (labelField && feature.properties && feature.properties[labelField]) {
                    const label = feature.properties[labelField];
                    layer.bindTooltip(String(label), {
                        permanent: true,
                        direction: 'center',
                        className: 'map-label'
                    });
                }
            };

            // Remove layers that are no longer visible
            featureLayersRef.current.forEach((layer, id) => {
                if (!layers || !layers.includes(id)) {
                    map.removeLayer(layer);
                    featureLayersRef.current.delete(id);
                }
            });

            // Add new layers
            if (layers) {
                layers.forEach(id => {
                    if (!featureLayersRef.current.has(id)) {
                        const layer = featureLayer({
                            url: `${url}/${id}`,
                            useCors: false,
                            // @ts-ignore
                            opacity,
                            onEachFeature: onEachFeature
                        }).addTo(map);
                        featureLayersRef.current.set(id, layer);
                    }
                });
            }
        }
    }, [map, layers, opacity, type, url, labelField]); // Re-run on prop changes

    return null;
};

interface UrbixMapProps {
    initialSearch?: string;
}

const UrbixMap = ({ initialSearch }: UrbixMapProps) => {
    // Initialize with default layers visible (Parcel, Zoning, and Labels as per user request)
    // Initialize with default layers visible
    const [visibleSublayers, setVisibleSublayers] = useState<Record<string, number[]>>(() => {
        const defaults: Record<string, number[]> = {};
        COUNCIL_LAYERS.forEach(layer => {
            if (layer.defaultLayers && layer.defaultLayers.length > 0) {
                defaults[layer.id] = layer.defaultLayers;
            }
        });
        return defaults;
    });
    const [isSatelliteMode, setIsSatelliteMode] = useState(false);
    const [highlightedFeature, setHighlightedFeature] = useState<any>(null);

    // New state for Property Summary & Checkout
    const [identifiedFeatures, setIdentifiedFeatures] = useState<any[]>([]);
    const [planningData, setPlanningData] = useState<PlanningData | null>(null);
    const [checkoutProduct, setCheckoutProduct] = useState<any>(null);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [activeTool, setActiveTool] = useState<ToolMode>('default');
    const [ambiguousFeatures, setAmbiguousFeatures] = useState<any[]>([]);
    const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
    const [clickPoint, setClickPoint] = useState<{ x: number, y: number } | null>(null);

    // State for map instance
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

    // Auto-enable Contours when Elevation Tool is active
    useEffect(() => {
        if (activeTool === 'elevation') {
            const contoursLayer = COUNCIL_LAYERS.find(l => l.id === 'contours');
            if (contoursLayer) {
                setVisibleSublayers(prev => {
                    // Check if already visible
                    if (prev['contours'] && prev['contours'].length > 0) return prev;

                    // Enable it
                    return {
                        ...prev,
                        ['contours']: [0] // Assuming layer 0 is the main contours feature layer
                    };
                });
            }
        }
    }, [activeTool]);

    const handleUpdateVisibility = (serviceId: string, layerIds: number[]) => {
        console.log(`Updating visibility for ${serviceId}:`, layerIds);
        setVisibleSublayers(prev => ({
            ...prev,
            [serviceId]: layerIds
        }));
    };

    const handleSearchResult = async (result: any) => {
        // 1. Clear previous highlight
        setHighlightedFeature(null);
        setIdentifiedFeatures([]); // Clear previous identify results
        setPlanningData(null);
        setSelectedAsset(null);

        // 2. Zoom to result
        if (result.bounds) {
            // Zoom handled by SearchControl logic
        }

        // 3. Set new highlight if it's a feature
        if (result.feature) {
            setHighlightedFeature(result.feature);
            // Also set as identified feature to show the panel
            setIdentifiedFeatures([result.feature]);

            // Fetch planning data
            if (mapInstance) {
                const data = await fetchPlanningData(result.feature.geometry, mapInstance);
                setPlanningData(data);
            }
        }
    };

    const handleIdentifyComplete = async (features: any[], latlng: L.LatLng) => {
        console.log('Identify complete:', features, latlng);

        if (mapInstance && latlng) {
            const point = mapInstance.latLngToContainerPoint(latlng);
            setClickPoint(point);
        }

        // Reset states
        setIdentifiedFeatures([]);
        setPlanningData(null);
        setSelectedAsset(null);
        setHighlightedFeature(null);
        setAmbiguousFeatures([]);

        // If measuring or elevation tool is active, ignore standard identify
        if (activeTool === 'measure' || activeTool === 'elevation' || activeTool === 'plan') {
            return;
        }

        if (features.length > 0) {
            // Default Tool: Only allow Parcel selection
            if (activeTool === 'default') {
                features = features.filter(f => f.layerId === 'parcel');
                if (features.length === 0) return;
            }

            // UNIFIED SELECTION LOGIC
            // If multiple features found, show selector.
            // If single feature, auto-select.

            if (features.length > 1) {
                console.log('Multiple features found, showing selector:', features);
                setAmbiguousFeatures(features);
                // Position selector near the click (or center if needed, but click is better)
                // We don't have the click event here, so we'll default to center or use a fixed position
                // Actually, let's use a fixed center-ish position or pass click event if possible.
                // For now, center screen is safe.
                if (typeof window !== 'undefined') {
                    setSelectorPosition({ x: window.innerWidth / 2 - 140, y: window.innerHeight / 2 - 150 });
                }
                return;
            }

            // Single feature logic (Auto-select)
            const feature = features[0];
            handleFeatureSelect(feature);
        }
    };

    const handleFeatureSelect = async (feature: any) => {
        setAmbiguousFeatures([]); // Close selector
        console.log('Feature selected:', feature);
        setHighlightedFeature(feature);

        // Check if it's a parcel to show Property Panel
        if (feature.layerId === 'parcel') {
            setIdentifiedFeatures([feature]);
            if (mapInstance && feature.geometry) {
                const data = await fetchPlanningData(feature.geometry, mapInstance);
                setPlanningData(data);
            }
        } else {
            // Treat everything else as an Asset
            setSelectedAsset(feature);
        }
    };

    const handleLayerVisibility = (layerName: string, visible: boolean) => {
        console.log(`Setting layer '${layerName}' visibility to ${visible}`);

        const config = findLayerConfig(layerName);

        if (config) {
            setVisibleSublayers(prev => {
                const currentIds = prev[config.serviceId] || [];
                let newIds: number[];

                if (visible) {
                    // Add IDs if not present
                    const idsToAdd = config.layerIds.filter(id => !currentIds.includes(id));
                    newIds = [...currentIds, ...idsToAdd];
                } else {
                    // Remove IDs
                    newIds = currentIds.filter(id => !config.layerIds.includes(id));
                }

                return {
                    ...prev,
                    [config.serviceId]: newIds
                };
            });
        } else {
            console.warn('Unknown layer name:', layerName);
        }
    };

    return (
        <div className="relative w-full h-full">
            <MapContainer
                center={[-26.65, 153.066]}
                zoom={13}
                maxZoom={21} // Increased max zoom
                className="w-full h-full z-0"
                ref={setMapInstance}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxNativeZoom={19}
                    maxZoom={21}
                    opacity={isSatelliteMode ? 0 : 1}
                />

                {/* Satellite Imagery Layer */}
                {isSatelliteMode && (
                    <TileLayer
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        maxNativeZoom={19}
                        maxZoom={21}
                    />
                )}

                {/* Council Layers */}
                {COUNCIL_LAYERS.map(layer => (
                    <EsriLayer
                        key={layer.id}
                        url={layer.url}
                        type={layer.type}
                        layers={visibleSublayers[layer.id] || []}
                        // @ts-ignore
                        labelField={layer.labelField}
                    />
                ))}

                {/* Highlighted Feature (Blinking) */}
                {highlightedFeature && (
                    <GeoJSON
                        data={highlightedFeature}
                        key={JSON.stringify(highlightedFeature)}
                        pathOptions={{ className: "modern-blink" }}
                    />
                )}

                {/* Mock Properties */}
                {mockProperties.map((property) => (
                    <Marker key={property.id} position={[property.lat, property.lng]}>
                        <Popup>
                            <div className="min-w-[200px]">
                                <h3 className="font-bold text-lg mb-1">{property.address}</h3>
                                <p className="text-gray-600 mb-2">{property.suburb}, {property.postcode}</p>
                                <div className="flex gap-2 text-sm font-medium text-gray-800 mb-2">
                                    <span>{property.bedrooms} bed</span>
                                    <span>•</span>
                                    <span>{property.bathrooms} bath</span>
                                    <span>•</span>
                                    <span>{property.carSpaces} car</span>
                                </div>
                                <p className="text-blue-600 font-bold text-lg">
                                    ${property.price}
                                </p>
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-500 line-clamp-2">{property.description}</p>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                <GlobalIdentify
                    layers={COUNCIL_LAYERS}
                    visibleSublayers={visibleSublayers}
                    onIdentifyComplete={handleIdentifyComplete}
                />

                <LayerTOC
                    layerConfigs={COUNCIL_LAYERS}
                    visibleSublayers={visibleSublayers}
                    onUpdateVisibility={handleUpdateVisibility}
                />

                <SearchControl
                    parcelLayerUrl="https://geopublic.scc.qld.gov.au/arcgis/rest/services/PlanningCadastre/ParcelInformation_SCRC/MapServer"
                    applicationLayerUrl="https://geopublic.scc.qld.gov.au/arcgis/rest/services/PlanningCadastre/Applications_SCRC/MapServer"
                    onResultSelect={handleSearchResult}
                    initialQuery={initialSearch}
                />

                <ImageryControl
                    isSatellite={isSatelliteMode}
                    onToggle={setIsSatelliteMode}
                />

                {/* Measuring Tool */}
                <MeasureTool active={activeTool === 'measure'} />

                {/* Elevation Tool */}
                <ElevationTool active={activeTool === 'elevation'} />

                {/* Grade Tool */}
                <GradeTool active={activeTool === 'grade'} />

                {/* Plan Overlay Tool */}
                <PlanOverlayTool active={activeTool === 'plan'} />

                {/* Street View Tool */}
                <StreetViewTool active={activeTool === 'streetview'} />
            </MapContainer >

            {/* Property Summary Panel */}
            {identifiedFeatures.length > 0 && (
                <PropertySummaryPanel
                    feature={identifiedFeatures[0]}
                    planningData={planningData}
                    onClose={() => {
                        setIdentifiedFeatures([]);
                        setHighlightedFeature(null);
                        setPlanningData(null);
                    }}
                    onBuy={(product) => setCheckoutProduct(product)}
                />
            )}

            {/* Asset Popup */}
            {selectedAsset && (
                <AssetPopup
                    feature={selectedAsset}
                    initialPosition={clickPoint}
                    onClose={() => {
                        setSelectedAsset(null);
                        setHighlightedFeature(null);
                        setClickPoint(null);
                    }}
                />
            )}

            {/* Checkout Modal */}
            {checkoutProduct && (
                <CheckoutModal
                    product={checkoutProduct}
                    onClose={() => setCheckoutProduct(null)}
                />
            )}

            {/* Geo-AI Assistant */}
            <ChatWidget
                map={mapInstance}
                highlightedFeature={highlightedFeature}
                planningData={planningData}
                onLayerAction={handleLayerVisibility}
            />

            {/* Map Tools */}
            <MapTools activeTool={activeTool} onToolChange={setActiveTool} />

            {/* Layer Selector (Dropdown for overlaps) */}
            {ambiguousFeatures.length > 0 && (
                <LayerSelector
                    features={ambiguousFeatures}
                    onSelect={handleFeatureSelect}
                    onClose={() => setAmbiguousFeatures([])}
                    position={selectorPosition}
                />
            )}
        </div >
    );
};

export default UrbixMap;
