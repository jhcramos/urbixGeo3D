export interface LayerConfig {
    serviceId: string;
    layerIds: number[];
    name: string;
}

export const LAYER_MAPPINGS: Record<string, LayerConfig> = {
    // Utilities
    'stormwater': { serviceId: 'utilities', layerIds: [2], name: 'Stormwater Network' },
    'pipes': { serviceId: 'utilities', layerIds: [2], name: 'Stormwater Pipes' },

    // Water Infrastructure (New)
    'water': { serviceId: 'water', layerIds: [10], name: 'Water Infrastructure' }, // 10: Water Main
    'water pipes': { serviceId: 'water', layerIds: [10], name: 'Water Pipes' },

    // Wastewater Infrastructure (New)
    'wastewater': { serviceId: 'wastewater', layerIds: [5, 11], name: 'Wastewater Infrastructure' }, // 5: Maintenance Hole, 11: Gravity Main
    'sewer': { serviceId: 'wastewater', layerIds: [5, 11], name: 'Wastewater/Sewer' },
    'waste pipes': { serviceId: 'wastewater', layerIds: [5, 11], name: 'Waste Pipes' },

    // Building Footprints (New)
    'building footprints': { serviceId: 'buildingFootprints', layerIds: [0], name: 'Building Footprints' },
    'footprints': { serviceId: 'buildingFootprints', layerIds: [0], name: 'Building Footprints' },

    // Parcel Info
    'easements': { serviceId: 'parcel', layerIds: [1], name: 'Easements' },
    'covenants': { serviceId: 'parcel', layerIds: [0], name: 'Covenants' },
    'boundaries': { serviceId: 'parcel', layerIds: [3], name: 'Land Parcel Boundaries' },
    'parcel': { serviceId: 'parcel', layerIds: [3], name: 'Land Parcel' },

    // Zoning
    'zoning': { serviceId: 'zoning', layerIds: [5], name: 'Zones' },
    'zones': { serviceId: 'zoning', layerIds: [5], name: 'Zones' },

    // Planning Overlays (IDs from metadata)
    'acid sulfate': { serviceId: 'planningOverlays', layerIds: [0], name: 'Acid Sulfate Soils' },
    'airport': { serviceId: 'planningOverlays', layerIds: [1], name: 'Airport Environs' },
    'biodiversity': { serviceId: 'planningOverlays', layerIds: [22], name: 'Biodiversity' },
    'wetlands': { serviceId: 'planningOverlays', layerIds: [22], name: 'Wetlands' },
    'bushfire': { serviceId: 'planningOverlays', layerIds: [31], name: 'Bushfire Hazard' },
    'fire': { serviceId: 'planningOverlays', layerIds: [31], name: 'Bushfire Hazard' },
    'coastal': { serviceId: 'planningOverlays', layerIds: [36], name: 'Coastal Protection' },
    'extractive': { serviceId: 'planningOverlays', layerIds: [39], name: 'Extractive Resources' },
    'flood': { serviceId: 'planningOverlays', layerIds: [45], name: 'Flood Hazard' },
    'flooding': { serviceId: 'planningOverlays', layerIds: [45], name: 'Flood Hazard' },
    'height': { serviceId: 'planningOverlays', layerIds: [48], name: 'Building Height' },
    'heritage': { serviceId: 'planningOverlays', layerIds: [51], name: 'Heritage' },
    'landslide': { serviceId: 'planningOverlays', layerIds: [58], name: 'Landslide Hazard' },
    'slope': { serviceId: 'planningOverlays', layerIds: [59], name: 'Steep Land' },
    'regional infrastructure': { serviceId: 'planningOverlays', layerIds: [60], name: 'Regional Infrastructure' },
    'scenic': { serviceId: 'planningOverlays', layerIds: [69], name: 'Scenic Amenity' },
    'water catchment': { serviceId: 'planningOverlays', layerIds: [72], name: 'Water Resource Catchments' },

    // Inland Waters
    'inland waters': { serviceId: 'inlandWaters', layerIds: [0], name: 'Inland Waters' }, // Assuming 0 for now

    // Planning Applications
    'applications': { serviceId: 'planningApps', layerIds: [0, 1, 2, 3, 4, 5], name: 'Planning Applications' },
    'da': { serviceId: 'planningApps', layerIds: [0, 1, 2, 3, 4, 5], name: 'Development Applications' },

    // Contours
    'contours': { serviceId: 'contours', layerIds: [0], name: 'Contours' },
    'elevation': { serviceId: 'contours', layerIds: [0], name: 'Elevation' }
};

export const findLayerConfig = (query: string): LayerConfig | null => {
    const lowerQuery = query.toLowerCase();

    // Direct match
    if (LAYER_MAPPINGS[lowerQuery]) {
        return LAYER_MAPPINGS[lowerQuery];
    }

    // Partial match (find first key that is contained in the query)
    const key = Object.keys(LAYER_MAPPINGS).find(k => lowerQuery.includes(k));
    if (key) {
        return LAYER_MAPPINGS[key];
    }

    return null;
};
