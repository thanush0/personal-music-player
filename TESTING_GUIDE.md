# Testing Guide - Personal Music Player

This guide will help you test the Personal Music Player after setup.

## 🧪 Pre-Testing Checklist

Before testing, ensure:
- [ ] Backend is running on `http://localhost:8000`
- [ ] Frontend is running on `http://localhost:3000`
- [ ] Music folder contains at least a few test files
- [ ] Backend has completed the initial music scan

## 🎵 Test Music Files

For testing, you can use sample music files or your own collection. Ensure you have:
- At least 5-10 songs from different artists
- Mix of different formats (MP3, FLAC, etc.)
- Files with proper ID3 tags (artist, album, title)
- At least one album with multiple tracks

## ✅ Testing Checklist

### 1. Backend API Testing

Open `http://localhost:8000/docs` in your browser.

#### Test Endpoints:

**Library Statistics:**
```
GET /admin/stats
```
Expected: Returns count of tracks, albums, artists

**List Tracks:**
```
GET /tracks?limit=10
```
Expected: Returns array of 10 tracks with metadata

**Get Specific Track:**
```
GET /tracks/{track_id}
```
Expected: Returns track details with album info

**Stream Audio:**
```
GET /tracks/{track_id}/stream
```
Expected: Audio file streams (can test in browser)

**Search:**
```
GET /search?q=test
```
Expected: Returns tracks, albums, artists matching query

**Albums:**
```
GET /albums
```
Expected: Returns list of albums

**Artists:**
```
GET /artists
```
Expected: Returns list of artists

### 2. Frontend Testing

#### Home Page (/)
- [ ] Page loads without errors
- [ ] Check browser console for errors
- [ ] Verify no Spotify authentication prompts

#### Library View (Left Sidebar)
- [ ] Click library icon
- [ ] Should see "Your Library" with options
- [ ] Can switch between different views

#### Browse Music
- [ ] Navigate to different sections
- [ ] Albums display with cover art
- [ ] Artists display in grid
- [ ] Tracks show with metadata

#### Search Functionality
- [ ] Click search icon or go to `/search`
- [ ] Type a search query
- [ ] Results appear for tracks, albums, artists
- [ ] Can filter by type (tracks, albums, artists)
- [ ] Click on search result navigates correctly

#### Playback Testing

**Play a Single Track:**
1. Click on any track
2. Playback should start immediately
3. Check:
   - [ ] Audio plays
   - [ ] Progress bar moves
   - [ ] Time counter updates
   - [ ] Album art displays in player bar
   - [ ] Track info shows correctly

**Playback Controls:**
- [ ] **Play/Pause** - Space bar or button works
- [ ] **Next Track** - Skips to next song
- [ ] **Previous Track** - Goes to previous song (or restarts if >3s)
- [ ] **Seek** - Drag progress bar to different position
- [ ] **Volume** - Adjust volume slider (0-100%)

**Queue Management:**
1. Play an album
2. Open queue (click queue icon)
3. Check:
   - [ ] Current track highlighted
   - [ ] Upcoming tracks listed
   - [ ] Can see track order

**Shuffle & Repeat:**
- [ ] **Shuffle** - Click shuffle icon, tracks play randomly
- [ ] **Repeat Context** - Repeats the current playlist/album
- [ ] **Repeat Track** - Repeats the current track

#### Album View
1. Click on an album
2. Check:
   - [ ] Album art displays large
   - [ ] Track list shows correctly
   - [ ] Track numbers in order
   - [ ] Play button works
   - [ ] Can play individual tracks
   - [ ] Can save album to library

#### Artist View
1. Click on an artist
2. Check:
   - [ ] Artist name displays
   - [ ] Top tracks section
   - [ ] Albums by artist
   - [ ] Can play artist's tracks

#### Playlist Management

**Create Playlist:**
1. Click "Create Playlist" button
2. Enter name and description
3. Check:
   - [ ] Playlist appears in library
   - [ ] Can open playlist

**Add to Playlist:**
1. Right-click (or click menu) on a track
2. Select "Add to Playlist"
3. Choose playlist
4. Check:
   - [ ] Track added to playlist
   - [ ] Shows in playlist view

**Edit Playlist:**
1. Open a playlist
2. Click edit/options
3. Check:
   - [ ] Can rename playlist
   - [ ] Can change description
   - [ ] Can delete playlist

**Remove from Playlist:**
1. In playlist view
2. Right-click a track
3. Select "Remove from playlist"
4. Check:
   - [ ] Track removed from playlist
   - [ ] Still exists in library

#### Library Management

**Like/Save Tracks:**
1. Click heart icon on a track
2. Check:
   - [ ] Heart fills/changes color
   - [ ] Track appears in "Liked Songs"

**Unlike Tracks:**
1. Click heart icon again
2. Check:
   - [ ] Heart empties
   - [ ] Track removed from "Liked Songs"

**Save Albums:**
1. Open album page
2. Click save/heart icon
3. Check:
   - [ ] Album saved to library
   - [ ] Appears in saved albums

#### Liked Songs Page
1. Navigate to "Liked Songs"
2. Check:
   - [ ] Shows all liked tracks
   - [ ] Can play all liked songs
   - [ ] Can remove tracks (unlike)
   - [ ] Play button starts playlist

### 3. Mobile/Responsive Testing

**Resize browser window or use mobile device:**
- [ ] Layout adapts to mobile size
- [ ] Navigation menu collapses
- [ ] Player bar visible at bottom
- [ ] Can access all features
- [ ] Touch controls work

### 4. Error Handling

**Test Error Scenarios:**

**No Music Files:**
1. Empty music folder, restart backend
2. Check: Graceful error handling

**Invalid Track:**
1. Try to play non-existent track ID
2. Check: Error message displayed

**Backend Down:**
1. Stop backend server
2. Try to use app
3. Check: Connection error shown

**Unsupported Format:**
1. Add unsupported file to music folder
2. Rescan
3. Check: File ignored or error handled

### 5. Performance Testing

**Large Library:**
- [ ] Load time reasonable with 1000+ tracks
- [ ] Search performs quickly
- [ ] Scrolling smooth with many items
- [ ] Album art loads efficiently

**Memory Usage:**
1. Play multiple tracks
2. Navigate between pages
3. Check browser memory usage (Dev Tools)
4. Should not grow excessively

### 6. Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on Mac)

### 7. Continuous Playback

**Test Scenarios:**
1. **Play full album:**
   - [ ] Tracks play in order
   - [ ] Auto-advances to next track
   - [ ] Stops at end (or repeats if enabled)

2. **Navigate while playing:**
   - [ ] Music continues when changing pages
   - [ ] Player bar updates correctly
   - [ ] Current track info persists

3. **Reload page:**
   - [ ] Playback stops (expected)
   - [ ] Previous state not preserved (normal for now)

## 🐛 Common Issues & Solutions

### Backend Issues

**"No module named 'fastapi'"**
- Solution: `pip install -r requirements.txt`

**"Port 8000 already in use"**
- Solution: Change port in `.env` or kill process using port

**"Permission denied" reading music files**
- Solution: Check file permissions on music folder

**Album art not showing**
- Check: Files have embedded artwork
- Try: Different files with known artwork

### Frontend Issues

**"Network Error"**
- Check: Backend is running
- Check: `REACT_APP_API_URL` in `.env`
- Check: CORS not blocking requests

**Playback doesn't start**
- Check: Browser console for errors
- Check: Audio file is accessible
- Try: Different browser

**No tracks appear**
- Check: Backend has scanned music
- Check: GET `/admin/stats` returns counts > 0
- Check: Music folder path is correct

## 📊 Performance Benchmarks

Expected performance:
- **Scan time:** ~1-2 seconds per 100 tracks
- **Search latency:** < 100ms for 1000 tracks
- **Page load:** < 2 seconds
- **Audio start:** < 1 second (depends on file size)

## 🎯 Success Criteria

Your local music player is working correctly if:
- ✅ All music files are scanned and visible
- ✅ Search returns accurate results
- ✅ Audio playback works smoothly
- ✅ Playback controls respond correctly
- ✅ Playlists can be created and managed
- ✅ Library (likes) functions properly
- ✅ Navigation is smooth and intuitive
- ✅ No console errors during normal use
- ✅ Mobile view works properly
- ✅ Album artwork displays correctly

## 🔄 Next Steps After Testing

Once testing is complete:
1. Report any bugs or issues
2. Customize the UI to your liking
3. Add more music to your library
4. Create playlists for different moods
5. Enjoy your music!

## 📝 Test Report Template

Use this template to report issues:

```
### Issue: [Brief description]

**Environment:**
- OS: [Windows/Mac/Linux]
- Browser: [Chrome/Firefox/Safari]
- Backend: [Running/Not running]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots/Logs:**
[If applicable]

**Console Errors:**
[Copy any errors from browser console]
```

---

Happy Testing! 🎵
