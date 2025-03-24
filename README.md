# Face Recognition PWA

A progressive web app for facial recognition and matching, built with Next.js and Tailwind CSS.

## Features

- 📷 Take photos using device camera
- 🖼️ Upload images from device storage
- ✂️ Crop and adjust facial images
- 🔍 Search for facial matches across multiple folders
- 📊 View match results with confidence scores
- 📱 Responsive design for all devices
- 🌓 Light and dark mode support
- 📝 Search history tracking

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/face-recognition-pwa.git
   cd face-recognition-pwa
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000) in your browser**

## Project Structure

```
face-recognition-pwa/
├── public/                  # Static assets
│   ├── profile-1.jpg        # Sample profile images for testing
│   ├── profile-2.jpg
│   ├── profile-3.jpg
│   ├── profile-4.jpg
│   └── manifest.json        # PWA manifest
├── src/
│   ├── components/          # UI components
│   │   ├── capture/         # Image capture components
│   │   │   ├── CameraCapture.tsx
│   │   │   ├── FolderSelector.tsx
│   │   │   └── ImageCropper.tsx
│   │   ├── layout/          # Layout components
│   │   │   └── layout.tsx
│   │   └── ui/              # UI components
│   │       ├── mode-toggle.tsx
│   │       ├── loading-skeleton.tsx
│   │       └── ...
│   ├── pages/               # Next.js pages
│   │   ├── index.tsx        # Home page
│   │   ├── crop.tsx         # Image cropping page
│   │   ├── search.tsx       # Folder selection page
│   │   ├── results.tsx      # Results display page
│   │   └── history.tsx      # Search history page
│   ├── store/               # State management
│   │   └── search-store.ts
│   └── styles/              # Global styles
│       └── globals.css
└── package.json
```

## Technologies Used

- **Next.js**: React framework for building web applications
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: State management
- **React Image Crop**: Image cropping functionality
- **React Webcam**: Camera access and photo capture
- **Sonner**: Toast notifications
- **Date-fns**: Date utilities
- **next-themes**: Theme management for dark/light mode

## Workflow

1. **Capture**: Take a photo with your camera or upload an image
2. **Crop**: Adjust the facial area with the cropping tool
3. **Search**: Select folders to search for matching faces
4. **Results**: View matching results with confidence scores
5. **History**: Review previous searches and results

## Development Notes

- Create necessary profile images in the public folder (profile-1.jpg, profile-2.jpg, etc.) for testing
- The app uses localStorage for state persistence between pages to avoid URL size limitations
- For production use, the mock data should be replaced with actual API calls to a facial recognition service

