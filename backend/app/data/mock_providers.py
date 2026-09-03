"""Mock advisor accounts so the finder map and booking flow have real supply.

These are invented people, not real Ma'an guides — the names, rates and
positions are placeholders for a demo, and `photo_url` is deliberately left
empty so the UI draws an initial instead of putting a stranger's face on a
fabricated profile. Everything else mirrors the shape a real provider record
would take, including the verification fields judges are told to look for
(`verified`, `welfare_compliant`, `accessibility_tags`).

Positions are scattered around the places advisors actually work: the Petra
gate and Wadi Musa town, plus Little Petra, Shobak and Udhruh.
"""
from app.models import Language, Provider, ProviderRole

MOCK_PROVIDERS: list[Provider] = [
    Provider(
        id="prov-1",
        name="Ahmad Bdoul",
        role=ProviderRole.guide,
        landmark_ids=["PET", "LPET", "PET-TRE", "PET-MON", "PET-SIQ"],
        languages=[Language.ar, Language.en],
        rating=4.8,
        verified=True,
        welfare_compliant=True,
        accessibility_tags=["wheelchair-friendly-briefing"],
        lat=30.3221, lon=35.4520, hourly_rate_jod=14.0,
        bio_en="Bdoul family guide, born in the caves above the Treasury. Fifteen "
               "years walking the Siq, and happiest explaining Nabataean water "
               "engineering to anyone who will stand still long enough.",
        bio_ar="مرشد من عائلة البدول، وُلد في كهوف أعلى الخزنة. خمسة عشر عاماً من "
               "العمل في السيق، ولا شيء يسعده أكثر من شرح هندسة المياه النبطية.",
    ),
    Provider(
        id="prov-2",
        name="Sara Nawafleh",
        role=ProviderRole.guide,
        landmark_ids=["SHB", "WMU", "UDH"],
        languages=[Language.en],
        rating=4.5,
        verified=True,
        welfare_compliant=False,
        accessibility_tags=[],
        lat=30.5310, lon=35.5605, hourly_rate_jod=12.0,
        bio_en="Archaeology graduate specialising in the Crusader and Ottoman "
               "layers at Shobak. Runs the castle's rock-cut spring staircase "
               "tour when the light is right.",
        bio_ar="خريجة آثار متخصصة في الطبقات الصليبية والعثمانية في الشوبك، وتقود "
               "جولة الدرج الصخري المؤدي إلى النبع داخل القلعة.",
    ),
    Provider(
        id="prov-3",
        name="Khalid Amarin",
        role=ProviderRole.driver,
        landmark_ids=["PET", "SHB", "WMU", "LPET", "UDH", "AJF"],
        languages=[Language.ar, Language.en],
        rating=4.6,
        verified=True,
        welfare_compliant=False,
        accessibility_tags=["wheelchair-accessible-van"],
        lat=30.3240, lon=35.4790, hourly_rate_jod=15.0,
        bio_en="Wheelchair-accessible van with a ramp and four passenger seats. "
               "Covers the whole governorate including the long run east to Al-Jafr.",
        bio_ar="حافلة مجهّزة بمنحدر للكراسي المتحركة وأربعة مقاعد، تغطي المحافظة "
               "كاملة بما فيها الطريق الطويل شرقاً إلى الجفر.",
    ),
    Provider(
        id="prov-4",
        name="Fatima Hasanat",
        role=ProviderRole.vendor,
        landmark_ids=["WMU", "USH"],
        languages=[Language.ar],
        rating=4.9,
        verified=True,
        welfare_compliant=False,
        accessibility_tags=[],
        lat=30.3208, lon=35.4812, hourly_rate_jod=8.0,
        bio_en="Handwoven textiles and silver work from a workshop in Wadi Musa. "
               "Will open the workshop for visitors who want to see the loom.",
        bio_ar="منسوجات يدوية وأشغال فضية من ورشة في وادي موسى، وتفتح الورشة "
               "للزوار الراغبين في مشاهدة النول.",
    ),
    Provider(
        id="prov-5",
        name="Petra Horse & Cart Co-op",
        role=ProviderRole.animal_operator,
        landmark_ids=["PET", "PET-SIQ"],
        languages=[Language.ar, Language.en],
        rating=4.2,
        verified=True,
        welfare_compliant=True,
        accessibility_tags=["assisted-transfer"],
        lat=30.3229, lon=35.4560, hourly_rate_jod=9.0,
        bio_en="Cart transfers along the Siq, operating to the welfare standard: "
               "shaded rest, water on the hour, and capped daily trips per animal.",
        bio_ar="نقل بالعربات عبر السيق وفق معايير الرفق بالحيوان: ظل للراحة، وماء "
               "كل ساعة، وحد أقصى لعدد الرحلات اليومية لكل حيوان.",
    ),
    Provider(
        id="prov-6",
        name="Yousef Twaissi",
        role=ProviderRole.guide,
        landmark_ids=["PET", "PET-MON", "PET-HPS", "JHR"],
        languages=[Language.ar, Language.en],
        rating=4.7,
        verified=True,
        welfare_compliant=False,
        accessibility_tags=[],
        lat=30.3350, lon=35.4400, hourly_rate_jod=13.0,
        bio_en="High-route specialist: the Monastery stairs, the High Place of "
               "Sacrifice, and the long walk out to Jebel Harun. Sets a slow pace "
               "and carries extra water.",
        bio_ar="متخصص بالمسارات المرتفعة: درج الدير، والمذبح، والمسير الطويل إلى "
               "جبل هارون. يمشي بوتيرة هادئة ويحمل ماءً إضافياً.",
    ),
    Provider(
        id="prov-7",
        name="Rania Salameh",
        role=ProviderRole.guide,
        landmark_ids=["PET", "PET-CHU", "PET-GRT", "PET-TWL", "OPM"],
        languages=[Language.en, Language.ar],
        rating=4.9,
        verified=True,
        welfare_compliant=False,
        accessibility_tags=["step-free-route-knowledge"],
        lat=30.3300, lon=35.4440, hourly_rate_jod=15.0,
        bio_en="Byzantine and late-antique Petra — the church mosaics, the Great "
               "Temple excavations, and what the burnt papyri say about the city "
               "in the 6th century.",
        bio_ar="متخصصة في البتراء البيزنطية: فسيفساء الكنيسة، وحفريات المعبد الكبير، "
               "وما ترويه أوراق البردي المتفحمة عن المدينة في القرن السادس.",
    ),
    Provider(
        id="prov-8",
        name="Mohammad Hasanat",
        role=ProviderRole.driver,
        landmark_ids=["PET", "WMU", "LPET", "BEI", "USH"],
        languages=[Language.ar],
        rating=4.4,
        verified=True,
        welfare_compliant=False,
        accessibility_tags=[],
        lat=30.3435, lon=35.4551, hourly_rate_jod=11.0,
        bio_en="Seven-seat car based in Umm Sayhoun. Short hops between Petra, "
               "Little Petra and Beidha, and airport runs at short notice.",
        bio_ar="سيارة بسبعة مقاعد مقرها أم صيحون، للتنقلات القصيرة بين البتراء "
               "والبتراء الصغيرة والبيضا، ورحلات المطار عند الطلب.",
    ),
    Provider(
        id="prov-9",
        name="Layla Mara'iya",
        role=ProviderRole.guide,
        landmark_ids=["LPET", "BEI", "BAJ", "BAS"],
        languages=[Language.en, Language.ar],
        rating=4.6,
        verified=True,
        welfare_compliant=False,
        accessibility_tags=[],
        lat=30.3755, lon=35.4515, hourly_rate_jod=12.0,
        bio_en="Neolithic sites specialist — Beidha, Ba'ja and Basta. Explains why "
               "a 9,000-year-old village floor plan is worth the climb.",
        bio_ar="متخصصة بمواقع العصر الحجري الحديث: البيضا وبعجة وبسطة، وتشرح لماذا "
               "يستحق مخطط قرية عمرها 9000 عام عناء الصعود.",
    ),
    Provider(
        id="prov-10",
        name="Ibrahim Nawafleh",
        role=ProviderRole.driver,
        landmark_ids=["SHB", "UDH", "WMU", "AJF", "DAJ"],
        languages=[Language.ar, Language.en],
        rating=4.3,
        verified=True,
        welfare_compliant=False,
        accessibility_tags=[],
        lat=30.3312, lon=35.5940, hourly_rate_jod=13.0,
        bio_en="4x4 for the desert forts — Udhruh, Da'janiya and the tracks east "
               "that an ordinary car should not attempt.",
        bio_ar="سيارة دفع رباعي لحصون الصحراء: أذرح والدجانية والدروب الشرقية التي "
               "لا تصلح لها السيارات العادية.",
    ),
    Provider(
        id="prov-11",
        name="Nadia Bdoul",
        role=ProviderRole.vendor,
        landmark_ids=["PET", "USH"],
        languages=[Language.ar, Language.en],
        rating=4.8,
        verified=True,
        welfare_compliant=False,
        accessibility_tags=[],
        lat=30.3428, lon=35.4562, hourly_rate_jod=8.0,
        bio_en="Sand bottles and hand-painted ceramics made in Umm Sayhoun, sold "
               "without the middleman who usually takes the margin.",
        bio_ar="زجاجات الرمل والخزف المرسوم يدوياً من أم صيحون، تُباع مباشرة دون "
               "الوسيط الذي يأخذ الهامش عادة.",
    ),
    Provider(
        id="prov-12",
        name="Omar Falahat",
        role=ProviderRole.guide,
        landmark_ids=["PET", "PET-WMD", "PET-WFA", "PET-WSA"],
        languages=[Language.en, Language.ar],
        rating=4.7,
        verified=True,
        welfare_compliant=False,
        accessibility_tags=[],
        lat=30.3236, lon=35.4610, hourly_rate_jod=14.0,
        bio_en="Wadi routes — Muthlim, Farasa and the long day out to Sabra. "
               "Licensed for the flood-risk canyons that need a guide by law.",
        bio_ar="مسارات الوديان: المذلم وفراسة واليوم الطويل إلى سبرة. مرخّص "
               "للمضائق المعرّضة للسيول التي يشترط القانون مرافقة مرشد فيها.",
    ),
]
