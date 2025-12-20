# GitLab CI/CD Variable Setup Guide

## Issue: "Variables value is invalid"

You're seeing this error because the **Key** and **Value** fields are swapped in the form.

## ✅ Correct Variable Setup

### Variable 1: USE_GEMINI_LIVE

**Form Fields:**
- **Key**: `USE_GEMINI_LIVE`
- **Value**: `true`
- **Type**: Variable
- **Environments**: (leave empty for all environments)
- **Visibility**: 
  - ✅ **Visible** (recommended - it's just a boolean)
  - OR Masked (if you prefer)
- **Flags**:
  - ✅ **Expand variable reference** (unchecked - not needed for boolean)
  - Protect variable (optional)
- **Description**: `Enable Gemini live models for unlimited RPM/RPD`

### Variable 2: GEMINI_API_KEY

**Form Fields:**
- **Key**: `GEMINI_API_KEY`
- **Value**: `AIzaSyDq35JZhPqhGrROYwiJWyESwblck7FDBf8`
- **Type**: Variable
- **Environments**: (leave empty for all environments)
- **Visibility**: 
  - ✅ **Masked** (HIGHLY RECOMMENDED - hides in logs)
  - OR Masked and hidden (most secure)
- **Flags**:
  - ✅ **Expand variable reference** (unchecked)
  - Protect variable (optional - only if you want it on protected branches only)
- **Description**: `Google Gemini API key for AI-enhanced broadband price scraping`

## ❌ What You Had (Incorrect)

- **Key**: `AIzaSyDq35JZhPqhGrROYwiJWyESwblck7FDBf8` ❌ (This is the API key, not a variable name)
- **Value**: `USE_GEMINI_LIVE=true` ❌ (This should be in the Key field)

## 📝 Step-by-Step Instructions

1. **Add USE_GEMINI_LIVE variable:**
   - Click "Add variable"
   - **Key**: Type `USE_GEMINI_LIVE`
   - **Value**: Type `true`
   - Check **Masked** (optional, but recommended)
   - Click "Add variable"

2. **Add GEMINI_API_KEY variable:**
   - Click "Add variable" again
   - **Key**: Type `GEMINI_API_KEY`
   - **Value**: Type `AIzaSyDq35JZhPqhGrROYwiJWyESwblck7FDBf8`
   - ✅ **MUST check Masked** (to hide in logs)
   - Click "Add variable"

## ✅ Verification

After adding both variables, you should see:
- `USE_GEMINI_LIVE` = `true` (or masked)
- `GEMINI_API_KEY` = `***` (masked)

## 🔍 Testing

The next pipeline run should:
1. Detect `USE_GEMINI_LIVE=true`
2. Attempt to use live models
3. Fall back to `gemini-2.5-flash` if live models fail

