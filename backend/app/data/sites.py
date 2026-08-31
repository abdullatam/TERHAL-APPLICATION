"""Curated knowledge base for Ma'an governorate sites.

Used to ground both the itinerary generator and the camera-based AI tour
guide so narration is specific to the governorate instead of relying on
the model's general (and sometimes generic/hallucinated) knowledge.
"""
from app.models import Site, SiteId

SITES: dict[SiteId, Site] = {
    SiteId.petra: Site(
        id=SiteId.petra,
        name_en="Petra",
        name_ar="البتراء",
        description_en=(
            "Nabataean city carved into rose-red sandstone cliffs, c. 3rd century BCE. "
            "Key landmarks: the Siq entrance canyon, the Treasury (Al-Khazneh), the Street "
            "of Facades, the Royal Tombs, and the Monastery (Ad-Deir) reached via ~900 steps."
        ),
        description_ar=(
            "مدينة نبطية منحوتة في منحدرات الحجر الرملي الوردي، يعود تاريخها إلى القرن الثالث "
            "قبل الميلاد. أبرز معالمها: السيق، الخزنة، شارع الواجهات، المدافن الملكية، والدير."
        ),
        avg_visit_minutes=240,
        accessibility_notes="Siq and main trail are wheelchair-passable with assistance; Monastery climb (~900 steps) is not.",
    ),
    SiteId.little_petra: Site(
        id=SiteId.little_petra,
        name_en="Little Petra (Siq al-Barid)",
        name_ar="البتراء الصغيرة (سيق البريد)",
        description_en=(
            "A smaller Nabataean satellite settlement north of Petra, believed to have served "
            "as a suburb or caravan stop. Notable for painted ceiling frescoes in one chamber."
        ),
        description_ar="مستوطنة نبطية أصغر شمال البتراء، يُعتقد أنها كانت ضاحية أو محطة للقوافل.",
        avg_visit_minutes=60,
        accessibility_notes="Mostly flat, narrow passage; not wheelchair accessible.",
    ),
    SiteId.shobak_castle: Site(
        id=SiteId.shobak_castle,
        name_en="Shobak Castle (Montreal)",
        name_ar="قلعة الشوبك (مونتريال)",
        description_en=(
            "Crusader fortress built in 1115 CE by Baldwin I, later captured by Saladin. "
            "Contains inscriptions, a church, and a deep rock-cut staircase to a spring."
        ),
        description_ar="قلعة صليبية بناها بلدوين الأول عام 1115م، استولى عليها صلاح الدين لاحقاً.",
        avg_visit_minutes=90,
        accessibility_notes="Uneven ruins terrain; limited accessibility, no paved paths.",
    ),
    SiteId.wadi_musa: Site(
        id=SiteId.wadi_musa,
        name_en="Wadi Musa Town",
        name_ar="بلدة وادي موسى",
        description_en=(
            "The modern town adjacent to Petra, home to local markets, Petra Kitchen "
            "cooking experiences, and the Petra Museum."
        ),
        description_ar="البلدة الحديثة المجاورة للبتراء، تضم أسواقاً محلية ومطعم بيت الطبخ ومتحف البتراء.",
        avg_visit_minutes=120,
        accessibility_notes="Paved town streets, generally accessible.",
    ),
    SiteId.wadi_trails: Site(
        id=SiteId.wadi_trails,
        name_en="Wadi Trail Network",
        name_ar="شبكة مسارات الوديان",
        description_en=(
            "Hiking trails including Wadi Farasa, Wadi Sabra, and Wadi al-Mudhlim, offering "
            "scenic and less-crowded alternatives to the main Petra trail."
        ),
        description_ar="مسارات مشي تشمل وادي فراسة ووادي سبرا ووادي المذلم، بديل أقل ازدحاماً.",
        avg_visit_minutes=150,
        accessibility_notes="Uneven natural terrain; not accessible for reduced-mobility visitors.",
    ),
    SiteId.udhruh: Site(
        id=SiteId.udhruh,
        name_en="Udhruh",
        name_ar="أذرح",
        description_en=(
            "A town 15 km east of Petra that grew around a Roman legionary fortress built "
            "after Rome annexed the Nabataean kingdom in 106 CE; later reused as an Ottoman "
            "pilgrim station on the Hajj road to Mecca. Excavations continue to uncover its "
            "role as a desert gateway linking Petra to regional trade and water networks."
        ),
        description_ar=(
            "بلدة تبعد 15 كم شرق البتراء نشأت حول حصن روماني بُني بعد ضم روما للمملكة النبطية "
            "عام 106م، واستُخدمت لاحقاً كمحطة للحجاج العثمانيين على طريق الحج إلى مكة."
        ),
        avg_visit_minutes=60,
        accessibility_notes="Open ruins site with uneven ground; not wheelchair accessible.",
    ),
}
