# 🚀 START BACKEND SERVER NOW

## ⚠️ Current Issue

**Error:** "Connection closed before setup"  
**Cause:** Backend server is NOT running on port 3001

## ✅ Quick Fix (3 Steps)

### Step 1: Open a NEW Terminal Window
- Don't use the current terminal (it's busy)
- Open a **NEW** Command Prompt or PowerShell window

### Step 2: Navigate to Backend Folder
```bash
cd C:\Users\adyba\adriano-to-the-star-clean\backend
```

### Step 3: Start the Server

**Option A: Use Batch File (Easiest - No PowerShell Issues)**
```bash
.\start-server.bat
```

**Option B: Use Command Prompt (Not PowerShell)**
```bash
npm run start-stellar-ai
```

**Option C: Use PowerShell (If you bypass execution policy)**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
npm run start-stellar-ai
```

## ✅ Verify It's Working

After starting, you should see:
```
🌟 ═══════════════════════════════════════════
   Stellar AI Server running on port 3001
🌟 ═══════════════════════════════════════════
```

Then test: http://localhost:3001/health

Should show:
```json
{
  "status": "healthy"
}
```

## 🎯 Then Test Gemini Live

1. **Keep the backend terminal open** (server must stay running!)
2. Go to: http://localhost:8000/stellar-ai.html
3. Select "Gemini 2.5 Flash Live Preview 🎤"
4. Send a message - it should work! ✅

## 🔧 If It Still Doesn't Work

### Check 1: Port 3001 Already in Use?
```powershell
Get-NetTCPConnection -LocalPort 3001
```
If something is using it, stop that process.

### Check 2: API Key in .env?
```bash
cd backend
type .env
```
Should show: `GEMINI_API_KEY=AIzaSyB3qcopiW3k4BAVWNVVJ3OKLiEpPVgP-Vw`

### Check 3: Dependencies Installed?
```bash
cd backend
npm install
```

---

**IMPORTANT:** The backend server MUST be running for Gemini Live to work!

