# Transcription Troubleshooting Guide

## Common Issues and Solutions

### 1. "Recording too short" Error
- **Cause**: Audio file is less than 1KB (usually less than 2-3 seconds)
- **Solution**: Record for at least 3-5 seconds and speak clearly

### 2. "Audio format not supported" Error
- **Cause**: Browser produces audio in unsupported format
- **Solution**: Try different browser (Chrome recommended) or use Text Answer mode

### 3. "Network error" Issues
- **Cause**: Internet connection problems or AssemblyAI service issues
- **Solution**: Check internet connection, wait a moment, and try again

### 4. "Microphone access denied" Error
- **Cause**: Browser permissions not granted
- **Solution**: 
  1. Click the microphone icon in browser address bar
  2. Allow microphone access
  3. Refresh the page and try again

### 5. "Transcription timeout" Error
- **Cause**: Audio file too long or AssemblyAI service busy
- **Solution**: 
  1. Keep recordings under 1-2 minutes
  2. Try again in a few moments
  3. Use Text Answer mode as alternative

## Browser Compatibility
- ✅ **Chrome**: Best support (recommended)
- ✅ **Edge**: Good support
- ✅ **Safari**: Basic support (may have limitations)
- ❌ **Firefox**: Limited MediaRecorder support
- ❌ **Mobile browsers**: May have restrictions

## Testing Steps
1. Grant microphone permissions
2. Start recording (should see recording indicator)
3. Speak clearly for 5-10 seconds
4. Stop recording
5. Wait for transcription (usually 5-15 seconds)

## Debug Information
Check browser console (F12) for detailed error messages and logs.
