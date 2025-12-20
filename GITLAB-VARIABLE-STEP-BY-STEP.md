# GitLab CI/CD Variable Setup - Step by Step

## ❌ Common Mistake

**DON'T put `USE_GEMINI_LIVE=true` in the Key field!**

The Key field should **ONLY** contain the variable name, without any `=` or value.

## ✅ Correct Setup

### Step 1: Add USE_GEMINI_LIVE Variable

1. Go to your GitLab project
2. Navigate to **Settings** → **CI/CD** → **Variables**
3. Click **"Add variable"** button
4. Fill in the form:

   **Key field:**
   ```
   USE_GEMINI_LIVE
   ```
   (Just the name, no `=true`, no quotes, nothing else)

   **Value field:**
   ```
   true
   ```
   (Just the word "true", lowercase)

   **Type:**
   - Select: **Variable** (default)

   **Environments:**
   - Leave empty (applies to all environments)

   **Visibility:**
   - ✅ Select **"Visible"** (required - GitLab needs 8+ chars for masked, and "true" is only 4 chars)
   - ⚠️ Cannot mask this variable because "true" is too short (GitLab requires 8+ characters for masked variables)

   **Flags:**
   - ✅ **"Expand variable reference"** - Leave **UNCHECKED** (not needed for boolean)
   - **"Protect variable"** - Leave unchecked (unless you only want it on protected branches)

   **Description (optional):**
   ```
   Enable Gemini live models for unlimited RPM/RPD
   ```

5. Click **"Add variable"**

### Step 2: Add GEMINI_API_KEY Variable

1. Click **"Add variable"** again
2. Fill in the form:

   **Key field:**
   ```
   GEMINI_API_KEY
   ```
   (Just the name, no quotes, nothing else)

   **Value field:**
   ```
   AIzaSyDq35JZhPqhGrROYwiJWyESwblck7FDBf8
   ```
   (Your actual API key)

   **Type:**
   - Select: **Variable** (default)

   **Environments:**
   - Leave empty

   **Visibility:**
   - ✅ **MUST check "Masked"** (to hide in logs - very important!)

   **Flags:**
   - ✅ **"Expand variable reference"** - Leave **UNCHECKED**
   - **"Protect variable"** - Optional

   **Description (optional):**
   ```
   Google Gemini API key for AI-enhanced broadband price scraping
   ```

3. Click **"Add variable"**

## 📋 Summary

After setup, you should have **TWO separate variables**:

| Key | Value | Masked |
|-----|-------|--------|
| `USE_GEMINI_LIVE` | `true` | Optional |
| `GEMINI_API_KEY` | `AIzaSyDq35JZhPqhGrROYwiJWyESwblck7FDBf8` | ✅ Required |

## 🔍 Verification

After adding both variables:
- You should see **2 variables** in the list
- `USE_GEMINI_LIVE` should show value `true` (or `***` if masked)
- `GEMINI_API_KEY` should show `***` (masked)

## ⚠️ Important Notes

1. **Key = Variable Name** (no `=`, no value, just the name)
2. **Value = Variable Value** (the actual value)
3. GitLab will automatically combine them as `KEY=VALUE` when used in pipelines
4. In your code, access as: `os.getenv('USE_GEMINI_LIVE')` → returns `'true'`

## 🧪 Testing

After setting variables, the next pipeline run should:
- Read `USE_GEMINI_LIVE` → gets `'true'`
- Read `GEMINI_API_KEY` → gets your API key
- Enable live models automatically

