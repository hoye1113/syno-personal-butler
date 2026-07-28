Set-StrictMode -Version Latest

function Get-SingleTaskNode {
  param(
    [Parameter(Mandatory = $true)][System.Xml.XmlDocument]$Document,
    [Parameter(Mandatory = $true)][string]$XPath,
    [Parameter(Mandatory = $true)][string]$Label
  )
  $nodes = @($Document.SelectNodes($XPath))
  if ($nodes.Count -ne 1) { throw "Syno task XML must contain exactly one $Label" }
  return $nodes[0]
}

function Assert-TaskNodeText {
  param(
    [Parameter(Mandatory = $true)][System.Xml.XmlDocument]$Document,
    [Parameter(Mandatory = $true)][string]$XPath,
    [Parameter(Mandatory = $true)][string]$Expected,
    [Parameter(Mandatory = $true)][string]$Label
  )
  $node = Get-SingleTaskNode -Document $Document -XPath $XPath -Label $Label
  if ($node.InnerText -ne $Expected) { throw "Syno task XML has an unexpected $Label" }
  return $node
}

function Protect-SynoTaskXml {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)][string]$XmlText,
    [Parameter(Mandatory = $true)][string[]]$ExpectedUser,
    [Parameter(Mandatory = $true)][string]$ExpectedCommand,
    [Parameter(Mandatory = $true)][string]$ExpectedArguments,
    [Parameter(Mandatory = $true)][string]$ExpectedWorkingDirectory
  )

  try { $document = [xml]$XmlText }
  catch { throw "Syno task XML is invalid: $($_.Exception.Message)" }
  $namespace = $document.DocumentElement.NamespaceURI
  if ($namespace -ne "http://schemas.microsoft.com/windows/2004/02/mit/task") {
    throw "Syno task XML has an unsupported namespace"
  }

  $logonTrigger = Get-SingleTaskNode -Document $document -XPath "//*[local-name()='Triggers']/*[local-name()='LogonTrigger']" -Label "logon trigger"
  $triggerUser = Get-SingleTaskNode -Document $document -XPath "//*[local-name()='Triggers']/*[local-name()='LogonTrigger']/*[local-name()='UserId']" -Label "logon trigger user"
  if ($ExpectedUser -notcontains $triggerUser.InnerText) { throw "Syno task XML has an unexpected logon trigger user" }
  $principalUser = Get-SingleTaskNode -Document $document -XPath "//*[local-name()='Principals']/*[local-name()='Principal']/*[local-name()='UserId']" -Label "principal user"
  if ($ExpectedUser -notcontains $principalUser.InnerText) { throw "Syno task XML has an unexpected principal user" }
  [void](Assert-TaskNodeText -Document $document -XPath "//*[local-name()='Actions']/*[local-name()='Exec']/*[local-name()='Command']" -Expected $ExpectedCommand -Label "command")
  [void](Assert-TaskNodeText -Document $document -XPath "//*[local-name()='Actions']/*[local-name()='Exec']/*[local-name()='Arguments']" -Expected $ExpectedArguments -Label "arguments")
  [void](Assert-TaskNodeText -Document $document -XPath "//*[local-name()='Actions']/*[local-name()='Exec']/*[local-name()='WorkingDirectory']" -Expected $ExpectedWorkingDirectory -Label "working directory")
  [void](Assert-TaskNodeText -Document $document -XPath "//*[local-name()='Settings']/*[local-name()='MultipleInstancesPolicy']" -Expected "IgnoreNew" -Label "multiple instance policy")
  [void](Assert-TaskNodeText -Document $document -XPath "//*[local-name()='Settings']/*[local-name()='StartWhenAvailable']" -Expected "true" -Label "start-when-available setting")
  [void](Assert-TaskNodeText -Document $document -XPath "//*[local-name()='Settings']/*[local-name()='Hidden']" -Expected "true" -Label "hidden setting")
  [void](Assert-TaskNodeText -Document $document -XPath "//*[local-name()='Settings']/*[local-name()='ExecutionTimeLimit']" -Expected "PT0S" -Label "execution time limit")
  [void](Assert-TaskNodeText -Document $document -XPath "//*[local-name()='Settings']/*[local-name()='RestartOnFailure']/*[local-name()='Interval']" -Expected "PT1M" -Label "restart interval")
  [void](Assert-TaskNodeText -Document $document -XPath "//*[local-name()='Settings']/*[local-name()='RestartOnFailure']/*[local-name()='Count']" -Expected "999" -Label "restart count")

  $delayNodes = @($logonTrigger.SelectNodes("./*[local-name()='Delay']"))
  if ($delayNodes.Count -gt 1) { throw "Syno task XML must contain at most one logon delay" }
  if ($delayNodes.Count -eq 0) {
    $delayNode = $document.CreateElement("Delay", $namespace)
    [void]$logonTrigger.AppendChild($delayNode)
  } else {
    $delayNode = $delayNodes[0]
  }
  $delayNode.InnerText = "PT30S"
  return $document.OuterXml
}

function Test-SynoTaskXml {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)][string]$XmlText,
    [Parameter(Mandatory = $true)][string[]]$ExpectedUser,
    [Parameter(Mandatory = $true)][string]$ExpectedCommand,
    [Parameter(Mandatory = $true)][string]$ExpectedArguments,
    [Parameter(Mandatory = $true)][string]$ExpectedWorkingDirectory
  )

  try { $document = [xml]$XmlText }
  catch { throw "Syno task XML is invalid: $($_.Exception.Message)" }
  $delayNodes = @($document.SelectNodes("//*[local-name()='Triggers']/*[local-name()='LogonTrigger']/*[local-name()='Delay']"))
  if ($delayNodes.Count -ne 1 -or $delayNodes[0].InnerText -ne "PT30S") {
    throw "Syno task XML does not persist the required PT30S logon delay"
  }
  [void](Protect-SynoTaskXml -XmlText $XmlText -ExpectedUser $ExpectedUser -ExpectedCommand $ExpectedCommand -ExpectedArguments $ExpectedArguments -ExpectedWorkingDirectory $ExpectedWorkingDirectory)
  return $true
}

Export-ModuleMember -Function Protect-SynoTaskXml, Test-SynoTaskXml
