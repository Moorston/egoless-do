# PocketBase Collection Creator
# Creates required collections in a PocketBase instance via Admin API.
# Usage: .\create-collection.ps1 [-AdminEmail "admin@example.com"] [-AdminPassword "password"] [-PbUrl "http://localhost:8090"]
#
# If run without parameters, prompts for credentials.

param(
    [string]$AdminEmail,
    [string]$AdminPassword,
    [string]$PbUrl = "http://localhost:8090"
)

$ErrorActionPreference = "Stop"

# ── Prompt for credentials if not provided ──────────────────────────
if (-not $AdminEmail) { $AdminEmail = Read-Host "PB Admin Email" }
if (-not $AdminPassword) { $sec = Read-Host "PB Admin Password" -AsSecureString; $b = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec); $AdminPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($b) }

Write-Host "PocketBase Collection Creator" -ForegroundColor Cyan
Write-Host "  PB URL: $PbUrl" -ForegroundColor Gray

# ── Helper: invoke PB API ───────────────────────────────────────────
$Headers = @{ "Content-Type" = "application/json" }

function Invoke-PbApi {
    param([string]$Method, [string]$Path, $Body)
    $url = "$PbUrl$Path"
    try {
        $r = Invoke-WebRequest -Method $Method -Uri $url -Headers $Headers -Body ($Body | ConvertTo-Json -Depth 10) -SkipCertificateCheck
        return ($r.Content | ConvertFrom-Json)
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        try { $err = ($_.ErrorDetails.Message | ConvertFrom-Json) } catch { $err = $_.Exception.Message }
        Write-Warning "API $Method $Path → $statusCode : $err"
        return $null
    }
}

# ── Step 1: Authenticate ────────────────────────────────────────────
Write-Host "`nAuthenticating..." -ForegroundColor Yellow
$auth = Invoke-PbApi -Method POST -Path "/api/admins/auth-with-password" -Body @{ identity = $AdminEmail; password = $AdminPassword }
if (-not $auth -or -not $auth.token) {
    Write-Error "Authentication failed. Check credentials."
    exit 1
}
$Headers["Authorization"] = "Bearer $($auth.token)"
Write-Host "  Authenticated as: $AdminEmail" -ForegroundColor Green

# ── Step 2: Collection definitions ──────────────────────────────────
$COLLECTIONS = @(
    @{
        name = "custom_food_presets"
        type = "base"
        listRule = "@request.auth.id = user_id"
        viewRule = "@request.auth.id = user_id"
        createRule = "@request.auth.id = user_id"
        updateRule = "@request.auth.id = user_id"
        deleteRule = "@request.auth.id = user_id"
        schema = @(
            @{ name = "user_id";   type = "text";    required = $true;  system = $false },
            @{ name = "preset_id"; type = "text";    required = $true;  system = $false },
            @{ name = "data";      type = "json";    required = $false; system = $false },
            @{ name = "updated_at"; type = "autodate"; required = $false; system = $false }
        )
    }
)

# ── Step 3: Create collections ──────────────────────────────────────
foreach ($colDef in $COLLECTIONS) {
    Write-Host "`nCollection: $($colDef.name)" -ForegroundColor Yellow

    # Check if already exists
    $existing = Invoke-PbApi -Method GET -Path "/api/collections/$($colDef.name)"
    if ($existing -and $existing.id) {
        Write-Host "  Already exists (id: $($existing.id))" -ForegroundColor Green
        continue
    }

    # Create
    $body = @{
        name = $colDef.name
        type = $colDef.type
        listRule = $colDef.listRule
        viewRule = $colDef.viewRule
        createRule = $colDef.createRule
        updateRule = $colDef.updateRule
        deleteRule = $colDef.deleteRule
        schema = $colDef.schema
    }

    $result = Invoke-PbApi -Method POST -Path "/api/collections" -Body $body
    if ($result -and $result.id) {
        Write-Host "  Created! (id: $($result.id))" -ForegroundColor Green
    } else {
        Write-Host "  Failed to create." -ForegroundColor Red
    }
}

Write-Host "`nDone!" -ForegroundColor Cyan