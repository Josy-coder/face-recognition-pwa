import {
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getS3Client } from '@/lib/aws-config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { convertS3PathToExternalId } from '../utils/path-conversion';

class S3Service {
    private readonly bucketName = process.env.NEXT_PUBLIC_S3_BUCKET || 'facerecog-app-storage';

    /**
     * Upload an image to S3
     */
    async uploadImage(imageData: string, folderPath: string, fileName: string): Promise<string | null> {
        try {
            const s3 = getS3Client();

            // Remove base64 header if present
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            // Create key path (folder/filename)
            const key = folderPath ? `${folderPath}/${fileName}` : fileName;

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: buffer,
                ContentType: 'image/jpeg',
                ContentEncoding: 'base64'
            });

            await s3.send(command);

            return key;
        } catch (error) {
            console.error('Error uploading image to S3:', error);
            return null;
        }
    }

    /**
     * Batch upload multiple images to S3
     */
    async batchUploadImages(
        images: Array<{ data: string, name: string }>,
        folderPath: string
    ): Promise<string[]> {
        const uploadPromises = images.map(image =>
            this.uploadImage(image.data, folderPath, image.name)
        );

        const results = await Promise.all(uploadPromises);
        return results.filter((path): path is string => path !== null);
    }

    /**
     * Get a signed URL for an image in S3
     */
    async getImageUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
        try {
            if (!key) return null;

            const s3 = getS3Client();

            // Create the command for getting the object
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key
            });

            // Get signed URL
            const signedUrl = await getSignedUrl(s3, command, {
                expiresIn,
                // Add required AWS Signature Version 4 parameters
                signableHeaders: new Set(['host']),
                forcePathStyle: true // Use path-style URL format
            });

            return signedUrl;
        } catch (error) {
            console.error('Error getting signed URL:', error);
            return null;
        }
    }
    /**
     * List folders (prefixes) in a path
     */
    async listFolders(prefix = ''): Promise<string[]> {
        try {
            const s3 = getS3Client();

            const command = new ListObjectsV2Command({
                Bucket: this.bucketName,
                Delimiter: '/',
                Prefix: prefix
            });

            const response = await s3.send(command);

            // Extract common prefixes (folders)
            const folders = (response.CommonPrefixes || [])
                .map(prefix => prefix.Prefix || '')
                .filter(prefixPath => prefixPath !== prefix);

            return folders;
        } catch (error) {
            console.error('Error listing folders:', error);
            return [];
        }
    }

    /**
     * List images in a folder (including subfolders)
     */
    async listImages(prefix = ''): Promise<{key: string, lastModified: Date | null, folder: string}[]> {
        try {
            const s3 = getS3Client();

            const command = new ListObjectsV2Command({
                Bucket: this.bucketName,
                Prefix: prefix,
                MaxKeys: 1000
            });

            const response = await s3.send(command);

            // Extract objects (ignoring folders)
            const images = (response.Contents || [])
                .filter(item => {
                    const key = item.Key || '';
                    // Exclude "folders" and non-image files
                    return !key.endsWith('/') &&
                        (key.endsWith('.jpg') || key.endsWith('.jpeg') ||
                            key.endsWith('.png') || key.endsWith('.gif'));
                })
                .map(item => {
                    const key = item.Key || '';

                    // Extract folder path from the key
                    let folder = '';
                    const lastSlashIndex = key.lastIndexOf('/');
                    if (lastSlashIndex !== -1) {
                        folder = key.substring(0, lastSlashIndex);
                    }

                    return {
                        key,
                        folder,
                        lastModified: item.LastModified || null
                    };
                });

            return images;
        } catch (error) {
            console.error('Error listing images:', error);
            return [];
        }
    }

    /**
     * Get all images recursively from a folder and its subfolders
     */
    async listAllImagesRecursively(prefix = ''): Promise<{key: string, lastModified: Date | null, folder: string, externalId: string}[]> {
        try {
            const s3 = getS3Client();

            // Use continuation token for listing more than 1000 objects
            let allImages: {key: string, lastModified: Date | null, folder: string, externalId: string}[] = [];
            let continuationToken: string | undefined = undefined;

            do {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const command: any = new ListObjectsV2Command({
                    Bucket: this.bucketName,
                    Prefix: prefix,
                    MaxKeys: 1000,
                    ContinuationToken: continuationToken
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const response: any = await s3.send(command);

                // Process this batch of images
                const images = (response.Contents || [])
                    .filter((item: { Key: string; }) => {
                        const key = item.Key || '';
                        // Exclude "folders" and non-image files
                        return !key.endsWith('/') &&
                            (key.endsWith('.jpg') || key.endsWith('.jpeg') ||
                                key.endsWith('.png') || key.endsWith('.gif'));
                    })
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((item: { Key: string; LastModified: any; }) => {
                        const key = item.Key || '';

                        // Extract folder path from the key
                        let folder = '';
                        const lastSlashIndex = key.lastIndexOf('/');
                        if (lastSlashIndex !== -1) {
                            folder = key.substring(0, lastSlashIndex);
                        }

                        // Convert S3 path to external ID format
                        const externalId = convertS3PathToExternalId(key);

                        return {
                            key,
                            folder,
                            lastModified: item.LastModified || null,
                            externalId
                        };
                    });

                allImages = [...allImages, ...images];

                // Check if there are more images to fetch
                continuationToken = response.NextContinuationToken;

            } while (continuationToken);

            return allImages;
        } catch (error) {
            console.error('Error listing all images recursively:', error);
            return [];
        }
    }

    /**
     * Get image count by subfolder
     */
    async getImageCountBySubfolder(prefix = ''): Promise<Record<string, number>> {
        try {
            const images = await this.listAllImagesRecursively(prefix);
            const folderCounts: Record<string, number> = {};

            // Count images in each folder
            images.forEach(image => {
                if (!folderCounts[image.folder]) {
                    folderCounts[image.folder] = 0;
                }
                folderCounts[image.folder]++;
            });

            return folderCounts;
        } catch (error) {
            console.error('Error getting image count by subfolder:', error);
            return {};
        }
    }

    /**
     * Check if a folder exists
     */
    async folderExists(folderPath: string): Promise<boolean> {
        try {
            const s3 = getS3Client();

            // Ensure folder path ends with "/"
            const path = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

            const command = new ListObjectsV2Command({
                Bucket: this.bucketName,
                Prefix: path,
                MaxKeys: 1
            });

            const response = await s3.send(command);

            return (response.Contents?.length || 0) > 0;
        } catch (error) {
            console.error('Error checking if folder exists:', error);
            return false;
        }
    }

    /**
     * Create a folder in S3
     */
    async createFolder(folderPath: string): Promise<boolean> {
        try {
            const s3 = getS3Client();

            // Ensure folder path ends with "/"
            const path = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: path,
                Body: '' // Empty body for folder placeholder
            });

            await s3.send(command);
            return true;
        } catch (error) {
            console.error('Error creating folder:', error);
            return false;
        }
    }

    /**
     * Create a folder structure (including nested folders)
     */
    async createFolderStructure(folderPath: string): Promise<boolean> {
        // Split the path and create each segment
        const segments = folderPath.split('/').filter(Boolean);
        let currentPath = '';

        for (const segment of segments) {
            currentPath += segment + '/';
            const created = await this.createFolder(currentPath);
            if (!created) return false;
        }

        return true;
    }

    /**
     * Delete an object from S3
     */
    async deleteObject(key: string): Promise<boolean> {
        try {
            const s3 = getS3Client();

            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key
            });

            await s3.send(command);
            return true;
        } catch (error) {
            console.error('Error deleting object:', error);
            return false;
        }
    }

    /**
     * Get all subfolders within a folder recursively
     */
    async getAllSubfolders(prefix = ''): Promise<string[]> {
        try {
            const s3 = getS3Client();
            let result: string[] = [];

            // Get immediate subfolders
            const command = new ListObjectsV2Command({
                Bucket: this.bucketName,
                Delimiter: '/',
                Prefix: prefix
            });

            const response = await s3.send(command);

            // Extract common prefixes (immediate subfolders)
            const subfolders = (response.CommonPrefixes || [])
                .map(prefix => prefix.Prefix || '')
                .filter(prefixPath => prefixPath !== prefix);

            // Add these subfolders to result
            result = [...result, ...subfolders];

            // Recursively get subfolders for each subfolder
            for (const subfolder of subfolders) {
                const childSubfolders = await this.getAllSubfolders(subfolder);
                result = [...result, ...childSubfolders];
            }

            return result;
        } catch (error) {
            console.error('Error getting all subfolders:', error);
            return [];
        }
    }

    /**
     * Get folder hierarchy information with image counts
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getFolderHierarchyWithImageCounts(prefix = ''): Promise<any> {
        try {
            // Get all subfolders
            const allFolders = await this.getAllSubfolders(prefix);

            // Add the current folder to the list
            const foldersToProcess = [prefix, ...allFolders];

            // Get image counts for each folder
            const folderCounts: Record<string, number> = {};

            for (const folder of foldersToProcess) {
                const images = await this.listImages(folder);
                folderCounts[folder] = images.length;
            }

            // Build folder hierarchy
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hierarchy: any = {};

            foldersToProcess.forEach(folder => {
                const parts = folder.split('/').filter(Boolean);

                let currentLevel = hierarchy;
                let currentPath = '';

                parts.forEach((part) => {
                    currentPath = currentPath ? `${currentPath}/${part}` : part;

                    if (!currentLevel[part]) {
                        currentLevel[part] = {
                            _path: currentPath,
                            _imageCount: folderCounts[`${currentPath}/`] || 0
                        };
                    }

                    currentLevel = currentLevel[part];
                });
            });

            return hierarchy;
        } catch (error) {
            console.error('Error getting folder hierarchy with image counts:', error);
            return {};
        }
    }
}

// Export a singleton instance
export const s3Service = new S3Service();