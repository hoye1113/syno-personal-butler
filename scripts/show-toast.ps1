param(
  [Parameter(Mandatory = $true)][string]$Title,
  [Parameter(Mandatory = $true)][string]$Body
)

$escapedTitle = [System.Security.SecurityElement]::Escape($Title)
$escapedBody = [System.Security.SecurityElement]::Escape($Body)
$xml = @"
<toast><visual><binding template="ToastGeneric"><text>$escapedTitle</text><text>$escapedBody</text></binding></visual></toast>
"@

try {
  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
  $document = New-Object Windows.Data.Xml.Dom.XmlDocument
  $document.LoadXml($xml)
  $toast = New-Object Windows.UI.Notifications.ToastNotification $document
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Syno').Show($toast)
} catch {
  Write-Warning "Windows notification failed: $($_.Exception.Message)"
}
