import {
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getS3Client } from '@/lib/aws-config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

class S3Service {
    private readonly bucketName = 'facerecog-app-storage';

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
    async getImageUrl(key: string, expiresIn = 3600): Promise<string | null> {
        try {
            const s3 = getS3Client();

            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key
            });

            return await getSignedUrl(s3, command, { expiresIn });
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
    async listImages(prefix = ''): Promise<{key: string, lastModified: Date | null}[]> {
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
                .map(item => ({
                    key: item.Key || '',
                    lastModified: item.LastModified || null
                }));

            return images;
        } catch (error) {
            console.error('Error listing images:', error);
            return [];
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
}

// Export a singleton instance
export const s3Service = new S3Service();