# PowerShell script to generate x-ms-client-principal header for Postman testing
# 
# Usage:
#   .\generate-client-principal.ps1 -UserId "69e63858-ac90-41a1-a491-edc5804134e6" -UserDetails "user@domain.com"
#
# Or with parameters:
#   .\generate-client-principal.ps1 "69e63858-ac90-41a1-a491-edc5804134e6" "user@domain.com"

param(
    [Parameter(Position=0, Mandatory=$true)]
    [string]$UserId,
    
    [Parameter(Position=1, Mandatory=$true)]
    [string]$UserDetails
)

$clientPrincipal = @{
    userId = $UserId
    userDetails = $UserDetails
    identityProvider = "aad"
    userRoles = @()
    claims = @{
        oid = $UserId
        name = $UserDetails
        preferred_username = $UserDetails
    }
} | ConvertTo-Json -Depth 10

$jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($clientPrincipal)
$base64Encoded = [Convert]::ToBase64String($jsonBytes)

Write-Host "`n=== Client Principal JSON ===" -ForegroundColor Cyan
Write-Host $clientPrincipal
Write-Host "`n=== Base64 Encoded (for x-ms-client-principal header) ===" -ForegroundColor Green
Write-Host $base64Encoded
Write-Host "`n=== Postman Header ===" -ForegroundColor Yellow
Write-Host "Header Name: x-ms-client-principal"
Write-Host "Header Value: $base64Encoded"
Write-Host "`n"
