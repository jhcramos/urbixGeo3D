export const ASSET_TYPE_MAPPING: Record<number, string> = {
    // Water Main (Layer 10)
    11101: 'Raw Water Main',
    11102: 'Trunk Main',
    11103: 'Reticulation Main',
    11104: 'Scour Pipe',

    // Sewer Gravity Main (Layer 11)
    21201: 'Trunk Main',
    21202: 'Reticulation Main',
    21203: 'Overflow Main',
    21204: 'Siphon Main',

    // Add other common codes if discovered
};

export const getAssetTypeName = (properties: any): string | null => {
    // 1. Check for SubtypeCD and map it
    if (properties.SubtypeCD !== undefined && properties.SubtypeCD !== null) {
        const code = parseInt(properties.SubtypeCD, 10);
        if (ASSET_TYPE_MAPPING[code]) {
            return ASSET_TYPE_MAPPING[code];
        }
    }

    // 2. Check for FEATURETYPECODE (Stormwater)
    if (properties.FEATURETYPECODE && properties.FEATURETYPECODE !== 'Unknown' && properties.FEATURETYPECODE !== 'Null') {
        return properties.FEATURETYPECODE;
    }

    // 3. Check other common fields
    const typeFields = [
        'FeatureTypeCode', 'featuretypecode',
        'ASSET_TYPE', 'ASSETTYPE', 'AssetType', 'TYPE', 'Type',
        'SUBTYPE', 'Subtype', 'CLASS', 'Class',
        'USAGE', 'Usage', 'DESCRIPTION', 'Description'
    ];

    for (const field of typeFields) {
        if (properties[field] && properties[field] !== 'Unknown' && properties[field] !== 'Null') {
            return properties[field];
        }
    }

    return null;
};
