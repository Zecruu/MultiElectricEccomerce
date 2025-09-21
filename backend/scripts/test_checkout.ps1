$ErrorActionPreference = 'Stop'

$ses = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$r = Invoke-RestMethod -Uri 'http://localhost:5000/api/csrf-token' -WebSession $ses
$t = $r.csrfToken
Write-Host "Token: $t"

$cat = Invoke-RestMethod -Uri 'http://localhost:5000/api/catalog/products?limit=1' -WebSession $ses
$prodId = $cat.items[0]._id
Write-Host "Using product id: $prodId"

$bodyObj = @{
  items = @(@{ productId = $prodId; qty = 1 });
  email = 'test@example.com';
  shippingAddress = @{ name='Test'; street='123'; city='Quito' };
  paymentMethod = 'mock'
}
$body = $bodyObj | ConvertTo-Json

$headers = @{}
$headers['csrf-token'] = $t
$headers['x-csrf-token'] = $t

try {
  $resp = Invoke-RestMethod -Uri 'http://localhost:5000/api/orders' -Method Post -Body $body -ContentType 'application/json' -WebSession $ses -Headers $headers
  Write-Host 'Response:'
  $resp | ConvertTo-Json -Depth 6
} catch {
  Write-Host "HTTP Error: $($_.Exception.Message)"
  if ($_.ErrorDetails.Message) { Write-Host "Details: $($_.ErrorDetails.Message)" }
}

