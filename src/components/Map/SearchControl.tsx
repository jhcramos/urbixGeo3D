'use client';

import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import * as Esri from 'esri-leaflet';
import L from 'leaflet';
import { Search, X, Loader2 } from 'lucide-react';
import { generateAddressVariations } from '@/utils/addressUtils';

interface SearchResult {
    label: string;
    type: 'Address' | 'Lot Plan' | 'Application';
    location?: L.LatLngExpression;
    bounds?: L.LatLngBoundsExpression;
    feature?: any;
}

interface SearchControlProps {
    parcelLayerUrl: string;
    applicationLayerUrl: string;
    onResultSelect: (result: SearchResult) => void;
    initialQuery?: string;
}

const SearchControl = ({ parcelLayerUrl, applicationLayerUrl, onResultSelect, initialQuery }: SearchControlProps) => {
    const map = useMap();
    const [query, setQuery] = useState(initialQuery || '');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const hasInitialSearchRun = useRef(false);

    // Auto-run initial search
    useEffect(() => {
        if (initialQuery && !hasInitialSearchRun.current) {
            hasInitialSearchRun.current = true;
            performSearch(initialQuery, true);
        }
    }, [initialQuery]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 2) {
                performSearch(query);
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSearchResults = async (searchText: string): Promise<SearchResult[]> => {
        const allResults: SearchResult[] = [];

        // 1. Address Search (Layer 3: Land Parcel Boundaries - address_short)
        const addressPromise = new Promise<SearchResult[]>((resolve) => {
            Esri.query({ url: `${parcelLayerUrl}/3` })
                .where(`upper(address_short) LIKE '%${searchText.toUpperCase()}%'`)
                .limit(5)
                .run((error, featureCollection) => {
                    if (error || !featureCollection) {
                        resolve([]);
                        return;
                    }
                    // @ts-ignore
                    const addressResults = featureCollection.features.map((f: any) => ({
                        label: f.properties.address_short,
                        type: 'Address' as const,
                        feature: f,
                        bounds: L.geoJSON(f).getBounds()
                    }));
                    resolve(addressResults);
                });
        });

        // 2. Lot Plan Search (Layer 3: Land Parcel Boundaries)
        const lotPlanPromise = new Promise<SearchResult[]>((resolve) => {
            Esri.query({ url: `${parcelLayerUrl}/3` })
                .where(`upper(lotplan) LIKE '%${searchText.toUpperCase()}%'`)
                .limit(5)
                .run((error, featureCollection) => {
                    if (error || !featureCollection) {
                        resolve([]);
                        return;
                    }
                    // @ts-ignore
                    const lotResults = featureCollection.features.map((f: any) => ({
                        label: `Lot ${f.properties.lotplan}`,
                        type: 'Lot Plan' as const,
                        feature: f,
                        bounds: L.geoJSON(f).getBounds()
                    }));
                    resolve(lotResults);
                });
        });

        // 3. Application Number Search (Layers 0 & 1: Development Applications)
        const appPromise = new Promise<SearchResult[]>((resolve) => {
            const searchLayer = (layerId: number) => new Promise<SearchResult[]>((innerResolve) => {
                Esri.query({ url: `${applicationLayerUrl}/${layerId}` })
                    .where(`upper(ram_id) LIKE '%${searchText.toUpperCase()}%'`)
                    .limit(5)
                    .run((error, featureCollection) => {
                        if (error || !featureCollection) {
                            innerResolve([]);
                            return;
                        }
                        // @ts-ignore
                        const appResults = featureCollection.features.map((f: any) => ({
                            label: `App: ${f.properties.ram_id} - ${f.properties.description?.substring(0, 30)}...`,
                            type: 'Application' as const,
                            feature: f,
                            bounds: L.geoJSON(f).getBounds()
                        }));
                        innerResolve(appResults);
                    });
            });

            Promise.all([searchLayer(0), searchLayer(1)]).then(results => {
                resolve([...results[0], ...results[1]]);
            });
        });

        const [addresses, lots, apps] = await Promise.all([addressPromise, lotPlanPromise, appPromise]);
        allResults.push(...addresses, ...lots, ...apps);
        return allResults;
    };

    const performSearch = async (searchText: string, autoSelect = false) => {
        setIsSearching(true);
        setIsOpen(true);

        try {
            // Generate variations (e.g. "12 Example Crescent" -> ["12 EXAMPLE CRESCENT", "12 EXAMPLE CRES"])
            const variations = generateAddressVariations(searchText);
            let results: SearchResult[] = [];

            // Iterative search: Try each variation until we find results
            for (const variation of variations) {
                // console.log(`Searching for variation: ${variation}`);
                const variationResults = await fetchSearchResults(variation);
                if (variationResults.length > 0) {
                    results = variationResults;
                    break; // Stop as soon as we find a match
                }
            }

            setResults(results);

            if (autoSelect && results.length > 0) {
                handleSelect(results[0]);
            }
        } catch (error) {
            console.error("Search error:", error);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelect = (result: SearchResult) => {
        setQuery(result.label);
        setIsOpen(false);

        if (result.bounds) {
            map.flyToBounds(result.bounds, { padding: [50, 50], maxZoom: 18 });
        } else if (result.location) {
            map.flyTo(result.location, 18);
        }

        onResultSelect(result);
    };

    return (
        <div className="leaflet-top leaflet-left mt-[80px] ml-[10px] z-[1000]" ref={searchRef}>
            <div className="leaflet-control bg-white rounded-md shadow-md w-[300px]">
                <div className="relative flex items-center px-3 py-2">
                    <Search className="w-4 h-4 text-gray-400 mr-2" />
                    <input
                        type="text"
                        className="w-full text-sm outline-none text-gray-700 placeholder-gray-400"
                        placeholder="Search Address, Lot Plan, or App No..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    />
                    {isSearching ? (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin ml-2" />
                    ) : query && (
                        <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}>
                            <X className="w-4 h-4 text-gray-400 hover:text-gray-600 ml-2" />
                        </button>
                    )}
                </div>

                {isOpen && results.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white mt-1 rounded-md shadow-lg max-h-[300px] overflow-y-auto border border-gray-100">
                        {results.map((result, index) => (
                            <button
                                key={index}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex flex-col border-b border-gray-50 last:border-none"
                                onClick={() => handleSelect(result)}
                            >
                                <span className="font-medium text-gray-800">{result.label}</span>
                                <span className="text-xs text-blue-500 font-semibold">{result.type}</span>
                            </button>
                        ))}
                    </div>
                )}

                {isOpen && query.length > 2 && results.length === 0 && !isSearching && (
                    <div className="absolute top-full left-0 w-full bg-white mt-1 rounded-md shadow-lg p-3 text-sm text-gray-500 text-center">
                        No results found
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchControl;
