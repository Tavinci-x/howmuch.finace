# Debugging Steps

## If you see a blank page:

1. **Check Terminal Output**
   - Look for any red error messages
   - Share the full terminal output

2. **Check Browser Console**
   - Press F12 or right-click → Inspect
   - Go to Console tab
   - Look for red errors
   - Share any errors you see

3. **Try Hard Refresh**
   - Mac: Cmd + Shift + R
   - Windows: Ctrl + Shift + R

4. **Check Network Tab**
   - In browser DevTools, go to Network tab
   - Refresh the page
   - Check if any files are failing to load (red)

5. **Restart Dev Server**
   ```bash
   # Stop server (Ctrl+C)
   # Then run:
   rm -rf .next
   npm run dev
   ```
