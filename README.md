# ONEBO FX — treyding jurnali

1-bosqich: kirish, hisoblar, savdo kiritish, savdolar jadvali, savdo tafsiloti,
statistika, P&L kalendar, playbook va risk kalkulyator.

2-bosqich: skrinshotdan avtomatik o'qish, kundalik, setup yaratish va
tahrirlash, setup qoidalaridan avtomatik to'ladigan checklist.

3-bosqich: risk ogohlantirishlari va ularning tarixi, korrelyatsiya nazorati,
iqtisodiy kalendarli ertalabki brifing.

4-bosqich: stop vaqti tahlili, ushlash vaqti, "agar shunday qilganimda"
simulyatori, Monte-Carlo, davrlarni solishtirish va backtest jurnali.

5-bosqich: psixologiya suhbati, haftalik PDF hisobot va uni pochtaga
jo'natish. Shu bosqichda ilovaning "professional tayyorgarligi" ham
yig'ishtirildi: vaqt mintaqasi, testlar, sahifalarni bo'lish, paginatsiya,
xavfsizlik header'lari va urinishlar chegarasi.

6-bosqich: mentor va o'quvchi — taklif kodi, ulashish nazorati,
savdoga bog'lanadigan izohlar.

7-bosqich: monetizatsiya — tariflar, cheklovlar, Payme va Click
integratsiyasi, kartaga o'tkazma va uni tasdiqlash.

8-bosqich: uch til — o'zbek, rus, ingliz. Interfeys, xato xabarlari,
ogohlantirish matnlari, PDF hisobot va AI javoblari tanlangan tilda.

9-bosqich: ishga tushirish — Docker obrazi va `docker compose`, Redis
bilan urinishlar chegarasi, S3 ga skrinshot saqlash, sog'liq endpointi,
lint va CI.

10-bosqich: hisob xavfsizligi — parolni pochta orqali tiklash, parolni
o'zgartirish, sessiyalarni bekor qilish, ma'lumotni yuklab olish va
hisobni o'chirish.

11-bosqich: ochiq sahifa — mahsulot tavsifi, tariflar, savollar va
ro'yxatdan o'tish yo'li. Boshqaruv paneli `/panel` ga ko'chdi.

12-bosqich: demo rejim — ro'yxatdan o'tmasdan to'la ma'lumot bilan
ilovani ko'rish. Namuna ma'lumot generatori umumiy: seed ham, demo ham
bitta manbadan.

13-bosqich: ommaviy oferta va maxfiylik siyosati — uch tilda, rekvizitlar
`.env` dan.

14-bosqich: xatolarni yozish va xodim paneli — foydalanuvchilar, tushum,
faollik va oxirgi xatolar.

15-bosqich: birinchi kirish yo'riqnomasi, ilova belgisi va telefonga
o'rnatish (PWA).

Dizayn maketdagi ko'rinishni aynan takrorlaydi: to'q fon, bitta ko'k aksent
(`#3B81FC`), foyda va zarar uchun ikkita semantik rang, raqamlar monospace.

## Ishga tushirish

Serverga qo'yish uchun Docker yo'li pastroqda — «Serverga qo'yish»
bo'limiga qarang. Quyidagisi kompyuterda ishlash uchun.

```bash
# 1. Paketlar
npm install

# 2. Sozlamalar
cp .env.example .env
#    DATABASE_URL — PostgreSQL ulanish satri
#    AUTH_SECRET  — openssl rand -base64 32

# 3. Baza jadvallari
npx prisma db push

# 4. Namuna ma'lumot (ixtiyoriy)
npm run db:seed        # demo@onebo.uz / demo12345

# 5. Dev server
npm run dev            # http://localhost:3000
```

PostgreSQL yo'q bo'lsa, eng tez yo'l Docker orqali:

```bash
docker run --name onebo-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=onebofx -p 5432:5432 -d postgres:16
```

Ilova yangilanganda sxema o'zgargan bo'lishi mumkin — bunda `npx prisma
db push` qayta ishga tushiriladi. Oxirgi o'zgarish: `AppError` jadvali
qo'shildi.

## Tuzilishi

```
Dockerfile              Ishlab chiqarish obrazi (uch bosqich, standalone)
docker-compose.yml      Ilova + PostgreSQL + Redis
eslint.config.mjs       Lint qoidalari
.github/workflows/      CI: lint, tiplar, testlar, yig'ish
prisma/
  schema.prisma         Baza sxemasi
  seed.ts               Namuna ma'lumot
src/
  app/
    (auth)/             Kirish va ro'yxatdan o'tish
    page.tsx            Ochiq sahifa — kirmagan mehmon uchun
    oferta/             Ommaviy oferta
    maxfiylik/          Maxfiylik siyosati
    icon.png            Ilova belgisi (favicon)
    manifest.ts         Telefonga o'rnatish uchun
    robots.ts           Qidiruv tizimlari uchun qoidalar
    sitemap.ts          Ochiq sahifalar ro'yxati
    (app)/              Ilova ichi — yon panel bilan
      panel/            Boshqaruv paneli
      trades/           Savdolar, tafsilot, yangi, tahrirlash
      calendar/         P&L kalendar
      journal/          Kundalik
      journal/suhbat/   Psixologiya suhbati
      hisobot/          Haftalik hisobot va pochtaga jo'natish
      mentor/           Aloqalar, takliflar
      mentor/[id]/      Bitta aloqa: o'quvchi ma'lumoti va yozishmalar
      sozlamalar/       Parol, ma'lumotni yuklab olish, hisobni o'chirish
      tarif/            Tariflar, chegaralar, to'lovlar tarixi
      tarif/tolov/[id]/ Kartaga o'tkazma va chek raqami
      admin/            Xodim paneli: umumiy ko'rinish (faqat xodim)
      admin/tolovlar/   Qo'lda to'lovlarni tasdiqlash
      admin/xatolar/    Oxirgi xatolar
      alerts/           Ogohlantirishlar va tarixi
      analytics/        Chuqur tahlil — to'rtta bo'lim
      playbook/         Setup kutubxonasi, yaratish va tahrirlash
      risk/             Risk kalkulyator
      accounts/         Hisoblar va limitlar
    api/screenshot/     Himoyalangan skrinshot berish
    api/report/weekly/  Haftalik hisobotni PDF sifatida berish
    api/payme/          Payme Merchant API (JSON-RPC)
    api/click/prepare/  Click — Prepare
    api/click/complete/ Click — Complete
  actions/              Server action'lar (auth, trades, accounts, journal,
                        setups, screenshot, alerts, brief, coach, report,
                        mentor, billing)
  components/
    ui/                 Card, Kpi, Chip, Btn, Field, Sidebar, Topbar, ikonkalar
    charts/             SVG grafiklar — kutubxonasiz
    trades/             Savdolar jadvali, forma, skrinshot bloki
    journal/            Kundalik muharriri, suhbat oynasi
    report/             Hisobotni pochtaga jo'natish formasi
    mentor/             Taklif formalari, yozishmalar, ulashish sozlamasi
    billing/            Tarif tanlash, qulf ekrani, chek formasi
    playbook/           Setup formasi
    alerts/             Ogohlantirish banneri
    brief/              Ertalabki brifing va iqtisodiy qism
    demo/               Namuna hisob lentasi
    onboarding/         Boshlash qadamlari kartochkasi
    landing/            Ochiq sahifa bo'limlari va panel namunasi
    settings/           Parol, ma'lumot, hisobni o'chirish formalari
    i18n/               Til provayderi va UZ / RU / EN tugmalari
  lib/
    stats.ts            Barcha ko'rsatkichlar shu yerda hisoblanadi
    analytics.ts        Vaqt tahlili, simulyator, Monte-Carlo, solishtirish
    alerts.ts           Ogohlantirish qoidalari va matnlari
    correlation.ts      Instrument tarkibidan korrelyatsiya
    economics.ts        Iqtisodiy kalendar provayderi
    brief.ts            Ertalabki brifing va AI tahlil
    extract.ts          Skrinshotdan o'qish va mantiqiy tekshiruv
    uploads.ts          Skrinshotni qabul qilish va turini tekshirish
    storage.ts          Fayl qayerda yotadi: disk yoki S3
    journal.ts          Kundalik sanalari va odatlar
    coach.ts            Suhbat konteksti, qoidalari va AI'siz qadamlar
    report.ts           Haftalik hisobot ma'lumoti va xulosalari
    pdf.ts              Hisobotning PDF ko'rinishi (pdfkit, brauzersiz)
    mail.ts             SMTP orqali jo'natish
    mentor.ts           Mentor aloqalari va ruxsat tekshiruvlari
    billing.ts          Tariflar, narx, muddat va ruxsat mantig'i (toza)
    payments.ts         To'lovlar, tarif holati va chegaralar
    payme.ts            Payme protokoli: xato kodlari, holatlar, havola
    click.ts            Click protokoli: imzo, xato kodlari, havola
    uzum.ts             Uzum Bank protokoli: Basic auth, holatlar, javoblar
    demo-data.ts        Namuna savdolar, setuplar va kundalik generatori
    admin.ts            Xodim paneli uchun sanoq va ruxsat tekshiruvi
    legal.ts            Huquqiy sahifalardagi rekvizitlar (.env dan)
    log.ts              Xatolarni yozish: stderr va baza
    onboarding.ts       Boshlash qadamlari mantig'i
    reset.ts            Parolni tiklash kalitlari: yaratish, xeshlash, muddat
    tz.ts               Vaqt mintaqasi, kun va hafta chegaralari
    ratelimit.ts        Urinishlar chegarasi (xotira yoki Redis)
    instruments.ts      Instrument spetsifikatsiyalari
    format.ts           Raqam va sana formatlari
    starter-data.ts     Ro'yxatdan o'tishda beriladigan setuplar va checklist
    i18n/               Uch til lug'ati, server tomon tanlovi, yorliqlar
public/
  fonts/                DejaVu Sans — PDF hisobotdagi kirill uchun
```

## Asosiy qarorlar

**Hisoblanadigan qiymatlar bazada saqlanmaydi.** R-multiple, P&L, risk foizi,
drawdown — hammasi `src/lib/stats.ts` da narxlardan chiqariladi. Savdoning
kirish narxini tuzatsangiz, statistika o'zi to'g'rilanadi.

**P&L narxlardan hisoblanadi**, formula: `(chiqish − kirish) / punkt × punkt
qiymati × hajm − komissiya − svop`. Broker ko'rsatgan aniq summani kiritsangiz
(`BROKER P&L` maydoni), hisoblangan qiymat o'rniga o'sha ishlatiladi.

**Punkt qiymati** `src/lib/instruments.ts` da instrumentga qarab beriladi va
savdo yaratilganda uning nusxasi saqlanadi — keyin spetsifikatsiya o'zgarsa,
eski savdolar natijasi o'zgarmaydi. USDJPY kabi juftliklarda punkt qiymati
aslida kursga qarab suzadi; jurnal uchun doimiy qiymat yetarli, lekin har
savdoda tahrirlash mumkin.

**Bloklash yo'q.** Kunlik limit oshganda ilova ogohlantiradi, lekin savdo
qo'shishni to'xtatmaydi — qaror foydalanuvchida.

**Standart limitlar** The5ers dasturlaridan olingan (Hyper Growth 3% / 6%,
High Stakes 5% / 10%, Bootcamp 5% umumiy). Prop-firmalar shartlarini
o'zgartirib turadi — `Hisoblar` sahifasida qo'lda to'g'rilang.

## Skrinshotdan o'qish qanday ishlaydi

`ANTHROPIC_API_KEY` berilgan bo'lsa, savdo formasidagi skrinshot bloki
rasmni o'qib, maydonlarni to'ldirishni **taklif qiladi**. To'rtta himoya
qatlami bor:

1. **AI hech narsa saqlamaydi.** U faqat formani to'ldiradi, saqlash tugmasi
   foydalanuvchida qoladi. Rasm yonida turadi — ko'z bilan solishtirish uchun.
2. **Ishonch darajasi har maydonda.** Model "low" deb belgilagan qiymat
   formaga umuman tushmaydi — "shubhali" deb ko'rsatiladi, foydalanuvchi o'zi
   kiritadi.
3. **Mantiqiy tekshiruv AI dan mustaqil** (`src/lib/extract.ts`,
   `validateExtraction`): stop yo'nalishga mos kelmasa — stop va take profit
   bo'shatiladi; narx instrumentning ishonarli oralig'idan chiqsa —
   ogohlantirish; stop masofasi 5000 punktdan oshsa — ogohlantirish.
4. **R va P&L formuladan hisoblanadi**, AI dan emas. Model faqat to'rtta
   raqamni o'qiydi, qolgani `lib/stats.ts` da — shuning uchun o'qishda xato
   bo'lsa ham statistika buzilmaydi.

Kalit berilmasa, rasm shunchaki saqlanadi va savdoga biriktiriladi.

Model `ANTHROPIC_MODEL` bilan almashtiriladi (standart: `claude-sonnet-5`).

Skrinshotlar diskda `UPLOAD_DIR` ichida saqlanadi va faqat egasiga
`/api/screenshot/<kalit>` orqali beriladi — ochiq URL yo'q. Diskka yozilgani
uchun serverless emas, oddiy server yoki VPS kerak.

## Ogohlantirishlar qanday ishlaydi

Tizim savdoni **hech qachon bloklamaydi**. U holatni ko'rsatadi va odam
tilida tavsiya beradi — qaror foydalanuvchida qoladi.

| Holat | Qachon | Nima bo'ladi |
| --- | --- | --- |
| Kunlik limitga yaqin | Limitning 70% i ishlatilganda | Sariq ogohlantirish |
| Kunlik limit tugadi | 100% | "Og'ayni, bugungi limit tugadi..." |
| Ketma-ket 2 stop | Bugungi oxirgi ikki savdo zarar | Zarardan keyingi win rate ko'rsatiladi + tanaffus tavsiyasi |
| Revenge-trade | Zarardan 15 daqiqa ichida, hajm 1.5 barobar | "Bu yo'ldan qayt — yaxshimas" |
| Drawdown xavfi | Umumiy limitning 80% i | Riskni yarmiga tushirish tavsiyasi |
| Korrelyatsiya | 2+ ochiq pozitsiya bitta valyutaga bir tomondan | Jami risk + boshqa instrumentlar tavsiyasi |
| Risk chegaradan katta | Savdo riski sozlamadagidan yuqori | Formada jonli ogohlantirish |

Ogohlantirish chiqqanda savdo baribir qo'shilsa — bu `RiskAlert` jadvaliga
`IGNORED` deb yoziladi va savdoga bog'lanadi. Oy oxirida `Ogohlantirishlar`
sahifasi shuni ko'rsatadi: "E'tibor bermagan N ta savdoning M tasi zarar
bilan tugadi — jami −$X". Bu bloklashdan kuchliroq ishlaydi, chunki raqam
o'zi gapiradi.

**Korrelyatsiya** tarixiy narxlardan emas, instrument tarkibidan hisoblanadi:
EURUSD, GBPUSD va XAUUSD bo'yicha long — aslida dollarga qarshi bitta yirik
pozitsiya. Tashqi narx ma'lumoti kerak emas.

## Ertalabki brifing

Panel tepasida, kuniga bir marta, o'zi yopilmaydi. Tarkibi: kecha nima bo'ldi ·
bugungi limitlar holati · statistikadan bitta eslatma (har kuni navbat bilan) ·
kechagi kundalik darsingiz · iqtisodiy qism.

**Iqtisodiy qism** — ilovaning yagona tashqi manbaga bog'liq joyi.
`ECONOMIC_API_KEY` berilganda kalendar kuniga bir marta olinadi va bazaga
yoziladi (hamma foydalanuvchi uchun umumiy, shuning uchun API xarajati
foydalanuvchilar soniga bog'liq emas). Faqat yuqori va o'rta ta'sirli
voqealar, faqat siz savdo qiladigan valyutalar bo'yicha.

Tahlilga uchta qat'iy qoida qo'yilgan (`src/lib/brief.ts`, `RULES`):

1. Har doim taxminiy — iqtisodiy raqam bilan narx orasidagi bog'liqlik
   doimiy emas.
2. Savdo signali yo'q — "oltinni sot" kabi jumlalar taqiqlangan.
3. Faqat chiqqan ma'lumot izohlanadi, kelajak bashorat qilinmaydi.

Provayder javobining maydon nomlari har xil bo'lgani uchun
`src/lib/economics.ts` dagi normalizatsiya bir nechta ehtimoliy nomni qabul
qiladi (`event`/`title`, `forecast`/`estimate`/`consensus`, ...). Provayder
tanlangach, real javobni ko'rib shu joyni aniqlashtirish kerak bo'lishi
mumkin. Tanlash mezoni bitta: `actual`, `forecast` va `previous` uchalasi
ham bo'lishi shart.

## Chuqur tahlil

`Statistika` sahifasi to'rtta bo'limdan iborat.

**Vaqt tahlili.** Soat bo'yicha ustunlar: balandlik — savdolar soni, qizil
qism — stoplar ulushi, shuning uchun "soat 16:00 da 8 savdodan 6 tasi stop"
degan naqsh bitta qarashda ko'rinadi. Ostida hafta kuni × soat issiqlik
xaritasi (katak rangi — o'rtacha R) va ushlash vaqti / natija nuqtali
diagrammasi. Oxirgisi ikkita keng tarqalgan muammoni ochadi: yutuqni erta
olish va zararni uzoq ushlab turish.

**Simulyator.** Filtr qo'yasiz — setupni chiqarish, hafta kunini chiqarish,
vaqt oynasi, kundagi savdo chegarasi, bir xil risk — tizim butun tarixni
shu qoida bilan qayta hisoblaydi va ikkita kapital egri chizig'ini yonma-yon
qo'yadi. Uchta raqam chiqadi: sof P&L farqi, drawdown farqi, expectancy farqi.

Bu **o'tmishga qarab optimallashtirish**, shuning uchun natija ostida har doim
namuna hajmi turadi va 50 tadan kam bo'lsa ogohlantirish chiqadi. Kichik
namunada chiqqan farq tasodif bo'lishi mumkin.

**Monte-Carlo.** Sizning R natijalaringiz 1000 marta tasodifiy tartibda qayta
aralashtiriladi — har bir aralashtirish bitta mumkin bo'lgan kelajak.
Chiqadigan narsalar: 5–95 protsentil yelpig'ichi, maksimal drawdown
taqsimoti, limitdan oshish ehtimoli va eng uzun zarar seriyasi taqsimoti.

Oxirgisi psixologik jihatdan eng foydalisi: treyder 4 ta ketma-ket zarardan
keyin tizimni tashlab yuboradi, holbuki bu statistik jihatdan mutlaqo
kutilgan narsa. Natija takrorlanadigan bo'lishi uchun generator
determinlashgan — har safar bir xil raqam chiqadi.

Kamida 30 savdo kerak; kamroq bo'lsa hisob o'chiq turadi va sababi yoziladi.

**Davrlarni solishtirish.** Ikkita oy yonma-yon: har bir qatorda birinchi davr,
ikkinchi davr va farq. Farq faqat **sezilarli** bo'lganda rang bilan
belgilanadi — aks holda har oy "o'zgarish" bo'lib ko'rinaveradi. Ostida ikkala
davrning kapital egri chiziqlari, ikkalasi ham noldan boshlangan holda.

## Backtest jurnali

Savdo formasidagi `REJIM` tugmasi savdoni backtest deb belgilaydi. Backtest
yozuvlari **real statistikaga umuman qo'shilmaydi** — panel, kalendar,
playbook va chuqur tahlil faqat real savdolarni oladi.

`Savdolar → Backtest` bo'limida ikkalasi solishtiriladi: backtestda profit
factor 2.4 chiqib, realda 1.1 bo'lsa, muammo strategiyada emas, ijroda.

## Psixologiya suhbati

`Kundalik → Suhbat`. Foydalanuvchi holatini yozadi, javob esa uning
**o'sha paytdagi haqiqiy raqamlarini** ko'rib turib beriladi: bugungi natija,
kunlik limitdan qancha ishlatilgani, bugungi ketma-ket zararlar, ochiq
savdolar, faol ogohlantirishlar (`src/lib/coach.ts`, `buildContext`).

Qat'iy qoidalar (`RULES`):

1. **Savdo signali yo'q** — yo'nalish, kirish nuqtasi, stop joyi haqida
   hech narsa aytilmaydi.
2. **Tashxis yo'q** — ilova shifokor emas.
3. **Raqam to'qilmaydi** — faqat kontekstdagi ma'lumot ishlatiladi.
4. **Zarar chiroyli qilib ko'rsatilmaydi** — "ertaga qaytarasan" degan
   tasalli yolg'on.

Og'ir holat (umidsizlik, o'ziga zarar) sezilsa, savdo mavzusi butunlay
yig'ishtiriladi va tirik odam bilan gaplashish tavsiya qilinadi.

Kalit bo'lmasa ham sahifa foydali: o'ng ustundagi qadamlar
(`grounding`) holatga qarab tanlanadi va internetsiz ishlaydi —
ketma-ket zarardan keyin, ochiq savdo ustida turganda va savdodan oldin
uchta alohida ro'yxat.

Soatiga 40 xabar chegarasi bor. Suhbat saqlanadi va istalgan payt
to'liq o'chiriladi.

## Haftalik hisobot

`Haftalik hisobot` sahifasi. Hafta dushanbadan yakshanbagacha, foydalanuvchi
mintaqasida (`weekRangeIn`). Ichida: sakkizta ko'rsatkich, qoidalar asosida
tuzilgan xulosa (AI'siz — `reportHighlights`), kunlar bo'yicha ustunlar,
setup va sessiya kesimi, savdolar ro'yxati va kundalikdagi xulosalar.

**PDF brauzersiz tuziladi** — `pdfkit` to'g'ridan-to'g'ri fayl yozadi,
shuning uchun serverda headless Chrome saqlash shart emas. Hisobot oq fonda:
u bosiladi va pochtada ochiladi.

**Avtomatik jo'natish yo'q.** Xat faqat `Pochtaga jo'natish` bosilganda
ketadi; PDF xatga ilova qilinadi. SMTP sozlanmagan bo'lsa buni sahifa
ochiq aytadi va "yuborildi" deb yolg'on ko'rsatmaydi. Soatiga 5 ta xat.

PDF ning standart shriftlari WinAnsi kodlashida ishlaydi — unda matematik
minus va o'ng strelka yo'q. `safe()` ularni almashtiradi, o'zbek apostrofiga
esa tegmaydi (u WinAnsi da bor).

## Mentor va o'quvchi

Aloqa **taklif kodi** orqali ochiladi. Istalgan tomon kod yaratadi va o'z
rolini ko'rsatadi; ikkinchi tomon kodni kiritganda avtomatik teskari rolda
qo'shiladi. Kod telefon orqali aytiladi, shuning uchun alifboda adashtiradigan
belgilar yo'q — `O`, `0`, `I` va `1` ishlatilmaydi.

**Nimani ulashishni o'quvchi belgilaydi** (`Mentor nimani ko'radi`):
savdolar va statistika · ogohlantirishlar · kundalik xulosalari. Bayroq
yopiq bo'lsa ma'lumot umuman yuklanmaydi — mentor sahifasida "o'quvchi bu
bo'limni yopib qo'ygan" deb ochiq yoziladi.

**Psixologiya suhbati hech qachon ulashilmaydi.** U ro'yxatda yo'q va uni
o'qiydigan funksiya `src/lib/mentor.ts` da umuman mavjud emas — bu bayroq
bilan boshqariladigan narsa emas.

Mentor har bir savdoga alohida izoh qoldira oladi: jadvaldagi `izoh`
tugmasi savdoni tanlaydi va yozilgan izoh o'sha savdoga bog'lanadi.
Yozishmalarni ikkala tomon ham yozadi; o'qilmagan izohlar soni yon panelda
ko'rinadi.

Ruxsat har bir so'rovda qayta tekshiriladi — sahifaga ishonilmaydi.
`getMentorship` faqat tomon bo'lgan odamga qaytadi, `getStudentView`
chaqiruvchi shu aloqaning mentori ekanini talab qiladi, izohni savdoga
bog'lashdan oldin esa savdo aynan o'sha o'quvchiniki ekani tasdiqlanadi.

Chegaralar: bitta mentorda 25 tagacha o'quvchi, bitta o'quvchida 3 tagacha
mentor, ochiq takliflar 5 tadan oshmaydi.

Aloqani ikkala tomon ham to'xtata oladi. Yozishmalar o'chmaydi — aloqa
`ENDED` holatiga o'tadi va ro'yxatdan chiqadi.

## Tariflar va to'lov

Uchta tarif: **Bepul**, **Pro** (99 000 so'm/oy) va **Mentor**
(249 000 so'm/oy). Ro'yxatdan o'tganda 14 kunlik Pro sinov muddati
beriladi — kartasiz.

Narx, chegirma va ruxsat mantig'i `src/lib/billing.ts` da, u bazaga ham,
tarmoqqa ham tegmaydi — shuning uchun to'liq testdan o'tadi. Uzoq
muddatga chegirma foizda yoziladi (`PERIODS`), narx undan hisoblanadi.

**Muddat tugasa ma'lumot o'chmaydi.** Savdolar, kundalik va statistika
joyida qoladi; faqat yangi yozish chegaralanadi va qo'shimcha bo'limlar
yopiladi. Uzaytirilganda qolgan muddat yo'qolmaydi — yangisi ustiga
qo'shiladi (`extendUntil`).

Har bir yopiq bo'lim **ikki joyda** tekshiriladi: sahifada va server
action ichida. Sahifa qulfi ko'rinish uchun, haqiqiy chegara esa
action'da — aks holda so'rovni to'g'ridan-to'g'ri yuborish yetardi.

### Payme

`POST /api/payme` — Merchant API, JSON-RPC 2.0. Oltita metod:
`CheckPerformTransaction`, `CreateTransaction`, `PerformTransaction`,
`CancelTransaction`, `CheckTransaction`, `GetStatement`.

Protokolning uchta talabi alohida bajarilgan:

1. **Javob har doim HTTP 200.** Boshqa status Payme tomonda protokol
   xatosi (-32400) bo'lib hisoblanadi, shuning uchun bu marshrutda
   hech qachon 4xx/5xx qaytarilmaydi — xato RPC javobining ichida.
2. **Idempotentlik.** Javob yo'qolsa Payme `CreateTransaction` va
   `PerformTransaction` ni aynan shu parametrlar bilan qayta yuboradi;
   ikkalasi ham ikkinchi marta yangi narsa yaratmaydi, borini qaytaradi.
3. **Xato kodlari** hujjatdagidek: -31001 summa, -31003 tranzaksiya
   topilmadi, -31007 bekor qilib bo'lmaydi, -31008 holat mos emas,
   -31050 dan boshlab hisob xatolari (xabar uch tilda, `data` da
   qaysi maydon ekani).

Chekdagi hisob maydoni — `ac.payment_id`, qiymati bizdagi to'lov id si.
Summa **tiyinda**.

### Click

`POST /api/click/prepare` va `POST /api/click/complete`.

Imzo — MD5, qiymatlar ajratgichsiz ulanadi:

```
Prepare:  md5(click_trans_id + service_id + KALIT + merchant_trans_id + amount + action + sign_time)
Complete: md5(click_trans_id + service_id + KALIT + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
```

`amount` Click yuborgan ko'rinishida qoladi — qayta formatlansa
("99000.00" → "99000") imzo mos kelmaydi. Complete da kelgan `error`
manfiy bo'lsa pul yechilmagan: to'lov bekor qilinadi va -9 qaytariladi.

Click summani **so'mda** yuboradi, Payme esa tiyinda. Ikkalasi ham
`toTiyin` orqali bitta birlikka keltiriladi — bu eng oson qilinadigan
xato, shuning uchun alohida testlari bor.

### Uzum Bank

Uzum bizga beshta POST yuboradi — `check`, `create`, `confirm`,
`reverse`, `status` — hammasi `/api/uzum/<metod>` da, Basic auth bilan.
Payme'dan farqi: bu JSON-RPC emas, oddiy JSON; har metodning o'z yo'li
va o'z javob shakli bor.

| Metod | Nima qiladi |
| --- | --- |
| `check` | Shunday to'lov bormi va unga to'lash mumkinmi |
| `create` | Tranzaksiya ochiladi, `transId` yozuvga biriktiriladi |
| `confirm` | Pul yechildi — tarif ochiladi |
| `reverse` | Bekor qilindi yoki qaytarildi — tarif orqaga qaytariladi |
| `status` | Hozirgi holat |

Summa **tiyinda** keladi va biz hisoblagan summa bilan solishtiriladi —
formadan yoki so'rovdan kelgan raqamga ishonilmaydi. `create` va
`confirm` idempotent: javob yo'qolib, Uzum so'rovni takrorlasa, tarif
ikki marta uzaymaydi.

To'lov sahifasiga havola kodda qotirilmagan: `UZUM_CHECKOUT_URL` ga
Uzum bergan manzil `{payment_id}` va `{amount}` o'rinlari bilan
qo'yiladi. Sozlanmasa tarif sahifasida Uzum tugmasi umuman
ko'rinmaydi.

**Bitta ochiq savol.** developer.uzumbank.uz shu ishlash muhitidan
ochilmadi, shuning uchun protokol ikkita mustaqil ochiq manbadan qayta
tiklandi va ular asosiy qismida bir-biriga mos tushdi. Ammo `10007` va
`10008` xato kodlarining ma'nosida manbalar qarama-qarshi. Rasmiy
hujjat qo'lga tushganda `src/lib/uzum.ts` dagi `UZUM_ERROR` blokini
tekshirish kifoya — qolgan kod tegmaydi.

### Kartaga o'tkazma

Provayder ulanmagan bo'lsa ham to'lash mumkin: foydalanuvchi kartaga
o'tkazadi va chek raqamini qoldiradi, xodim `/admin/tolovlar` da
tasdiqlaydi. Tarif chek yuborilganda emas, **tasdiqlanganda** ochiladi.

Xodim huquqi — `User.isAdmin`. Sahifa boshqalarga 404 qaytaradi, ya'ni
borligi ham bilinmaydi.

### Avtomatik yechish yo'q

Kartadan takroriy pul yechish (Payme Subscribe API, Click card token)
ataylab qo'shilmagan: obuna o'zi yangilanib turishi foydalanuvchini
ogohlantirmaydi, jurnal esa ishonch ustiga quriladi. Har safar
foydalanuvchi o'zi to'laydi.

## Testlar

```bash
npm test
```

241 ta test: hisob-kitob (`stats`), chuqur tahlil (`analytics`),
ogohlantirish qoidalari (`alerts`), skrinshot tekshiruvi (`extract`),
hafta chegaralari va PDF (`report`), taklif kodi va rollar (`mentor`),
narx va muddat (`billing`), to'lov protokollari (`payments`, `uzum`),
lug'atlar to'liqligi (`i18n`), urinishlar chegarasi (`ratelimit`), fayl saqlagichi (`storage`),
parolni tiklash kalitlari (`reset`),
namuna ma'lumot generatori (`demo-data`),
boshlash qadamlari (`onboarding`).
Test bazaga ulanmaydi — hammasi sof funksiyalar ustida, shuning uchun
bir soniyada tugaydi.

Kunlik qoidalar "hozir" ga bog'liq, shuning uchun `alerts` testlarida vaqt
qotirilgan (`vi.setSystemTime`) — aks holda test UTC kuni endigina
boshlangan payt yiqilardi.

Lint va tiplar alohida:

```bash
npm run lint       # eslint (flat config)
npm run typecheck  # tsc --noEmit
```

`.github/workflows/ci.yml` har push da shu uchalasini va yig'ishni
tekshiradi. CI da Redis ham ko'tariladi, shuning uchun chegaraning
Redis yo'li ham sinaladi.

## Til

Uch til: o'zbek (standart), rus, ingliz. Tanlov yon paneldagi
`UZ / RU / EN` tugmalarida — u bir yil yashaydigan cookie'ga va
foydalanuvchi yozuviga saqlanadi, shuning uchun boshqa qurilmada ham
o'sha tilda ochiladi.

```
src/lib/i18n/
  index.ts     LOCALES, Dict tipi, fill() — {slot} ni qiymat bilan almashtiradi
  uz.ts        Manba lug'at. Dict tipi shundan olinadi.
  ru.ts        `export const ru: Dict = { … }`
  en.ts        `export const en: Dict = { … }`
  server.ts    getLocale / getDict / getI18n — cookie, keyin foydalanuvchi yozuvi
  labels.ts    Bazada saqlangan qiymatlarni ko'rsatishda o'giradi
src/components/i18n/
  Provider.tsx      Klient komponentlar uchun useD() va useLocale()
  LocaleSwitch.tsx  UZ / RU / EN tugmalari
```

**Tarjima tushib qolishi mumkin emas.** `Dict` tipi `typeof uz` dan
olinadi, `ru` va `en` esa `: Dict` deb e'lon qilingan — bitta kalit
yetishmasa `next build` yiqiladi, ish vaqtida emas. Test esa uchala
lug'atda kalitlar to'liq mosligini, bo'sh qiymat yo'qligini va
`{slot}` lar bir xil ekanini tekshiradi.

**Saqlangan ma'lumot tilga bog'liq emas.** Sessiya nomi (`Nyu-York`),
odat kalitlari (`habit1…habit5`), dastur kaliti (`HYPER_GROWTH`) bazada
o'zgarmas ko'rinishda turadi va faqat ekranga chiqishda o'giriladi
(`labels.ts`, `habitLabels`). Shuning uchun til almashtirilsa eski
yozuvlar joyida qoladi.

Ro'yxatdan o'tishda beriladigan boshlang'ich setuplar va checklist esa
o'sha paytdagi tilda **yoziladi** — ular foydalanuvchining o'z ma'lumoti
bo'lib qoladi, keyin tahrirlanadi.

**AI javoblari ham shu tilda.** Psixologiya suhbati, iqtisodiy tahlil va
skrinshotdagi `note` maydoni tizim ko'rsatmasiga qo'shilgan
`JAVOB TILI` qatori orqali interfeys tiliga bog'lanadi.

**Sana va raqam.** Sanalar `Intl.DateTimeFormat` orqali to'liq holda
formatlanadi — oy nomini qo'lda ulash rus tilida kelishikni buzardi.
Raqamlar esa uchala tilda bir xil: mingliklar bo'shliq bilan, kasr nuqta
bilan — treyder terminalda ko'rib o'rgangan ko'rinish.

**PDF va kirill.** pdfkit ning ichki shriftlari WinAnsi kodlashida
ishlaydi, unda kirill harflari yo'q. Shuning uchun hisobotga
**DejaVu Sans** (`public/fonts/`, Bitstream Vera litsenziyasi)
joylanadi — pdfkit uni faqat ishlatilgan harflar bo'yicha qisqartirib
qo'yadi, fayl og'irlashmaydi. Shu bilan matematik minus `−` va strelka
`→` ham to'g'ri chiqadi.

## Skrinshotlar qayerda saqlanadi

Ikki saqlagich, tanlov `S3_BUCKET` ga qarab:

| Sozlama | Fayl qayerda | Qachon |
| --- | --- | --- |
| `S3_BUCKET` bo'sh | `<UPLOAD_DIR>/<kalit>` | oddiy server yoki VPS |
| `S3_BUCKET` qo'yilgan | obyekt saqlagichda | bir nechta nusxa yoki serverless |

S3 varianti S3 ning o'zi bilan ham, **Cloudflare R2**, **Backblaze B2**
va **MinIO** bilan ham ishlaydi — protokol bitta, farqi faqat
`S3_ENDPOINT` da. Imzolash `aws4fetch` zimmasida (kichik kutubxona,
oddiy `fetch` ustida) va u faqat S3 sozlangan bo'lsa yuklanadi.

Bazada ikkala holatda ham bitta narsa turadi: kalit
`<userId>/<uuid>.<kengaytma>`. Shuning uchun saqlagichni keyin
almashtirsangiz yozuvlar buzilmaydi — faqat eski fayllarni ko'chirish
kerak bo'ladi.

Skrinshotlar ochiq URL bilan berilmaydi: `/api/screenshot/<kalit>`
avval kalit so'rovchining o'ziniki ekanini tekshiradi.

**Fayl turi ikki marta tekshiriladi.** Avval brauzer aytgan
`content-type`, keyin faylning haqiqiy sarlavha baytlari
(`sniffImage`). Nomini va `content-type` ni o'zgartirish oson,
sarlavha baytlarini esa yo'q — shuning uchun ishonch shularga.

## Urinishlar chegarasi

Chegara ikki joyda sanalishi mumkin, tanlov `REDIS_URL` ga qarab:

| `REDIS_URL` | Hisoblagich | Qachon yetarli |
| --- | --- | --- |
| bo'sh | jarayon xotirasida | bitta serverda ishlaydigan ilova |
| qo'yilgan | Redis'da | bir nechta nusxa, yuk taqsimlagich ortida |

Xotiradagi variantning kamchiligi shunda: har nusxa o'z hisobini
yuritadi, ya'ni uch nusxada "15 daqiqada 10 urinish" amalda 30 ta
bo'lib qoladi. Redis bilan hisob umumiy.

Sanash `INCR` + `PEXPIRE` ni **bitta Lua skriptida** bajaradi — ikki
buyruq orasida kalit muddatsiz qolib ketmasligi uchun.

Redis javob bermasa ilova yiqilmaydi va chegara butunlay ochilib ham
ketmaydi: shu so'rov xotiradagi hisoblagichga tushadi. Himoya
kuchsizlanadi, lekin yo'qolmaydi. Ulanib bo'lmasa keyingi urinish
10 soniyadan keyin — har so'rovda qayta ulanishga urinilmaydi.

Redis bilan ishlaydigan testlar Redis topilmasa o'tkazib yuboriladi:

```bash
redis-server --port 6399 --daemonize yes
REDIS_TEST_URL=redis://127.0.0.1:6399 npm test
```

## Vaqt mintaqasi

Kun chegarasi, kalendar katagi, kunlik limit va "bugun" tushunchasi
foydalanuvchi mintaqasida hisoblanadi, server qayerda turishidan qat'i
nazar (`src/lib/tz.ts`). Mintaqa `Hisoblar` sahifasida tanlanadi,
standarti — `Asia/Tashkent`.

Sessiya (Osiyo / London / Overlap / Nyu-York) esa bundan mustasno: u
bozor vaqtiga bog'liq, shuning uchun UTC da aniqlanadi.

## Birinchi kirish

Yangi foydalanuvchi bo'sh panelga tushmaydi: yuqorida uchta qadamdan
iborat kartochka turadi — hisobni sozlash, birinchi savdoni yozish,
kundalikka bir qator qo'shish.

Qadamlar **haqiqiy holatga qarab** belgilanadi, tugma bosilishiga
emas: savdo bor-yo'qligi, kundalik yozuvi bor-yo'qligi. Hisob
sozlangani taxminan aniqlanadi — broker yozilgan yoki balans
standartdan farq qilsa. Bu taxmin, lekin zarari yo'q: bu ro'yxat,
to'siq emas.

Kartochka uchala qadam bajarilgach yoki uchtadan ortiq savdo yozilgach
**o'zi yo'qoladi** — yopish tugmasi kerak emas.

## Ilova belgisi va telefonga o'rnatish

`src/app/icon.png` — brend belgisidan yasalgan kvadrat ikonka: to'q
fon, oq halqa va ko'k nuqta. 16 pikselda ham ajralib turadi.

`manifest.webmanifest` avtomatik yaratiladi, shuning uchun ilovani
telefon ekraniga o'rnatib qo'yish mumkin. O'rnatilgan ilova `/panel`
dan ochiladi — o'rnatgan odam allaqachon kirgan bo'ladi.

## Xatolar va xodim paneli

### Xatolar qayerga yoziladi

Ikki joyga, va tartibi muhim:

1. **stderr** — har doim va birinchi, bitta JSON qator ko'rinishida.
   Docker, systemd yoki jurnal yig'adigan har qanday vosita buni
   o'qiydi. Bu hech qachon yiqilmaydi.
2. **Bazaga** — imkon bo'lsa. Shu bilan xatolarni serverga kirmasdan,
   `/admin/xatolar` sahifasidan ko'rish mumkin.

Baza yiqilganda ham birinchi yo'l ishlaydi — aynan o'sha paytda xabar
eng kerak bo'ladi. Yozuv hech qachon asosiy ishni to'xtatmaydi.

Brauzerdagi xato chegarasi ham serverga xabar beradi: aks holda mijoz
tomonidagi xato hech qayerda qayd etilmay qolardi. Yozuvlar 30 kun
saqlanadi va xodim paneli ochilganda eskilari tozalanadi — alohida
cron kerak emas.

### Xodim paneli

`/admin` — faqat `isAdmin` belgisi bor foydalanuvchiga. Boshqalar
uchun sahifa **umuman yo'q** (404), borligi ham bilinmaydi.

Uch bo'lim: umumiy ko'rinish, qo'lda to'lovlar va xatolar. Umumiy
ko'rinishda foydalanuvchilar soni (yangi, sinovda, to'lagan, namuna),
tushum (jami, shu oy, tasdiq kutayotgan, oylar kesimi), faollik va
xatolar sanog'i turadi.

Panelda **shaxsiy ma'lumot ko'rsatilmaydi** — savdo ham, kundalik ham,
suhbat ham. Xodim biznes sanog'ini ko'radi, foydalanuvchining ichini
emas.

## Huquqiy sahifalar

Ikkita ochiq sahifa: `/oferta` (ommaviy oferta) va `/maxfiylik`
(maxfiylik siyosati). Uchala tilda, ochiq sahifa pastidan va
`sitemap.xml` dan havola bor.

Matn ilova haqiqatan nima qilishiga asoslangan: qaysi ma'lumot
yig'iladi, qaysi uchinchi tomon xizmatlari ishlatiladi (Anthropic,
SMTP, Payme/Click/Uzum, iqtisodiy kalendar provayderi), nima
**yig'ilmaydi** (broker ma'lumoti, karta raqami) va foydalanuvchi
qanday huquqqa ega (JSON yuklab olish, hisobni o'chirish).

**Rekvizitlar kodda emas.** Firma nomi, STIR, manzil va aloqa `.env`
dan olinadi (`LEGAL_COMPANY`, `LEGAL_STIR`, `LEGAL_ADDRESS`,
`LEGAL_EMAIL`, `LEGAL_PHONE`). To'ldirilmagan bo'lsa sahifada sariq
ogohlantirish chiqadi — bo'sh joy jim qolib ketmasligi uchun.

Hujjat sanasi `src/lib/legal.ts` da (`LEGAL_UPDATED`) turadi: matn
o'zgarganda uni qo'lda yangilash kerak, aks holda hujjat har kuni
o'zgargandek ko'rinardi.

> ⚠️ Bu matnlar dasturchi tomonidan yozilgan va **yurist ko'rigidan
> o'tkazilishi kerak**, ayniqsa O'zbekiston qonunchiligiga oid
> qismlar. Payme va Click merchant kabinetini ochishda ular odatda shu
> ikki sahifaning saytda turishini talab qiladi.

## Demo rejim

Ochiq sahifadagi «Namunani ko'rish» tugmasi ro'yxatdan o'tishsiz
ilovani to'la holda ochadi: uch oylik savdolar, setuplar, kundalik
yozuvlari, bitta ochiq pozitsiya va backtest jurnali.

Har bosishda **yangi** hisob yaratiladi — mehmon ilovani istagancha
o'zgartiradi va boshqalarga xalaqit bermaydi. Parol tasodifiy va hech
qayerda saqlanmaydi: bu hisobga qaytib kirishning yo'li yo'q, u faqat
o'sha brauzerdagi sessiya bilan yashaydi va **24 soatdan keyin
o'chadi**. Tozalash uchun alohida cron kerak emas — har yangi demo
ochilganda muddati o'tganlaridan bir nechtasi o'chiriladi.

Ilova ichida doimiy sariq lenta turadi va uni yopib bo'lmaydi: mehmon
bu raqamlar o'ylab topilganini har ekranda ko'rib tursin.

**Namuna hisobda nimalar yopiq.** Psixologiya suhbati, skrinshotdan
o'qish va brifingdagi iqtisodiy tahlil — uchalasi ham AI chaqiradi.
Har bosishda yangi hisob ochilgani uchun "hisob bo'yicha chegara"
ma'nosini yo'qotardi: bot demo ochib, chegarani nolga tushirib,
cheksiz chaqiruv qilishi mumkin edi. Shuningdek to'lov va hisobotni
pochtaga jo'natish ham yopiq — namuna hisobdan begona manzilga xat
ketmasligi kerak.

Qimmat chaqiruvlarga chegara endi **ikki tomondan**: hisob bo'yicha
ham, IP bo'yicha ham.

Ma'lumotning o'zi `src/lib/demo-data.ts` da yaratiladi va
`prisma/seed.ts` ham o'shani ishlatadi — ya'ni manba bitta. Generator
determinlashgan (bir xil urug' → bir xil ma'lumot), shuning uchun u
to'liq sinaladi: sanalar kelajakda emas, dam olish kunlarida savdo
yo'q, win rate va qoidaga rioya 100% emas, zarar ham bor.

## Ochiq sahifa

`/` — kirmagan mehmon uchun sahifa: mahsulot nima qilishi, **nima
qilmasligi**, tariflar, savollar va ro'yxatdan o'tish tugmasi. Kirgan
foydalanuvchi bu yerda ushlanib qolmaydi — `/panel` ga o'tkaziladi.

Sahifa uchala tilda ishlaydi va til tugmalari o'ng yuqorida turadi.
Sarlavha, tavsif va Open Graph teglari ham tanlangan tilda — havola
Telegram yoki ijtimoiy tarmoqda ulashilganda o'sha tilda ko'rinadi.

**Va'da berilmaydi.** «Nima yo'q — ataylab» bo'limi alohida turadi va
to'rtta narsani ochiq aytadi: savdo signali yo'q, bozor bashorati yo'q,
broker hisobiga ulanish yo'q, hech narsa bloklanmaydi. Pastdagi izohda
savdo zarar keltirishi mumkinligi ham yozilgan.

Qahramon bo'limidagi panel — **skrinshot emas**, ilovaning o'z ranglari
bilan chizilgan namuna; raqamlari shartli, haqiqiy natija sifatida
ko'rsatilmaydi.

`robots.txt` va `sitemap.xml` avtomatik yaratiladi: faqat ochiq
sahifalar indekslanadi, ilova ichi esa yopiq.

## Hisob xavfsizligi

### Parolni tiklash

Kirish sahifasidagi «Parolni unutdingizmi?» pochtaga bir martalik
havola jo'natadi. Muhim tomonlari:

- **Kalitning o'zi saqlanmaydi.** Bazada faqat SHA-256 xeshi turadi —
  bazani ko'rgan odam ham havolani tiklay olmaydi.
- **Bir marta ishlaydi va 1 soat amal qiladi.** Ishlatilgach o'sha
  foydalanuvchining qolgan ochiq kalitlari ham kuchdan qoladi.
- **Hisob bor-yo'qligi oshkor qilinmaydi.** Manzil topilsa ham,
  topilmasa ham javob bir xil — aks holda bu forma hisoblar ro'yxatini
  yig'ish vositasiga aylanardi.
- Chegara ikki tomondan: bitta IP dan soatiga 10 ta, bitta manzil uchun
  soatiga 5 ta.
- Havola sahifasi kalitni **ochilganda tekshirmaydi** — faqat shaklini
  qaraydi. Tekshiruv forma yuborilganda bo'ladi, shunda havolani ochgan
  odam kalit yaroqli yoki yaroqsizligini bilib ololmaydi.

### Sessiyalar

Foydalanuvchida `sessionVersion` maydoni bor va u sessiya belgisiga
yoziladi. Parol almashganda raqam bittaga oshadi — shu zahoti boshqa
qurilmalardagi eski belgilar ishlamay qoladi. Parolni o'zgartirgan
qurilma esa yangi belgi oladi, ya'ni chiqib ketmaydi.

Shuning uchun parol o'g'irlangan bo'lsa, uni almashtirish yetarli:
bosqinchining ochiq sessiyasi ham o'chadi.

### Ma'lumotni yuklab olish

`Sozlamalar → Ma'lumotni yuklab olish` butun jurnalni bitta JSON
faylda beradi: hisoblar, savdolar (checklist bilan), setuplar,
instrumentlar, kundalik, ogohlantirishlar va to'lovlar tarixi.

Psixologiya suhbati **ataylab kiritilmaydi** — u eng shaxsiy yozuv va
uni fayl sifatida tarqatish foydalanuvchiga zarar qilishi mumkin.
Parol xeshi ham berilmaydi.

### Hisobni o'chirish

Tasdiq uchun pochta manzili qo'lda yoziladi. O'chirilganda bog'liq
hamma narsa ketadi — shu jumladan mentor aloqalari va ulardagi
yozishmalar. Shuning uchun sahifada avval ma'lumotni yuklab olish
taklif qilinadi.

## Serverga qo'yish

Eng qisqa yo'l — Docker. Ilova, PostgreSQL va Redis bitta buyruq bilan
ko'tariladi:

```bash
cp .env.example .env
#   AUTH_SECRET — openssl rand -base64 32
#   APP_URL     — https://onebofx.uz

docker compose up -d --build
```

Nima bo'ladi: `db` va `redis` ko'tariladi, `migrate` xizmati jadvallarni
sxemaga moslab tugaydi, keyin `app` ishga tushadi. Ilova
`http://<server>:3000` da.

`.env` dagi `DATABASE_URL` va `REDIS_URL` bu yerda ishlatilmaydi —
ular kompyuterda ishlash uchun va konteyner ichida `localhost` butunlay
boshqa narsani bildiradi. Manzilni compose o'zi quradi
(`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` dan). Tashqi baza
yoki Redis kerak bo'lsa `COMPOSE_DATABASE_URL` va `COMPOSE_REDIS_URL`
qo'yiladi.

| Xizmat | Vazifasi |
| --- | --- |
| `app` | Next ilovasi (`output: standalone`, root ostida emas) |
| `db` | PostgreSQL 16, ma'lumot `db-data` hajmida |
| `redis` | Urinishlar chegarasi uchun, diskka yozmaydi |
| `migrate` | Bir martalik `prisma db push`, keyin tugaydi |

Skrinshotlar `uploads` hajmida qoladi. S3 sozlansa (yuqoridagi bo'limga
qarang) bu hajm kerak bo'lmaydi.

### HTTPS va domen

Konteyner 3000-portni beradi; TLS va domen tashqarida — Caddy yoki
nginx orqali. Caddy bilan eng qisqasi (sertifikat o'zi olinadi):

```
onebofx.uz {
    reverse_proxy 127.0.0.1:3000
}
```

`APP_URL` ni domenga qo'ying — to'lovdan keyin qaytish havolasi
shundan quriladi.

### Sog'liq tekshiruvi

`GET /api/health` uchta holatni qaytaradi:

```json
{ "status": "ok", "database": "up", "redis": "off", "ms": 3 }
```

- **baza yiqilsa** — HTTP 503 (bazasiz ilovadan foyda yo'q)
- **Redis yo'q yoki javob bermasa** — HTTP 200, `status: "degraded"`;
  chegara xotirada ishlayveradi
- javobda sozlama ham, versiya ham, xato matni ham yo'q — bu manzil
  ochiq turadi

Docker shu manzilga qarab konteynerning tirikligini biladi.

### Zaxira nusxa

Baza — kuniga bir marta:

```bash
docker compose exec -T db pg_dump -U onebo onebofx | gzip > backup-$(date +%F).sql.gz
```

Skrinshotlar diskda bo'lsa `uploads` hajmi ham nusxalanadi; S3 da bo'lsa
bu ish saqlagich tomonda.

### Yangilash

```bash
git pull
docker compose up -d --build
```

`migrate` xizmati sxema o'zgarishini o'zi qo'llaydi.

## Xavfsizlik

- Parollar `bcrypt` bilan, sessiya `httpOnly` cookie'dagi JWT.
- Parol almashsa eski sessiyalar kuchdan qoladi (`sessionVersion`).
- Parolni tiklash kalitining faqat xeshi saqlanadi; kalit bir marta
  ishlaydi va 1 soat amal qiladi.
- Kirishga 15 daqiqada 10 urinish, ro'yxatdan o'tishga soatiga 5 ta
  (`src/lib/ratelimit.ts`). `REDIS_URL` qo'yilsa hisoblagich Redis'da,
  aks holda jarayon xotirasida — «Urinishlar chegarasi» bo'limida batafsil.
- `next.config.ts` da CSP, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy` va `Permissions-Policy`.
- Skrinshotlar ochiq URL bilan berilmaydi; fayl turi brauzer aytganiga
  emas, haqiqiy sarlavha baytlariga qarab tekshiriladi.
- Hisob o'chirilganda uning skrinshotlari ham saqlagichdan o'chadi
  (disk yoki S3) — baza yozuvlari bilan birga.
- AI chaqiradigan bo'limlarda chegara hisob bo'yicha ham, IP bo'yicha
  ham; namuna hisobda ular butunlay yopiq.
- Konteyner root ostida ishlamaydi (`nextjs` foydalanuvchisi), baza va
  Redis portlari tashqariga ochilmaydi.
- `npm audit` — 0 ta ogohlantirish.

## Nima qolgan

- Uzum Bank protokoli ikkita ochiq manbadan qayta tiklangan — rasmiy
  hujjat ochilmagani uchun ikki xato kodining ma'nosi tasdiqlanishi kerak
  (`src/lib/uzum.ts` dagi izoh).

To'liq reja — mahsulot spetsifikatsiyasi hujjatida.
