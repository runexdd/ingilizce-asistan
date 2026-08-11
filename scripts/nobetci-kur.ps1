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

# Yedek yontem: Baslangic klasoru.
#
# Zamanlanmis Gorev olusturmak bu makinede yonetici yetkisi istedi ("Erisim
# engellendi"). Baslangic klasoru kullanicinin kendi klasoru; yetki
# gerektirmiyor ve ayni isi goruyor: oturum acilinca nobetci penceresiz
# baslar. Gorev olusturulabiliyorsa o tercih edilir (yeniden baslatma,
# pil ayarlari gibi ustunlukleri var), olmuyorsa buraya dusulur.
$startupDir = [Environment]::GetFolderPath('Startup')
$vbsPath = Join-Path $startupDir 'ingilizce-nobetci.vbs'

if ($Kaldir) {
    $bulundu = $false
    try {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
        Write-Output "Zamanlanmis gorev kaldirildi."
        $bulundu = $true
    } catch {
        # kayitli gorev yoktu
    }
    if (Test-Path $vbsPath) {
        Remove-Item $vbsPath -Force
        Write-Output "Baslangic klasorundeki nobetci kaldirildi."
        $bulundu = $true
    }
    if (-not $bulundu) { Write-Output "Kayitli bir nobetci bulunamadi." }
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
    Write-Output "Zamanlanmis gorev olusturulamadi ($($_.Exception.Message))."
    Write-Output "Baslangic klasoru yontemine geciliyor - yonetici yetkisi gerekmiyor."

    # Penceresiz baslatici. cmd/ps1 dogrudan konsa her acilista bir pencere
    # acilip kapaniyor; .vbs ile Run'in ucuncu parametresi 0 = gizli.
    $node = (Get-Command node).Source

    # Yolu 8.3 KISA ADA cevir - basliktaki tum kodlama derdini bitirir.
    #
    # Proje yolu Turkce karakter iceriyor ("ingilizce kisisel uygulama") ve
    # .vbs dosyasi hangi kodlamayla yazilirsa yazilsin (ASCII, ANSI, UTF-16)
    # "s" harfi yolda bozuluyordu; wscript "Sistem belirtilen yolu bulamiyor"
    # deyip cikiyor, uustelik SESSIZCE - dosya duruyor, nobetci baslamiyor.
    # Kisa ad (C:\Users\omers\Desktop\INGILI~1\...) saf ASCII oldugu icin
    # hicbir kodlamada bozulmuyor ve Windows onu ayni klasore cozuyor.
    $fso = New-Object -ComObject Scripting.FileSystemObject
    $kisaYol = $fso.GetFolder($projectRoot).ShortPath

    $vbs = @"
' Ingilizce asistani - ogretmen nobetcisi (penceresiz baslatici)
' Kaldirmak icin bu dosyayi sil ya da:
'   powershell -ExecutionPolicy Bypass -File scripts\nobetci-kur.ps1 -Kaldir
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "$kisaYol"
sh.Run """$node"" scripts\watch.mjs", 0, False
"@
    # UYARI - burada iki kez tuzaga dusuldu, ucuncusunu yasama:
    #
    # Proje yolu Turkce karakter iceriyor ("ingilizce kisisel uygulama").
    #  - `-Encoding ASCII`   : "s" harfini "?" yapiyor.
    #  - `-Encoding Default` : sistemin ANSI kod sayfasi Turkce degil (cp1252),
    #                          "s"yi sedilsiz "s"ye ceviriyor.
    # Ikisinde de dosya sorunsuz olusuyor ama wscript "Sistem belirtilen yolu
    # bulamiyor" deyip cikiyor - yani nobetci acilista sessizce baslamiyor.
    #
    # Windows Script Host, BOM'lu UTF-16 .vbs dosyalarini dogru okuyor.
    Set-Content -Path $vbsPath -Value $vbs -Encoding Unicode

    if (Test-Path $vbsPath) {
        Write-Output "Nobetci baslangic klasorune kuruldu:"
        Write-Output "  $vbsPath"
        Write-Output "Kaldirmak icin : powershell -ExecutionPolicy Bypass -File scripts\nobetci-kur.ps1 -Kaldir"
    } else {
        Write-Output "HATA: baslangic klasorune de yazilamadi."
    }
}
