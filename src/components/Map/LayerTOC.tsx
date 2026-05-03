'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckSquare, Square, Layers, Loader2, Search } from 'lucide-react';

// Types for ArcGIS MapServer Data
interface MapServerLayer {
    id: number;
    name: string;
    parentLayerId: number;
    subLayerIds: number[] | null;
    defaultVisibility: boolean;
    minScale: number;
    maxScale: number;
    type: string;
    drawingInfo?: any; // Added for client-side legend generation
}

interface MapServerResponse {
    layers: MapServerLayer[];
}

// Types for ArcGIS Legend Data
interface LegendItem {
    label: string;
    url?: string;
    imageData?: string;
    contentType?: string;
    height?: number;
    width?: number;
    values?: string[];
    // Client-side generated props
    color?: string;
    outlineColor?: string;
}

interface LegendLayer {
    layerId: number;
    layerName: string;
    layerType: string;
    minScale: number;
    maxScale: number;
    legend: LegendItem[];
}

interface LegendResponse {
    layers: LegendLayer[];
}

// Component Props
interface LayerConfig {
    id: string;
    title: string;
    url: string;
}

interface LayerTOCProps {
    layerConfigs: LayerConfig[];
    visibleSublayers: Record<string, number[]>;
    onUpdateVisibility: (serviceId: string, layerIds: number[]) => void;
}

// Merged Node Type
interface TreeNode extends MapServerLayer {
    children: TreeNode[];
    legend?: LegendItem[];
}

// Helper to generate legend from drawingInfo
const generateLegendFromRenderer = (renderer: any): LegendItem[] => {
    if (!renderer) return [];

    const createSymbolItem = (symbol: any, label: string): LegendItem => {
        let color = 'transparent';
        let outlineColor = 'transparent';

        if (symbol.color) {
            const [r, g, b, a] = symbol.color;
            color = `rgba(${r},${g},${b},${a / 255})`;
        }

        if (symbol.outline && symbol.outline.color) {
            const [r, g, b, a] = symbol.outline.color;
            outlineColor = `rgba(${r},${g},${b},${a / 255})`;
        }

        return {
            label: label || 'Symbol',
            color,
            outlineColor
        };
    };

    if (renderer.type === 'simple') {
        return [createSymbolItem(renderer.symbol, renderer.label)];
    } else if (renderer.type === 'uniqueValue') {
        return renderer.uniqueValueInfos.map((info: any) =>
            createSymbolItem(info.symbol, info.label)
        );
    }

    return [];
};

const buildLayerTree = (layers: MapServerLayer[], legendLayers: LegendLayer[]): TreeNode[] => {
    const layerMap = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    // Create map of legend data for quick lookup
    const legendMap = new Map<number, LegendItem[]>();
    legendLayers.forEach(l => {
        legendMap.set(l.layerId, l.legend);
    });

    // First pass: create nodes
    layers.forEach(layer => {
        let legend = legendMap.get(layer.id);

        // Fallback: Generate legend from drawingInfo if available and no server legend
        if ((!legend || legend.length === 0) && layer.drawingInfo?.renderer) {
            legend = generateLegendFromRenderer(layer.drawingInfo.renderer);
        }

        layerMap.set(layer.id, {
            ...layer,
            children: [],
            legend: legend
        });
    });

    // Second pass: build hierarchy
    layers.forEach(layer => {
        const node = layerMap.get(layer.id)!;
        if (layer.parentLayerId === -1) {
            roots.push(node);
        } else {
            const parent = layerMap.get(layer.parentLayerId);
            if (parent) {
                parent.children.push(node);
            } else {
                // Fallback if parent not found (shouldn't happen in valid service)
                roots.push(node);
            }
        }
    });

    return roots;
};

// Recursive Tree Item Component
const TreeItem = ({
    node,
    serviceId,
    visibleIds,
    onToggle,
    level = 0,
    defaultExpanded = false
}: {
    node: TreeNode;
    serviceId: string;
    visibleIds: number[];
    onToggle: (ids: number[], checked: boolean) => void;
    level?: number;
    defaultExpanded?: boolean;
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    // Update expansion if default changes (e.g. search)
    useEffect(() => {
        if (defaultExpanded) setIsExpanded(true);
    }, [defaultExpanded]);

    const isChecked = visibleIds.includes(node.id);
    const hasChildren = node.children.length > 0;
    const hasLegend = node.legend && node.legend.length > 0;

    // Collect all descendant IDs for group toggling
    const getAllDescendantIds = (n: TreeNode): number[] => {
        let ids = [n.id];
        n.children.forEach(child => {
            ids = [...ids, ...getAllDescendantIds(child)];
        });
        return ids;
    };

    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const idsToToggle = getAllDescendantIds(node);
        onToggle(idsToToggle, !isChecked);
    };

    return (
        <div className="select-none">
            <div
                className={`flex items-center py-1 px-2 hover:bg-gray-50 cursor-pointer ${level === 0 ? 'font-medium' : 'text-sm'}`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Expand/Collapse Icon */}
                <div className="w-4 h-4 mr-1 flex-shrink-0 text-gray-400">
                    {(hasChildren || hasLegend) && (
                        isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                </div>

                {/* Checkbox */}
                <div
                    className={`mr-2 cursor-pointer ${isChecked ? 'text-blue-600' : 'text-gray-300'}`}
                    onClick={handleCheckboxClick}
                >
                    {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                </div>

                {/* Label */}
                <span className="truncate text-gray-700">{node.name}</span>
            </div>

            {/* Children & Legend */}
            {isExpanded && (
                <div>
                    {/* Render Children */}
                    {node.children.map(child => (
                        <TreeItem
                            key={child.id}
                            node={child}
                            serviceId={serviceId}
                            visibleIds={visibleIds}
                            onToggle={onToggle}
                            level={level + 1}
                            defaultExpanded={defaultExpanded}
                        />
                    ))}

                    {/* Render Legend */}
                    {hasLegend && (
                        <div className="ml-8 pl-4 border-l-2 border-gray-100 my-1">
                            {node.legend!.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 py-1">
                                    {item.imageData ? (
                                        <img
                                            src={`data:${item.contentType};base64,${item.imageData}`}
                                            alt={item.label}
                                            width={item.width}
                                            height={item.height}
                                            className="flex-shrink-0"
                                        />
                                    ) : (
                                        <div
                                            className="w-4 h-4 border flex-shrink-0"
                                            style={{
                                                backgroundColor: item.color,
                                                borderColor: item.outlineColor
                                            }}
                                        />
                                    )}
                                    <span className="text-xs text-gray-500">{item.label || node.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function LayerTOC({ layerConfigs, visibleSublayers, onUpdateVisibility }: LayerTOCProps) {
    const [legends, setLegends] = useState<Record<string, TreeNode[]>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [isOpen, setIsOpen] = useState(true);
    const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');

    // Initialize expanded services
    useEffect(() => {
        const initialExpanded: Record<string, boolean> = {};
        layerConfigs.forEach(config => {
            initialExpanded[config.id] = true; // Default all open
        });
        setExpandedServices(initialExpanded);
    }, [layerConfigs]);

    // Fetch legends on mount
    useEffect(() => {
        const fetchAllData = async () => {
            for (const layer of layerConfigs) {
                if (!legends[layer.id] && !loading[layer.id]) {
                    setLoading(prev => ({ ...prev, [layer.id]: true }));
                    try {
                        // Fetch metadata first
                        const metadataRes = await fetch(`${layer.url}?f=json`);
                        const metadata: MapServerResponse = await metadataRes.json();

                        // Try to fetch legend, but don't fail if it's missing (common for FeatureServers)
                        let legendData: LegendResponse = { layers: [] };
                        try {
                            const legendRes = await fetch(`${layer.url}/legend?f=json`);
                            if (legendRes.ok) {
                                legendData = await legendRes.json();
                            }
                        } catch (e) {
                            console.warn(`Could not fetch legend for ${layer.title}`, e);
                        }

                        // If legend fetch failed or returned error (like the 400 we saw), legendData.layers might be undefined
                        let legendLayers = legendData.layers || [];

                        // Fallback: If no legend and no drawingInfo in service metadata, fetch individual layer metadata
                        // This is common for FeatureServers where drawingInfo is on the layer, not the service
                        if (legendLayers.length === 0) {
                            const updatedLayers = await Promise.all(metadata.layers.map(async (l) => {
                                if (!l.drawingInfo && !l.subLayerIds) {
                                    try {
                                        const layerMetaRes = await fetch(`${layer.url}/${l.id}?f=json`);
                                        const layerMeta = await layerMetaRes.json();
                                        if (layerMeta.drawingInfo) {
                                            return { ...l, drawingInfo: layerMeta.drawingInfo };
                                        }
                                    } catch (e) {
                                        console.warn(`Could not fetch layer metadata for ${l.name}`, e);
                                    }
                                }
                                return l;
                            }));
                            // @ts-ignore
                            metadata.layers = updatedLayers;
                        }

                        const tree = buildLayerTree(metadata.layers, legendLayers);
                        setLegends(prev => ({ ...prev, [layer.id]: tree }));

                    } catch (error) {
                        console.error(`Failed to fetch data for ${layer.title}`, error);
                    } finally {
                        setLoading(prev => ({ ...prev, [layer.id]: false }));
                    }
                }
            }
        };

        fetchAllData();
    }, [layerConfigs]);

    const handleToggle = (serviceId: string, idsToToggle: number[], isChecking: boolean) => {
        const currentVisible = visibleSublayers[serviceId] || [];
        let newVisible: number[];

        if (isChecking) {
            // Add IDs if not already present
            const toAdd = idsToToggle.filter(id => !currentVisible.includes(id));
            newVisible = [...currentVisible, ...toAdd];
        } else {
            // Remove IDs
            newVisible = currentVisible.filter(id => !idsToToggle.includes(id));
        }

        onUpdateVisibility(serviceId, newVisible);
    };

    const toggleService = (serviceId: string) => {
        setExpandedServices(prev => ({
            ...prev,
            [serviceId]: !prev[serviceId]
        }));
    };

    const toggleAllInService = (e: React.MouseEvent, serviceId: string) => {
        e.stopPropagation();
        const tree = legends[serviceId];
        if (!tree) return;

        // Helper to get all IDs in tree
        const getAllIds = (nodes: TreeNode[]): number[] => {
            let ids: number[] = [];
            nodes.forEach(node => {
                ids.push(node.id);
                if (node.children) {
                    ids = [...ids, ...getAllIds(node.children)];
                }
            });
            return ids;
        };

        const allIds = getAllIds(tree);
        const currentVisible = visibleSublayers[serviceId] || [];

        // If ALL are currently visible, turn OFF. Otherwise turn ALL ON.
        // We check if every ID in allIds is present in currentVisible
        const allVisible = allIds.every(id => currentVisible.includes(id));

        if (allVisible) {
            onUpdateVisibility(serviceId, []);
        } else {
            onUpdateVisibility(serviceId, allIds);
        }
    };

    // Filter tree based on search
    const filteredLegends = useMemo(() => {
        if (!searchQuery) return legends;

        const filtered: Record<string, TreeNode[]> = {};
        const lowerQuery = searchQuery.toLowerCase();

        const filterNode = (node: TreeNode): TreeNode | null => {
            const matches = node.name.toLowerCase().includes(lowerQuery);
            const filteredChildren = node.children
                .map(filterNode)
                .filter((n): n is TreeNode => n !== null);

            if (matches || filteredChildren.length > 0) {
                return {
                    ...node,
                    children: filteredChildren
                };
            }
            return null;
        };

        Object.entries(legends).forEach(([id, nodes]) => {
            const filteredNodes = nodes
                .map(filterNode)
                .filter((n): n is TreeNode => n !== null);

            if (filteredNodes.length > 0) {
                filtered[id] = filteredNodes;
            }
        });

        return filtered;
    }, [legends, searchQuery]);

    // Check if a service has any visible layers (for the checkbox state)
    const isServiceFullyVisible = (serviceId: string) => {
        const tree = legends[serviceId];
        if (!tree) return false;

        // This is a simplified check: just checks if *any* are visible for partial state, 
        // or we could check *all* for checked state.
        // Let's do: Checked if ALL visible. Unchecked if NONE visible. Indeterminate (visually) if SOME.
        // For now, simple boolean: Checked if ALL visible.

        const getAllIds = (nodes: TreeNode[]): number[] => {
            let ids: number[] = [];
            nodes.forEach(node => {
                ids.push(node.id);
                if (node.children) ids = [...ids, ...getAllIds(node.children)];
            });
            return ids;
        };

        const allIds = getAllIds(tree);
        const currentVisible = visibleSublayers[serviceId] || [];
        return allIds.length > 0 && allIds.every(id => currentVisible.includes(id));
    };

    return (
        <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden w-80 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div
                className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 font-semibold text-gray-700">
                    <Layers size={18} />
                    <span>Map Layers</span>
                </div>
                {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>

            {/* Content */}
            {isOpen && (
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Search Bar */}
                    <div className="p-2 border-b border-gray-100 bg-white">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search layers..."
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 p-2 bg-white">
                        {layerConfigs.map(config => {
                            // If searching, only show services that have matches
                            if (searchQuery && !filteredLegends[config.id]) return null;

                            return (
                                <div key={config.id} className="mb-2 border border-gray-100 rounded-md overflow-hidden">
                                    {/* Service Header (Accordion) */}
                                    <div
                                        className="flex items-center px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => toggleService(config.id)}
                                    >
                                        <div className="mr-2 text-gray-500">
                                            {expandedServices[config.id] || searchQuery ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </div>

                                        {/* Toggle All Checkbox */}
                                        <div
                                            className={`mr-2 ${isServiceFullyVisible(config.id) ? 'text-blue-600' : 'text-gray-300'}`}
                                            onClick={(e) => toggleAllInService(e, config.id)}
                                            title="Toggle all layers in this group"
                                        >
                                            {isServiceFullyVisible(config.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </div>

                                        <span className="font-semibold text-sm text-gray-800 flex-1 truncate" title={config.title}>{config.title}</span>

                                        {loading[config.id] && (
                                            <Loader2 size={14} className="animate-spin text-blue-600 ml-2" />
                                        )}
                                    </div>

                                    {/* Service Content */}
                                    {(expandedServices[config.id] || searchQuery) && (
                                        <div className="p-2 bg-white">
                                            {filteredLegends[config.id] ? (
                                                filteredLegends[config.id].map(rootNode => (
                                                    <TreeItem
                                                        key={rootNode.id}
                                                        node={rootNode}
                                                        serviceId={config.id}
                                                        visibleIds={visibleSublayers[config.id] || []}
                                                        onToggle={(ids, checked) => handleToggle(config.id, ids, checked)}
                                                        defaultExpanded={!!searchQuery}
                                                    />
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-xs text-gray-400 italic">
                                                    {loading[config.id] ? 'Loading layers...' : 'No layers found'}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
