/**
 * Converts an S3 path to ExternalImageId format
 * Example: "PNG/NATIONAL CAPITAL DISTRICT/MORESBY NORTH-EAST/130168379_Soare_Nuana_F.jpg"
 * becomes "PNG:NATIONAL_CAPITAL_DISTRICT:MORESBY_NORTH-EAST:130168379_Soare_Nuana_F.jpg"
 */
export function convertS3PathToExternalId(s3Path: string): string {
    // First, split the path by slashes to get all components
    const pathParts = s3Path.split('/');

    // Process each folder component (replace spaces with underscores)
    const processedParts = pathParts.map(part =>
        part.replace(/\s+/g, '_')
    );

    // Join with colons to create the ExternalImageId
    return processedParts.join(':');
}

/**
 * Converts an ExternalImageId format back to an S3 path
 * Example: "PNG:NATIONAL_CAPITAL_DISTRICT:MORESBY_NORTH-EAST:130168379_Soare_Nuana_F.jpg"
 * becomes "PNG/NATIONAL CAPITAL DISTRICT/MORESBY NORTH-EAST/130168379_Soare_Nuana_F.jpg"
 */
export function convertExternalIdToS3Path(externalId: string): string {
    if (!externalId) return '';

    // We need to be careful with underscores that are part of the filename
    // So we'll work right-to-left to make sure we only convert folder name underscores

    // First split by colons
    const parts = externalId.split(':');

    // Process each component (replace underscores with spaces in folder parts)
    // Keep the file name as-is (the last component)
    const processedParts = parts.map((part, index) => {
        // Don't replace underscores in the file name (last part)
        if (index < parts.length - 1) {
            return part.replace(/_/g, ' ');
        }
        return part;
    });

    // Join with slashes to create the S3 path
    return processedParts.join('/');
}

/**
 * Extracts a human-readable name from an ExternalImageId
 */
export function extractNameFromExternalId(externalId: string): string {
    if (!externalId) return 'Unknown';

    // Extract the filename which is the last part after the last colon
    const parts = externalId.split(':');
    const fileName = parts[parts.length - 1];

    // Try to extract a name from the filename
    // Common pattern might be ID_FirstName_LastName.jpg
    // or just FirstName_LastName.jpg

    // Remove file extension
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");

    // Check if it has the format like "123456_John_Doe"
    const nameParts = nameWithoutExt.split('_');

    // If it has at least 3 parts and the first part is numeric, assume ID_FirstName_LastName
    if (nameParts.length >= 3 && /^\d+$/.test(nameParts[0])) {
        // Return FirstName LastName
        return nameParts.slice(1).join(' ');
    }
    // If it has at least 2 parts, assume FirstName_LastName
    else if (nameParts.length >= 2) {
        return nameParts.join(' ');
    }

    // If we can't parse it, just return the filename without extension
    return nameWithoutExt;
}

/**
 * Extracts folder path from ExternalImageId (excluding the file name)
 */
export function extractFolderPathFromExternalId(externalId: string): string {
    if (!externalId) return '';

    // Split by colons
    const parts = externalId.split(':');

    // Remove the last part (file name) and join the folder parts
    const folderParts = parts.slice(0, -1);

    // Convert to S3 path format for folders only
    return folderParts.map(part => part.replace(/_/g, ' ')).join('/');
}

/**
 * Parses an ExternalImageId into folder structure and filename
 */
export function parseExternalImageId(externalId: string): {
    folders: string[],
    displayFolders: string[],
    filename: string,
    fullPath: string
} {
    if (!externalId) {
        return {
            folders: [],
            displayFolders: [],
            filename: '',
            fullPath: ''
        };
    }

    // Split by colons
    const parts = externalId.split(':');

    // Get filename (last part)
    const filename = parts[parts.length - 1];

    // Get folder parts
    const folders = parts.slice(0, -1);

    // Get display folders (with spaces instead of underscores)
    const displayFolders = folders.map(f => f.replace(/_/g, ' '));

    // Full path in S3 format
    const fullPath = convertExternalIdToS3Path(externalId);

    return {
        folders,
        displayFolders,
        filename,
        fullPath
    };
}

/**
 * Builds a folder hierarchy from a list of ExternalImageIds
 */
export function buildFolderHierarchy(externalIds: string[]): any {
    const hierarchy: any = {};

    externalIds.forEach(id => {
        if (!id) return;

        const parsedId = parseExternalImageId(id);
        let currentLevel = hierarchy;

        // Navigate through folder structure
        for (let i = 0; i < parsedId.folders.length; i++) {
            const folderName = parsedId.displayFolders[i];
            const folderKey = parsedId.folders[i];

            if (!currentLevel[folderName]) {
                currentLevel[folderName] = {
                    _path: parsedId.folders.slice(0, i + 1).join(':'),
                    _displayPath: parsedId.displayFolders.slice(0, i + 1).join('/'),
                    _files: [],
                    _externalIdPrefix: parsedId.folders.slice(0, i + 1).join(':')
                };
            }

            currentLevel = currentLevel[folderName];
        }

        // Add file to the current folder
        currentLevel._files.push(id);
    });

    return hierarchy;
}

/**
 * Groups faces by folder hierarchy
 */
export function groupFacesByFolder(faces: any[]): Record<string, {
    faces: any[],
    folder: string,
    displayPath: string,
    subfolders: string[]
}> {
    // Get ExternalImageIds
    const externalIds = faces
        .map(face => face.ExternalImageId)
        .filter(id => id);

    // Build hierarchy
    const hierarchy = buildFolderHierarchy(externalIds);

    // Prepare result object
    const result: Record<string, {
        faces: any[],
        folder: string,
        displayPath: string,
        subfolders: string[]
    }> = {};

    // Function to process folders recursively
    function processFolder(folder: any, path: string, displayPath: string) {
        // Create entry for this folder
        result[path] = {
            faces: [],
            folder: path,
            displayPath: displayPath,
            subfolders: []
        };

        // Add faces from this folder
        if (folder._files && folder._files.length > 0) {
            folder._files.forEach((externalId: string) => {
                const face = faces.find(f => f.ExternalImageId === externalId);
                if (face) {
                    result[path].faces.push({
                        ...face,
                        s3Path: convertExternalIdToS3Path(externalId)
                    });
                }
            });
        }

        // Process subfolders
        Object.keys(folder).forEach(key => {
            // Skip metadata fields (starting with _)
            if (key.startsWith('_')) return;

            const subfolder = folder[key];
            const subfolderPath = path ? `${path}:${key.replace(/ /g, '_')}` : key.replace(/ /g, '_');
            const subfolderDisplayPath = displayPath ? `${displayPath}/${key}` : key;

            // Add to subfolders list
            result[path].subfolders.push(subfolderPath);

            // Process recursively
            processFolder(subfolder, subfolderPath, subfolderDisplayPath);
        });
    }

    // Start processing from root
    processFolder(hierarchy, '', '');

    return result;
}