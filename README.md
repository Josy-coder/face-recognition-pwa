I'll update the README to include comprehensive usage instructions for the application. Here's an expanded version that explains how to use the application:

# FaceRecog - Facial Recognition Application with AWS Rekognition

A progressive web application that leverages AWS Rekognition for face detection, comparison, and identification. This application allows users to capture or upload images, crop faces, and search for matches against collections in AWS Rekognition.

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Setup](#setup)
- [User Guide](#user-guide)
   - [Capturing a Face](#capturing-a-face)
   - [Cropping a Face](#cropping-a-face)
   - [Searching for Matches](#searching-for-matches)
   - [Viewing Results](#viewing-results)
   - [Search History](#search-history)
   - [Installing as PWA](#installing-as-pwa)
- [Admin Guide](#admin-guide)
   - [Managing Collections](#managing-collections)
   - [Adding Faces to Collections](#adding-faces-to-collections)
   - [Organizing Collections](#organizing-collections)
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

## User Guide

### Capturing a Face

1. **Access the app**: Open the application in your browser or PWA
2. **Start capture**: You'll be presented with the home screen featuring two options:
   - **Camera**: Activate your device's camera to take a photo
   - **Upload**: Select an existing image from your device
3. **Take or select photo**:
   - When using the camera, position the face within the circular guide and click "Take Photo"
   - When uploading, select an image file containing a face
4. **Automatic navigation**: Once a face is captured or uploaded, you'll be directed to the cropping page

### Cropping a Face

1. **Adjust crop area**: Use the circular cropping tool to focus on the face
   - Drag to reposition the crop area
   - Ensure the face is centered for best results
2. **Confirm crop**: Click the "Confirm" button when satisfied with the crop
3. **Cancel option**: Click "Cancel" to return to the capture screen and start over

### Searching for Matches

1. **Select folders**: After cropping, you'll see the search page with:
   - Your cropped face image
   - A folder selection interface
2. **Choose search scope**: Select one or more folders to search through
   - Folders correspond to AWS Rekognition collections
   - Select parent folders to include all subfolders
3. **Initiate search**: Click the "Search" button to begin face matching
4. **View progress**: A progress indicator shows the search status across selected folders

### Viewing Results

1. **Results display**: After searching, you'll see a results page with:
   - Your search image
   - The best match (if found)
   - Additional potential matches (if any)
2. **Match details**: For each match, you'll see:
   - The person's photo (if available)
   - Name and title information
   - Match confidence percentage
   - Color-coded confidence indicator
3. **Details tab**: View additional information about the matched person
   - Department, email, phone, etc.
   - Location information showing which folder/collection the match was found in
4. **No matches**: If no matches are found, you'll see a "No Matching Results" message with an option to try again

### Search History

1. **Access history**: Click "History" in the navigation bar to view past searches
2. **History items**: Each history item shows:
   - The search image you used
   - When the search was performed
   - The number of matches found
3. **View details**: Click on a history item to expand it and see match information
4. **Review results**: Click "View Results" to revisit the full results page for that search
5. **Delete entries**: Remove individual entries or clear the entire history

### Installing as PWA

1. **Installation prompt**: On compatible devices, you'll see an "Install App" banner
2. **Install process**: Click "Install App" and follow the device-specific prompts
3. **Standalone mode**: Once installed, the app will run in standalone mode with:
   - Full-screen experience
   - Offline capabilities
   - Local camera access

## Admin Guide

### Managing Collections

1. **Access admin panel**: Go to `/admin` in your browser
2. **Authentication**: Log in using the admin credentials from your environment variables
3. **View collections**: See a list of all AWS Rekognition collections
4. **Create collection**:
   - Enter a Collection ID (e.g., "employees-collection")
   - Optionally specify a folder path (e.g., "Employees")
   - Click "Create Collection"
5. **Delete collections**: Remove collections using the trash icon (use with caution - deletion is permanent)

### Adding Faces to Collections

1. **Select collection**: Click on a collection from the list
2. **Navigate to "Add Face" tab**: This tab provides face capture functionality
3. **External Image ID**: Enter a name or identifier for the person
   - Use simple alphanumeric identifiers (e.g., "JohnSmith")
   - This will help identify matches later
4. **Capture or upload**: Take a photo or upload an image containing a face
5. **Add to collection**: Click "Add Face to Collection" to index the face in AWS Rekognition
6. **Confirmation**: You'll receive confirmation that the face was added successfully

### Organizing Collections

1. **Collection structure**: Collections can be organized to match your folder structure
2. **Associate folders**: When creating collections, specify the folder path
3. **View associations**: The folder path appears in the collection details
4. **Modify mapping**: Update collection-to-folder mappings by creating a new collection with the same name

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
   - Create a mapping between face IDs and local image assets

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

