# FaceRecog - Facial Recognition Application with AWS Rekognition

A progressive web application that leverages AWS Rekognition for face detection, comparison, and identification. This application allows users to capture or upload images, crop faces, and search for matches against collections in AWS Rekognition.

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Setup](#setup)
- [Admin Usage](#admin-usage)
- [Known Issues and Solutions](#known-issues-and-solutions)
- [Collection to Folder Mapping](#collection-to-folder-mapping)
- [Extending the Application](#extending-the-application)

## Features

- **Face Capture**: Take photos using device camera or upload from storage
- **Face Cropping**: Adjust facial images before matching
- **Collection Management**: Admin interface for AWS Rekognition collections
- **Face Search**: Search for faces across multiple collections
- **PWA Support**: Install as a standalone application on supported devices
- **Offline Capabilities**: Basic functionality when offline
- **Folder Structure**: Organize collections in an intuitive folder hierarchy

## Architecture Overview

The application uses:

- **Next.js**: React framework for the frontend and API routes
- **AWS Rekognition**: Cloud-based facial recognition service
- **TailwindCSS & shadcn/ui**: For styling components
- **Zustand**: For state management
- **PWA**: Progressive Web App capabilities for installation and offline use

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file with the following variables:
   ```
   # AWS Configuration
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key

   # Admin Authentication
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-password
   ```

4. Generate PWA icons:
   ```
   npm run generate-pwa-icons
   ```

5. Run the development server:
   ```
   npm run dev
   ```

6. Build for production:
   ```
   npm run build
   npm start
   ```

## Admin Usage

1. Access the admin panel at `/admin`
2. Log in using the credentials from your environment variables
3. Create collections that correspond to your folder structure
4. Add faces to collections by capturing or uploading images
5. Provide identifiers for faces to make them searchable

## Known Issues and Solutions

### Issue: Matching Images Not Displaying

**Problem**: When matches are found, the correct match information appears but the actual face image isn't displayed.

**Cause**: AWS Rekognition doesn't store the actual images; it only stores face embeddings (vector representations) and metadata. The application needs to retrieve the original images from another source.

**Solutions**:

1. **Store Image References**:
   - When adding faces to collections, store the image URL or path as part of the metadata
   - Update the admin panel to allow uploading images to S3 and storing the URL in the ExternalImageId

2. **Implement S3 Integration**:
   ```javascript
   // Example code to add to the admin panel
   const uploadToS3 = async (imageFile) => {
     const s3 = new S3Client({ region: process.env.AWS_REGION });
     const key = `faces/${Date.now()}.jpg`;
     
     await s3.send(new PutObjectCommand({
       Bucket: 'your-bucket-name',
       Key: key,
       Body: imageFile,
       ContentType: 'image/jpeg'
     }));
     
     return `https://your-bucket-name.s3.amazonaws.com/${key}`;
   };
   ```

3. **Short-term Workaround**:
   - Use a predefined set of profile images as placeholders

### Issue: ExternalImageId Validation Error

**Problem**: AWS Rekognition has strict requirements for ExternalImageId, allowing only alphanumeric characters, underscores, hyphens, periods, and colons.

**Solution**:
- The application now properly sanitizes ExternalImageId inputs
- For complex metadata, use a simple ID in ExternalImageId and store detailed data separately

## Collection to Folder Mapping

The application maps AWS Rekognition collections to UI folders to create an intuitive organizational structure.

### How the Mapping Works

1. **Collection Creation**:
   - When an admin creates a collection, they can specify a corresponding folder path
   - This mapping is stored and used to organize search results

2. **Mapping Storage**:
   - Currently uses an in-memory mapping (COLLECTION_TO_FOLDER_MAP)
   - In production, this should be moved to a database

3. **Automatic Mapping**:
   - If no explicit mapping is provided, the system tries to infer a folder structure
   - Example: "engineering-collection" maps to "Employees/Engineering"

4. **Public Access**:
   - The `/api/collections?public=true` endpoint provides the mapping to the client
   - The search page uses this to convert selected folders to collection IDs

### Example Mapping Configuration:

```javascript
const COLLECTION_TO_FOLDER_MAP = {
  'employees-collection': 'Employees',
  'engineering-collection': 'Employees/Engineering',
  'marketing-collection': 'Employees/Marketing',
  'sales-collection': 'Employees/Sales',
  'customers-collection': 'Customers',
  'enterprise-collection': 'Customers/Enterprise',
  'smb-collection': 'Customers/SMB',
  'events-collection': 'Events',
  'events-2023-collection': 'Events/2023',
  'events-2024-collection': 'Events/2024',
  'visitors-collection': 'Visitors'
};
```

### Implementing a Database Solution

For production use, replace the in-memory mapping with a database solution:

```javascript
// Example using MongoDB
async function getCollectionFolder(collectionId) {
  const mapping = await db.collection('collection_mappings').findOne({ collectionId });
  return mapping ? mapping.folderPath : null;
}

async function setCollectionFolder(collectionId, folderPath) {
  await db.collection('collection_mappings').updateOne(
    { collectionId }, 
    { $set: { folderPath } },
    { upsert: true }
  );
}
```

## Extending the Application

### Adding User Authentication

Implement user authentication to control access to the application:

```javascript
// Example using NextAuth.js
import NextAuth from 'next-auth';
import Providers from 'next-auth/providers';

export default NextAuth({
  providers: [
    Providers.Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        // Validate credentials
        if (credentials.username === 'user' && credentials.password === 'password') {
          return { id: 1, name: 'User', email: 'user@example.com' };
        }
        return null;
      }
    })
  ],
  callbacks: {
    jwt: async (token, user) => {
      if (user) token.id = user.id;
      return token;
    },
    session: async (session, token) => {
      session.user.id = token.id;
      return session;
    }
  }
});
```

### Improving Image Storage

Use AWS S3 to store reference images for better match display:

1. Create an S3 bucket for face images
2. Update the admin panel to upload images to S3
3. Store the S3 URL as metadata associated with each face
4. Retrieve the image URL when displaying search results

### Enhanced Match Confidence Visualization

Add more detailed confidence metrics:

```javascript
function getConfidenceAnalysis(confidence) {
  return {
    level: confidence >= 90 ? 'Very High' : confidence >= 80 ? 'High' : confidence >= 70 ? 'Moderate' : 'Low',
    color: confidence >= 90 ? 'green' : confidence >= 80 ? 'blue' : confidence >= 70 ? 'orange' : 'red',
    falsePositiveRate: confidence >= 99 ? '< 0.1%' : confidence >= 95 ? '< 1%' : confidence >= 90 ? '< 5%' : '5-15%',
    reliability: confidence >= 95 ? 'Highly Reliable' : confidence >= 85 ? 'Reliable' : confidence >= 75 ? 'Moderately Reliable' : 'Use with Caution',
  };
}
```