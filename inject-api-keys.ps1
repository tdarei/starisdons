# PowerShell script to inject API keys from GitLab CI/CD variables into config files
# This runs during the GitLab CI/CD build process

Write-Host "Injecting API keys from GitLab CI/CD variables..."

# Get the public directory path
$publicDir = "public"
if (-not (Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir -Force | Out-Null
}

# 1. Inject Stripe Public Key
if ($env:STRIPE_PUBLIC_KEY) {
    Write-Host "Injecting STRIPE_PUBLIC_KEY..."
    $stripeConfigPath = Join-Path $publicDir "stripe-config.js"
    
    if (Test-Path "stripe-config.js") {
        Copy-Item "stripe-config.js" $stripeConfigPath -Force
        
        # Replace placeholder with actual key
        $stripeConfig = Get-Content $stripeConfigPath -Raw
        $stripeReplacement = "const STRIPE_PUBLIC_KEY = '" + $env:STRIPE_PUBLIC_KEY + "';"
        $stripeConfig = $stripeConfig -replace "const STRIPE_PUBLIC_KEY = .*?;", $stripeReplacement
        $stripeWindowReplacement = "'" + $env:STRIPE_PUBLIC_KEY + "' ||"
        $stripeConfig = $stripeConfig -replace "window\.STRIPE_PUBLIC_KEY \|\|", $stripeWindowReplacement
        
        Set-Content -Path $stripeConfigPath -Value $stripeConfig -NoNewline
        Write-Host "Stripe key injected successfully"
    } else {
        Write-Host "Warning: stripe-config.js not found, creating new one..."
        $stripeKey = $env:STRIPE_PUBLIC_KEY
        
        # Use here-string with placeholders to avoid PowerShell parsing issues
        $stripeConfigContent = @'
/** 
 * Stripe Payment Configuration
 * Injected from GitLab CI/CD variable STRIPE_PUBLIC_KEY during build
 */

const STRIPE_PUBLIC_KEY = 'PLACEHOLDER_STRIPE_KEY';

if (typeof window !== 'undefined') {
    window.STRIPE_PUBLIC_KEY = STRIPE_PUBLIC_KEY;
    if (STRIPE_PUBLIC_KEY) {
        console.log('Stripe public key configured');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { STRIPE_PUBLIC_KEY };
}
'@
        
        # Replace placeholder with actual key
        $stripeConfigContent = $stripeConfigContent -replace 'PLACEHOLDER_STRIPE_KEY', $stripeKey
        
        Set-Content -Path $stripeConfigPath -Value $stripeConfigContent
        Write-Host "Created stripe-config.js with injected key"
    }
} else {
    Write-Host "Warning: STRIPE_PUBLIC_KEY not found in environment variables"
}

# 2. Inject Gemini API Key (if needed)
if ($env:GEMINI_API_KEY) {
    Write-Host "Injecting GEMINI_API_KEY..."
    $geminiConfigPath = Join-Path $publicDir "gemini-config.js"
    
    if (Test-Path "gemini-config.js") {
        Copy-Item "gemini-config.js" $geminiConfigPath -Force
        
        # Replace placeholder with actual key
        $geminiConfig = Get-Content $geminiConfigPath -Raw
        $replacement = "const GEMINI_API_KEY = '" + $env:GEMINI_API_KEY + "';"
        # Use escaped regex pattern to avoid quote issues
        $pattern = "const GEMINI_API_KEY = '.*?';"
        $geminiConfig = $geminiConfig -replace $pattern, $replacement
        $geminiConfig = $geminiConfig -replace "YOUR_GEMINI_API_KEY_HERE", $env:GEMINI_API_KEY
        
        Set-Content -Path $geminiConfigPath -Value $geminiConfig -NoNewline
        Write-Host "Gemini key injected successfully"
    } else {
        Write-Host "Warning: gemini-config.js not found, creating new one..."
        $geminiApiKey = $env:GEMINI_API_KEY
        
        # Use here-string with placeholders to avoid PowerShell parsing issues
        $geminiConfigContent = @'
/**
 * Gemini API Configuration
 * Injected from GitLab CI/CD variable GEMINI_API_KEY during build
 * 
 * The free tier includes unlimited requests on the live model (gemini-2.5-flash-live)
 * Get your API key from: https://aistudio.google.com/app/apikey
 */

const GEMINI_API_KEY = 'PLACEHOLDER_GEMINI_API_KEY';

if (typeof window !== 'undefined') {
    window.GEMINI_API_KEY = GEMINI_API_KEY;
    if (GEMINI_API_KEY) {
        console.log('Gemini API key configured');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GEMINI_API_KEY };
}
'@
        
        # Replace placeholder with actual key
        $geminiConfigContent = $geminiConfigContent -replace 'PLACEHOLDER_GEMINI_API_KEY', $geminiApiKey
        
        Set-Content -Path $geminiConfigPath -Value $geminiConfigContent
        Write-Host "Created gemini-config.js with injected key"
    }
} else {
    Write-Host "Warning: GEMINI_API_KEY not found in environment variables"
}

# 3. Inject Pinata API Keys (if needed)
if ($env:PINATA_API_KEY -and $env:PINATA_SECRET_KEY) {
    Write-Host "Injecting PINATA_API_KEY and PINATA_SECRET_KEY..."
    $pinataConfigPath = Join-Path $publicDir "pinata-config.js"
    
    if (Test-Path "pinata-config.js") {
        Copy-Item "pinata-config.js" $pinataConfigPath -Force
        
        # Replace placeholders with actual keys
        $pinataConfig = Get-Content $pinataConfigPath -Raw
        $apiKeyReplacement = "const PINATA_API_KEY = '" + $env:PINATA_API_KEY + "';"
        $secretKeyReplacement = "const PINATA_SECRET_KEY = '" + $env:PINATA_SECRET_KEY + "';"
        
        $pinataConfig = $pinataConfig -replace "const PINATA_API_KEY = '.*?';", $apiKeyReplacement
        $pinataConfig = $pinataConfig -replace "const PINATA_SECRET_KEY = '.*?';", $secretKeyReplacement
        $pinataConfig = $pinataConfig -replace "YOUR_PINATA_API_KEY_HERE", $env:PINATA_API_KEY
        $pinataConfig = $pinataConfig -replace "YOUR_PINATA_SECRET_KEY_HERE", $env:PINATA_SECRET_KEY
        
        Set-Content -Path $pinataConfigPath -Value $pinataConfig -NoNewline
        Write-Host "Pinata keys injected successfully"
    } else {
        Write-Host "Warning: pinata-config.js not found, creating new one..."
        $pinataApiKey = $env:PINATA_API_KEY
        $pinataSecretKey = $env:PINATA_SECRET_KEY
        
        # Use here-string with placeholders to avoid PowerShell parsing issues
        $pinataConfigContent = @'
/**
 * Pinata IPFS Configuration
 * Injected from GitLab CI/CD variables PINATA_API_KEY and PINATA_SECRET_KEY during build
 */

const PINATA_API_KEY = 'PLACEHOLDER_PINATA_API_KEY';
const PINATA_SECRET_KEY = 'PLACEHOLDER_PINATA_SECRET_KEY';

if (typeof window !== 'undefined') {
    window.PINATA_API_KEY = PINATA_API_KEY;
    window.PINATA_SECRET_KEY = PINATA_SECRET_KEY;
    if (PINATA_API_KEY && PINATA_SECRET_KEY) {
        console.log('Pinata API keys configured');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PINATA_API_KEY, PINATA_SECRET_KEY };
}
'@
        
        # Replace placeholders with actual keys
        $pinataConfigContent = $pinataConfigContent -replace 'PLACEHOLDER_PINATA_API_KEY', $pinataApiKey
        $pinataConfigContent = $pinataConfigContent -replace 'PLACEHOLDER_PINATA_SECRET_KEY', $pinataSecretKey
        
        Set-Content -Path $pinataConfigPath -Value $pinataConfigContent
        Write-Host "Created pinata-config.js with injected keys"
    }
} else {
    Write-Host "Warning: PINATA_API_KEY or PINATA_SECRET_KEY not found in environment variables"
}

Write-Host "API key injection complete"

