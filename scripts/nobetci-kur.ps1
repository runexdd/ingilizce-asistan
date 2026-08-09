# Öğretmen nöbetçisini Windows'a tanıtır — bilgisayar her açıldığında
# kendiliğinden başlar ve arka planda çalışır.
#
# Bunu **bir kez** çalıştırman yeterli. Proje kökünden:
#
#     powershell -ExecutionPolicy Bypass -File scripts\nobetci-kur.ps1
#
# Kaldırmak için:
#
#     powershell -ExecutionPolicy Bypass -File scripts\nobetci-kur.ps1 -Kaldir
#
# Ne yapıyor: "IngilizceOgretmenNobetcisi" adında bir Zamanlanmış Görev
# oluşturuyor. Görev, sen bilgisayara giriş yaptığında `node scripts/watch.mjs`
# komutunu pencere açmadan başlatıyor. Nöbetçi gist'i dinliyor; telefondan yeni
# bir şey geldiğini görünce Claude Code'u sessiz kipte çalıştırıp öğretmenin
# paketini hazırlıyor.
#
# ⚠️ Bilgisayar kapalıyken çalışmaz. Telefondaki uygulama yapay zekâyı doğrudan
# çağıramıyor (ek ücret istenmiyor), o yüzden mimarinin sınırı burası. İşler
# birikiyor ve bilgisayar açılınca tek seferde işleniyor.

param(
    [switch]$Kaldir
)

$taskName = 'IngilizceOgretmenNobetcisi'
$projectRoot = Split-Path -Parent $PSScriptRoot

if ($Kaldir) {
    try {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
        Write-Output "Nobetci kaldirildi."
    } catch {
        Write-Output "Kayitli bir nobetci bulunamadi."
    }
    return
}

# node nerede
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
    Write-Output "HATA: node bulunamadi. Node.js kurulu olmali."
    return
}

# Jeton var mi — nobetci onsuz calisamaz
$tokenFile = Join-Path $projectRoot 'sync-token.txt'
if (-not (Test-Path $tokenFile)) {
    Write-Output "HATA: sync-token.txt yok. GitHub jetonunu o dosyaya yapistir, sonra tekrar calistir."
    return
}

$action = New-ScheduledTaskAction -Execute $node `
    -Argument 'scripts\watch.mjs' `
    -WorkingDirectory $projectRoot

$trigger = New-ScheduledTaskTrigger -AtLogOn

# Pencere acilmasin, arka planda dursun; ag yokken de baslasin (nobetci zaten
# baglanamayinca sessizce bekliyor)
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5)

try {
    Register-ScheduledTask -TaskName $taskName `
        -Action $action -Trigger $trigger -Settings $settings `
        -Description 'Ingilizce asistani: telefondan gelen isleri gorup ogretmeni calistirir' `
        -Force -ErrorAction Stop | Out-Null

    Start-ScheduledTask -TaskName $taskName
    Write-Output "Nobetci kuruldu ve baslatildi."
    Write-Output "Durumu gormek icin : Get-ScheduledTask -TaskName $taskName"
    Write-Output "Kaldirmak icin     : powershell -ExecutionPolicy Bypass -File scripts\nobetci-kur.ps1 -Kaldir"
} catch {
    Write-Output "HATA: gorev olusturulamadi - $($_.Exception.Message)"
    Write-Output "Yonetici olarak calistirmayi dene."
}
