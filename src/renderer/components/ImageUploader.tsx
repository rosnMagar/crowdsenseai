import React, { useState, useRef } from 'react';
import { uploadImageFile, uploadImageMetadata } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { LocationData } from '../types';

interface ImageUploaderProps {
  onClose: () => void;
  onSuccess: () => void;
  currentLocation: LocationData | null;
}

export default function ImageUploader({ onClose, onSuccess, currentLocation }: ImageUploaderProps) {
  const { theme } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an image to upload.');
      return;
    }
    
    // We fetch the latest location from electronAPI if we aren't getting continuous updates
    let lat = currentLocation?.latitude;
    let lon = currentLocation?.longitude;
    
    if (lat === undefined || lon === undefined) {
      try {
        if (window.electronAPI?.getLocation) {
          const loc = await window.electronAPI.getLocation();
          lat = loc.latitude;
          lon = loc.longitude;
        } else {
          throw new Error('GPS Offline');
        }
      } catch (err) {
        setError('Could not verify your exact GPS location. Cannot geotag the image without coordinates.');
        return;
      }
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. Generate unique filename
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filename = `photo_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // 2. Upload the raw image
      const publicUrl = await uploadImageFile(file, filename);
      if (!publicUrl) {
        throw new Error('Image storage upload failed.');
      }
      
      // 3. Save the metadata with coordinates
      const success = await uploadImageMetadata({
        image_url: publicUrl,
        description: description,
        latitude: lat,
        longitude: lon,
      });

      if (!success) {
        throw new Error('Failed to associate image with GPS coordinates.');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const containerClass = theme === 'dark' 
    ? 'bg-ink-black/95 border border-air-force-blue/20 text-light-beige' 
    : 'bg-cornsilk/95 border border-tea-green/20 text-ink-black';
    
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${containerClass}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-headline font-bold">Capture Location</h2>
          <button 
            onClick={onClose} 
            className="text-air-force-blue/60 hover:text-red-500 transition-colors"
            disabled={isUploading}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">
              Upload Image
            </label>
            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                file 
                  ? 'border-teal-500 bg-teal-500/10' 
                  : 'border-air-force-blue/30 hover:border-teal-500/50 hover:bg-air-force-blue/5'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-4xl text-teal-400 mb-2">check_circle</span>
                  <span className="text-sm font-medium truncate w-full px-4">{file.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center opacity-70">
                  <span className="material-symbols-outlined text-4xl mb-2">add_photo_alternate</span>
                  <span className="text-sm font-medium">Click to browse or take photo</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">
              Description / Accessibility Features
            </label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g., Wheelchair ramp available at the north entrance."
              className={`w-full p-3 rounded-lg border focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all resize-none h-24 ${
                theme === 'dark' 
                  ? 'bg-dark-teal/20 border-air-force-blue/20 placeholder-air-force-blue/50' 
                  : 'bg-white border-tea-green/50 placeholder-ink-black/30'
              }`}
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="material-symbols-outlined text-teal-500 text-sm">location_on</span>
            <span className="text-xs font-medium opacity-80">
              Image will be geotagged at your current GPS reading.
            </span>
          </div>

          <button
            type="submit"
            disabled={isUploading || !file}
            className={`w-full py-3 rounded-xl font-bold tracking-wide transition-all ${
              isUploading || !file
                ? 'bg-air-force-blue/20 text-air-force-blue/50 cursor-not-allowed'
                : 'bg-teal-500 hover:bg-teal-400 text-white shadow-lg hover:shadow-teal-500/25'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Save Geotagged Image'}
          </button>
        </form>
      </div>
    </div>
  );
}
