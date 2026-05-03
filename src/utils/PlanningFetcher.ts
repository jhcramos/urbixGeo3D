import * as Esri from 'esri-leaflet';
import L from 'leaflet';

// Define layer URLs
const LAYERS = {
    zoning: 'https://geoimage.scc.qld.gov.au/arcgis/rest/services/PlanningCadastre/PlanningScheme_SunshineCoast_Zoning_SCC/MapServer',
    overlays: 'https://geoimage.scc.qld.gov.au/arcgis/rest/services/PlanningCadastre/PlanningScheme_SunshineCoast_Overlays_SCC/MapServer',
    buildingFootprints: 'https://services-ap1.arcgis.com/YQyt7djuXN7rQyg4/arcgis/rest/services/Building_Footprints_2022/FeatureServer/0',
    parcel: 'https://geopublic.scc.qld.gov.au/arcgis/rest/services/PlanningCadastre/ParcelInformation_SCRC/MapServer'
};

export interface PlanningData {
    zones: Array<{
        name: string;
        code: string;
        color?: string;
    }>;
    overlays: Array<{
        name: string;
        type: string;
    }>;
    landArea?: string;
    buildingArea?: string;
}

export const fetchPlanningData = async (geometry: any, map: L.Map): Promise<PlanningData> => {
    const results: PlanningData = {
        zones: [],
        overlays: []
    };

    if (!map || !geometry) return results;

    try {
        // Create a temporary Leaflet GeoJSON layer to get bounds/center for the query
        const geoJsonLayer = L.geoJSON(geometry);
        const bounds = geoJsonLayer.getBounds();
        const center = bounds.getCenter();

        // 1. Query Zoning
        const zoningPromise = new Promise<void>((resolve) => {
            Esri.identifyFeatures({
                url: LAYERS.zoning
            })
                .on(map)
                .at(center)
                .tolerance(3) // Small tolerance as we are clicking/centering on a parcel
                .layers('all:5') // Explicitly target the Zones layer
                .run((error: any, featureCollection: any) => {
                    if (error) {
                        console.error('Zoning query error:', JSON.stringify(error, null, 2));
                        resolve();
                        return;
                    }

                    if (featureCollection && featureCollection.features) {
                        featureCollection.features.forEach((f: any) => {
                            const props = f.properties;
                            // SCC Fields: LABEL, DESCRIPT, HEADING
                            const name = props.LABEL || props.DESCRIPT || props.NAME || 'Unknown Zone';
                            const code = props.HEADING || props.CODE || ''; // Use HEADING as category/code

                            // Avoid duplicates
                            if (!results.zones.some(z => z.name === name)) {
                                results.zones.push({ name, code });
                            }
                        });
                    }
                    resolve();
                });
        });

        // 2. Query Overlays
        const overlaysPromise = new Promise<void>((resolve) => {
            Esri.identifyFeatures({
                url: LAYERS.overlays
            })
                .on(map)
                .at(center)
                .tolerance(3)
                .layers('top') // Identify top-most visible features
                .run((error: any, featureCollection: any) => {
                    if (error) {
                        console.error('Overlay query error:', JSON.stringify(error, null, 2));
                        resolve();
                        return;
                    }

                    if (featureCollection && featureCollection.features) {
                        featureCollection.features.forEach((f: any) => {
                            const props = f.properties;
                            // SCC Fields: LABEL, DESCRIPT
                            const name = props.LABEL || props.DESCRIPT || props.NAME || 'Unknown Overlay';
                            const type = props.HEADING || 'Overlay'; // HEADING is often empty for overlays, default to 'Overlay'

                            if (!results.overlays.some(o => o.name === name)) {
                                results.overlays.push({ name, type });
                            }
                        });
                    }
                    resolve();
                });
        });

        // 3. Query Building Footprints (Feature Layer)
        const buildingPromise = new Promise<void>((resolve) => {
            Esri.query({
                url: LAYERS.buildingFootprints
            })
                .intersects(bounds) // Use bounds of the property
                .run((error: any, featureCollection: any) => {
                    if (error) {
                        console.error('Building footprints query error:', error);
                        resolve();
                        return;
                    }

                    if (featureCollection && featureCollection.features && featureCollection.features.length > 0) {
                        // Sum area of all intersecting footprints or take the largest
                        // Assuming Shape__Area or similar field exists. 
                        // If not, we might need to calculate it from geometry, but let's try to find a field first.
                        // Common fields: Shape__Area, Area, SHAPE.AREA
                        let totalArea = 0;
                        featureCollection.features.forEach((f: any) => {
                            const area = f.properties.Shape__Area || f.properties.SHAPE__Area || f.properties.Area || 0;
                            totalArea += area;
                        });

                        if (totalArea > 0) {
                            results.buildingArea = `${Math.round(totalArea)} m²`;
                        }
                    }
                    resolve();
                });
        });

        // 4. Query Land Area (Parcel Layer)
        const parcelPromise = new Promise<void>((resolve) => {
            Esri.identifyFeatures({
                url: LAYERS.parcel
            })
                .on(map)
                .at(center)
                .layers('all:3') // Layer 3: Land Parcel Boundaries
                .run((error: any, featureCollection: any) => {
                    if (error) {
                        console.error('Parcel query error:', error);
                        resolve();
                        return;
                    }

                    if (featureCollection && featureCollection.features && featureCollection.features.length > 0) {
                        const f = featureCollection.features[0];
                        // Look for area field
                        const area = f.properties.SHAPE_Area || f.properties.Shape_Area || f.properties.AREA || 0;
                        if (area > 0) {
                            results.landArea = `${Math.round(area)} m²`;
                        }
                    }
                    resolve();
                });
        });

        await Promise.all([zoningPromise, overlaysPromise, buildingPromise, parcelPromise]);

    } catch (e) {
        console.error('Error fetching planning data:', e);
    }

    return results;
};
