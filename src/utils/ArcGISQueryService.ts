import * as Esri from 'esri-leaflet';
import L from 'leaflet';

const LAYERS = {
    parcel: 'https://geopublic.scc.qld.gov.au/arcgis/rest/services/PlanningCadastre/ParcelInformation_SCRC/MapServer',
    utilities: 'https://geopublic.scc.qld.gov.au/arcgis/rest/services/UtilitiesCommunication/Utilities_SCRC/MapServer'
};

export interface QueryResult {
    found: boolean;
    features: any[];
    message: string;
}

export const ArcGISQueryService = {
    /**
     * Checks for easements on the property.
     * Layer 1: Easements
     */
    checkEasements: async (geometry: any, map: L.Map): Promise<QueryResult> => {
        return new Promise((resolve) => {
            if (!map || !geometry) {
                resolve({ found: false, features: [], message: 'Map context missing.' });
                return;
            }

            const geoJsonLayer = L.geoJSON(geometry);
            const bounds = geoJsonLayer.getBounds();
            const center = bounds.getCenter();

            Esri.identifyFeatures({
                url: LAYERS.parcel
            })
                .on(map)
                .at(center)
                .tolerance(3)
                .layers('all:1') // Layer 1 is Easements
                .run((error: any, featureCollection: any) => {
                    if (error) {
                        console.error('Easement query error:', error);
                        resolve({ found: false, features: [], message: 'Error querying easements.' });
                        return;
                    }

                    const features = featureCollection?.features || [];
                    if (features.length > 0) {
                        resolve({
                            found: true,
                            features,
                            message: `Found ${features.length} easement(s) on this property.`
                        });
                    } else {
                        resolve({
                            found: false,
                            features: [],
                            message: 'No registered easements found on this property.'
                        });
                    }
                });
        });
    },

    /**
     * Checks for stormwater infrastructure (pipes) near the property.
     * Layer 8: Stormwater Pipe (Council)
     * Layer 16: Stormwater Pipe (Non Council)
     */
    checkStormwater: async (geometry: any, map: L.Map): Promise<QueryResult> => {
        return new Promise((resolve) => {
            if (!map || !geometry) {
                resolve({ found: false, features: [], message: 'Map context missing.' });
                return;
            }

            const geoJsonLayer = L.geoJSON(geometry);
            const bounds = geoJsonLayer.getBounds();
            const center = bounds.getCenter();

            Esri.identifyFeatures({
                url: LAYERS.utilities
            })
                .on(map)
                .at(center)
                .tolerance(5) // Slightly larger tolerance for pipes
                .layers('all:8,16') // Council & Non-Council Pipes
                .run((error: any, featureCollection: any) => {
                    if (error) {
                        console.error('Stormwater query error:', error);
                        resolve({ found: false, features: [], message: 'Error querying stormwater.' });
                        return;
                    }

                    const features = featureCollection?.features || [];
                    if (features.length > 0) {
                        resolve({
                            found: true,
                            features,
                            message: `Found ${features.length} stormwater pipe(s) in or near the property.`
                        });
                    } else {
                        resolve({
                            found: false,
                            features: [],
                            message: 'No stormwater pipes detected in the immediate vicinity.'
                        });
                    }
                });
        });
    }
};
