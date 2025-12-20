# Update GEMINI_API_KEY Variable

## ⚠️ Action Required

Your `GEMINI_API_KEY` variable has the **wrong value**. 

### Current (Wrong):
```
AIzaSyAzzAe-LDwhHekh8hiBBwyrLJQPsKXFtPw
```

### Should Be (Correct):
```
AIzaSyDq35JZhPqhGrROYwiJWyESwblck7FDBf8
```

## 🔧 How to Fix

1. **In the Edit Variable screen for `GEMINI_API_KEY`:**

2. **Replace the Value field** with:
   ```
   AIzaSyDq35JZhPqhGrROYwiJWyESwblck7FDBf8
   ```

3. **Keep these settings:**
   - ✅ **Type**: Variable
   - ✅ **Visibility**: Masked (recommended for API keys)
   - ✅ **Protect variable**: (your choice)
   - ❌ **Expand variable reference**: Unchecked

4. **Click "Update variable"**

## ✅ Verification

After updating, the variable should:
- Show `•••••` in the variables list (masked)
- Work correctly with `gemini-2.5-flash-live` for unlimited requests
- Be used by your Cloud Function deployments

## 📝 Note

The `USE_GEMINI_LIVE` variable is already correct (`true`) - no changes needed there!

