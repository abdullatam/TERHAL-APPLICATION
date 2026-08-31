"""Knowledge base for every tourist attraction in Ma'an governorate — the
single source of truth for both the AI itinerary planner and the camera
guide's grounding data. Flat by design: no separate "site" grouping above
these rows, each attraction (whether a whole area like Petra or a single
monument like the Treasury) carries its own visit duration and
accessibility notes.

Sourced from Wikipedia/UNESCO/tourism-board research (facts paraphrased,
not copied verbatim); illustrated with CC-licensed Wikimedia Commons
photos where available. avg_visit_minutes/accessibility_notes for the
individual Petra monuments are reasonable estimates pending refinement
during the data phase (see DATA_PHASE.md).
"""
from app.models import Landmark

LANDMARKS: dict[str, Landmark] = {
    "petra": Landmark(
        id="petra",
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
    "siq": Landmark(
        id="siq",
        name_en="The Siq",
        name_ar="السيق",
        description_en=(
            "The main entrance gorge into Petra: a narrow, winding sandstone canyon about "
            "1.2 km long and, in places, just 3 metres wide. It was the Nabataeans' grand "
            "caravan approach, and votive niches carved into its walls once held sacred "
            "stones (baetyls)."
        ),
        description_ar=(
            "الممر الرئيسي المؤدي إلى البتراء: شق صخري ضيق ومتعرج يمتد نحو 1.2 كم، يضيق في "
            "بعض الأماكن إلى 3 أمتار فقط. كان المدخل الكبير للقوافل النبطية، وتحمل جدرانه "
            "تجاويف نذرية كانت تضم أحجاراً مقدسة."
        ),
        avg_visit_minutes=20,
        accessibility_notes="Wide enough for wheelchair passage with assistance in most sections; uneven sandy/paved surface.",
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Petra_Siq,_entrance_to_the_ancient_Nabatean_city_of_Petra,_Jordan.jpg",
        image_attribution="Photo by Vyacheslav Argenberg, CC BY 4.0, via Wikimedia Commons",
    ),
    "al_khazneh": Landmark(
        id="al_khazneh",
        name_en="Al-Khazneh (The Treasury)",
        name_ar="الخزنة",
        description_en=(
            "Petra's most famous monument, carved directly into a sandstone cliff face at "
            "the end of the Siq. Built as a royal tomb in the early 1st century AD under "
            "Nabataean king Aretas IV, its name comes from a local legend that treasure was "
            "hidden in the stone urn at its top."
        ),
        description_ar=(
            "أشهر معالم البتراء، منحوت مباشرة في واجهة صخرية عند نهاية السيق. بُني كمقبرة "
            "ملكية في مطلع القرن الأول الميلادي في عهد الملك النبطي الحارث الرابع، ويُنسب "
            "اسمها إلى أسطورة محلية عن كنز مخبأ في الجرة الحجرية أعلى الواجهة."
        ),
        avg_visit_minutes=20,
        accessibility_notes="Viewed from ground level at the end of the Siq; wheelchair-accessible approach.",
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Al-Khazneh_(The_Treasury),_Petra,_Jordan.jpg",
        image_attribution="Photo by Vyacheslav Argenberg, CC BY 4.0, via Wikimedia Commons",
    ),
    "street_of_facades": Landmark(
        id="street_of_facades",
        name_en="Street of Facades",
        name_ar="شارع الواجهات",
        description_en=(
            "A row of more than 40 tomb and house facades cut side-by-side into the cliffs "
            "just past the Treasury, believed to be the burial places of senior Nabataean "
            "officials from the late 1st century BC. Traces of paint still visible on one "
            "facade suggest they were once brightly coloured."
        ),
        description_ar=(
            "صف من أكثر من 40 واجهة لمدافن ومنازل منحوتة جنباً إلى جنب في المنحدرات بعد "
            "الخزنة مباشرة، يُعتقد أنها كانت مدافن لكبار المسؤولين النبطيين في أواخر القرن "
            "الأول قبل الميلاد."
        ),
        avg_visit_minutes=15,
        accessibility_notes="Viewable from the main path at ground level; generally accessible.",
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Street_of_Facades,_Petra.jpg",
        image_attribution="Photo by Bernard Gagnon, CC BY-SA 3.0, via Wikimedia Commons",
    ),
    "royal_tombs": Landmark(
        id="royal_tombs",
        name_en="Royal Tombs (Urn Tomb)",
        name_ar="المدافن الملكية (مقبرة الجرة)",
        description_en=(
            "A cluster of four monumental facades — the Urn, Silk, Corinthian, and Palace "
            "Tombs — cut high into the cliffside overlooking the city centre. The Urn Tomb, "
            "fronted by a large colonnaded courtyard, is thought to belong to the Nabataean "
            "king Malichus II, who died in 70 AD."
        ),
        description_ar=(
            "مجموعة من أربع واجهات ضخمة — مقبرة الجرة، والمقبرة الحريرية، والكورنثية، "
            "والقصر — منحوتة عالياً في المنحدر المطل على مركز المدينة. يُعتقد أن مقبرة "
            "الجرة تعود للملك النبطي مالكوس الثاني الذي توفي عام 70م."
        ),
        avg_visit_minutes=20,
        accessibility_notes="Viewable from the path below; the facades themselves are not climbable or accessible.",
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Urn_Tomb,_Petra_01.jpg",
        image_attribution="Photo by Bernard Gagnon, CC BY-SA 3.0, via Wikimedia Commons",
    ),
    "ad_deir": Landmark(
        id="ad_deir",
        name_en="Ad-Deir (The Monastery)",
        name_ar="الدير",
        description_en=(
            "A huge rock-cut facade, about 48 m wide and 47 m tall, reached by a climb of "
            "nearly 800 rock-cut steps from the city centre. Probably carved in the mid-1st "
            "century AD for a religious purpose, it earned its Arabic name 'the Monastery' "
            "from crosses later carved inside during its use as a Byzantine church."
        ),
        description_ar=(
            "واجهة صخرية ضخمة يبلغ عرضها نحو 48 متراً وارتفاعها 47 متراً، يُصعد إليها عبر "
            "نحو 800 درجة منحوتة في الصخر من مركز المدينة. يُرجّح أنها نُحتت في منتصف القرن "
            "الأول الميلادي لغرض ديني، واكتسبت اسمها 'الدير' من صلبان نُقشت داخلها لاحقاً "
            "حين استُخدمت ككنيسة في العصر البيزنطي."
        ),
        avg_visit_minutes=120,
        accessibility_notes="Reached via ~800 rock-cut steps; not accessible for reduced mobility.",
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Ad_Deir_(The_Monastery),_El_Deir,_Petra,_Jordan.jpg",
        image_attribution="Photo by Vyacheslav Argenberg, CC BY 4.0, via Wikimedia Commons",
    ),
    "qasr_al_bint": Landmark(
        id="qasr_al_bint",
        name_en="Qasr al-Bint",
        name_ar="قصر البنت",
        description_en=(
            "A freestanding stone temple on Petra's colonnaded street, built in the second "
            "half of the 1st century BC as the cult centre of Dushara, the chief Nabataean "
            "god. Its Arabic name, 'Palace of the Daughter,' comes from a local folk tale "
            "rather than the building's original purpose."
        ),
        description_ar=(
            "معبد حجري قائم بذاته على الشارع المعمد في البتراء، بُني في النصف الثاني من "
            "القرن الأول قبل الميلاد كمركز عبادة لذو الشرى، كبير آلهة الأنباط. اسمه العربي "
            "'قصر البنت' مستمد من حكاية شعبية محلية لا من وظيفة المبنى الأصلية."
        ),
        avg_visit_minutes=15,
        accessibility_notes="On the flat colonnaded street; wheelchair accessible.",
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Petra_Qasr_al-Bint_Temple_Complex_1695.jpg",
        image_attribution="Photo by Dick Osseman, CC BY-SA 4.0, via Wikimedia Commons",
    ),
    "high_place_of_sacrifice": Landmark(
        id="high_place_of_sacrifice",
        name_en="High Place of Sacrifice",
        name_ar="المذبح المرتفع",
        description_en=(
            "A ritual platform atop Jebel al-Madbah, reached by a roughly 30-40 minute climb "
            "above the Street of Facades, with sheer drops of about 170 m to the wadi below. "
            "An altar on stepped platforms and a drainage channel point to its use for animal "
            "sacrifice to the god Dushara."
        ),
        description_ar=(
            "منصة طقسية أعلى جبل المذبح، يُصعد إليها عبر مسار يستغرق نحو 30-40 دقيقة فوق "
            "شارع الواجهات، بانحدارات شبه عمودية تصل إلى 170 متراً نحو الوادي. تشير منصة "
            "المذبح المدرجة وقناة التصريف إلى استخدامها في تقديم القرابين الحيوانية لذو الشرى."
        ),
        avg_visit_minutes=90,
        accessibility_notes="Reached via a steep 30-40 minute climb with sheer drops; not accessible for reduced mobility.",
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/High_Place_of_Sacrifice_Jebel_al-Madbah_Petra_Jordan1432.jpg",
        image_attribution="Photo by Michael Gunther, CC BY-SA 3.0, via Wikimedia Commons",
    ),
    "little_petra": Landmark(
        id="little_petra",
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
    "little_petra_biclinium": Landmark(
        id="little_petra_biclinium",
        name_en="Painted Biclinium, Little Petra",
        name_ar="البيت المرسوم (البيكلينيوم)، البتراء الصغيرة",
        description_en=(
            "A rock-cut dining chamber whose ceiling holds the largest surviving example of "
            "Nabataean wall painting: grapevines, pomegranates, birds, and small winged "
            "figures rendered in a Hellenistic style, dated to between 40 BC and 25 AD and "
            "restored in 2007 after centuries of soot and graffiti obscured it."
        ),
        description_ar=(
            "غرفة طعام منحوتة في الصخر تحمل سقفها أكبر نموذج باقٍ من الرسم الجداري النبطي: "
            "كروم عنب ورمان وطيور وأشكال مجنحة صغيرة بأسلوب هلنستي، يعود تاريخها إلى ما بين "
            "40 ق.م و25م، وخضعت للترميم عام 2007 بعد أن غطاها السخام والكتابات لقرون."
        ),
        avg_visit_minutes=15,
        accessibility_notes="Narrow rock-cut passage; not wheelchair accessible.",
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Nabataean_Painting_Biclinium_849_Siq_al-Barid_Jordan1508.jpg",
        image_attribution="Photo by Michael Gunther, CC BY-SA 4.0, via Wikimedia Commons",
    ),
    "shobak_castle": Landmark(
        id="shobak_castle",
        name_en="Shobak Castle (Montreal)",
        name_ar="قلعة الشوبك (مونتريال)",
        description_en=(
            "A Crusader fortress built in 1115 AD by Baldwin I of Jerusalem atop a hill "
            "overlooking ancient trade and pilgrimage routes. A secret rock-cut staircase of "
            "over 375 steps descends about 75 m to a spring, and the ruins hold two churches, "
            "cisterns, and Arabic and Crusader inscriptions."
        ),
        description_ar=(
            "قلعة صليبية بناها بلدوين الأول ملك بيت المقدس عام 1115م فوق تلة تشرف على طرق "
            "التجارة والحج القديمة. يهبط درج سري منحوت في الصخر يضم أكثر من 375 درجة نحو 75 "
            "متراً وصولاً إلى نبع ماء، وتضم الأطلال كنيستين وصهاريج ونقوشاً عربية وصليبية."
        ),
        avg_visit_minutes=90,
        accessibility_notes="Uneven ruins terrain; limited accessibility, no paved paths.",
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Montr%C3%A9al_aka_Shobak_Castle_2431.jpg",
        image_attribution="Photo by Dick Osseman, CC BY-SA 4.0, via Wikimedia Commons",
    ),
    "wadi_musa": Landmark(
        id="wadi_musa",
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
    "wadi_trails": Landmark(
        id="wadi_trails",
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
    "udhruh": Landmark(
        id="udhruh",
        name_en="Udhruh Fort",
        name_ar="حصن أذرح",
        description_en=(
            "The remains of a Roman legionary fortress in the town of Udhruh, 15 km east of "
            "Petra, rebuilt in 303-304 AD as recorded in an inscription on its west gate and "
            "once home to the Legio VI Ferrata. Later reoccupied as an Ottoman-era station on "
            "the Hajj pilgrimage road, and ongoing surveys have traced watchtowers linking it "
            "to Petra."
        ),
        description_ar=(
            "بقايا حصن روماني في بلدة أذرح التي تبعد 15 كم شرق البتراء، أُعيد بناؤه عام "
            "303-304م بحسب نقش على بوابته الغربية، وكان مقراً لفرقة الليجيو السادسة فيراتا. "
            "أُعيد استخدام الموقع لاحقاً كمحطة عثمانية على طريق الحج، وكشفت المسوحات الأثرية "
            "عن أبراج مراقبة تربطه بالبتراء."
        ),
        avg_visit_minutes=60,
        accessibility_notes="Open ruins site with uneven ground; not wheelchair accessible.",
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Udhruh_(Ottoman_Fort).jpg",
        image_attribution="Photo by Bashar Tabbah, CC BY-SA 4.0, via Wikimedia Commons",
    ),
}
