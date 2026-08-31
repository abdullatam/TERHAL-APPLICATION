"""Landmark-level knowledge base, sourced from Wikipedia/UNESCO/tourism-board
research (facts paraphrased, not copied verbatim) and illustrated with
CC-licensed Wikimedia Commons photos.

This is what actually grounds the camera-based AI tour guide: a photo of
"Petra" alone isn't useful for identification, but a photo of a specific
facade (the Treasury, the Monastery, a Royal Tomb, ...) is. Site-level data
in sites.py stays for itinerary planning; this file adds the granularity
the vision feature needs.
"""
from app.models import Landmark, SiteId

LANDMARKS: dict[str, Landmark] = {
    "siq": Landmark(
        id="siq",
        site=SiteId.petra,
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
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Petra_Siq,_entrance_to_the_ancient_Nabatean_city_of_Petra,_Jordan.jpg",
        image_attribution="Photo by Vyacheslav Argenberg, CC BY 4.0, via Wikimedia Commons",
    ),
    "al_khazneh": Landmark(
        id="al_khazneh",
        site=SiteId.petra,
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
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Al-Khazneh_(The_Treasury),_Petra,_Jordan.jpg",
        image_attribution="Photo by Vyacheslav Argenberg, CC BY 4.0, via Wikimedia Commons",
    ),
    "street_of_facades": Landmark(
        id="street_of_facades",
        site=SiteId.petra,
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
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Street_of_Facades,_Petra.jpg",
        image_attribution="Photo by Bernard Gagnon, CC BY-SA 3.0, via Wikimedia Commons",
    ),
    "royal_tombs": Landmark(
        id="royal_tombs",
        site=SiteId.petra,
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
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Urn_Tomb,_Petra_01.jpg",
        image_attribution="Photo by Bernard Gagnon, CC BY-SA 3.0, via Wikimedia Commons",
    ),
    "ad_deir": Landmark(
        id="ad_deir",
        site=SiteId.petra,
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
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Ad_Deir_(The_Monastery),_El_Deir,_Petra,_Jordan.jpg",
        image_attribution="Photo by Vyacheslav Argenberg, CC BY 4.0, via Wikimedia Commons",
    ),
    "qasr_al_bint": Landmark(
        id="qasr_al_bint",
        site=SiteId.petra,
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
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Petra_Qasr_al-Bint_Temple_Complex_1695.jpg",
        image_attribution="Photo by Dick Osseman, CC BY-SA 4.0, via Wikimedia Commons",
    ),
    "high_place_of_sacrifice": Landmark(
        id="high_place_of_sacrifice",
        site=SiteId.petra,
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
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/High_Place_of_Sacrifice_Jebel_al-Madbah_Petra_Jordan1432.jpg",
        image_attribution="Photo by Michael Gunther, CC BY-SA 3.0, via Wikimedia Commons",
    ),
    "little_petra_biclinium": Landmark(
        id="little_petra_biclinium",
        site=SiteId.little_petra,
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
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Nabataean_Painting_Biclinium_849_Siq_al-Barid_Jordan1508.jpg",
        image_attribution="Photo by Michael Gunther, CC BY-SA 4.0, via Wikimedia Commons",
    ),
    "shobak_castle_keep": Landmark(
        id="shobak_castle_keep",
        site=SiteId.shobak_castle,
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
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Montr%C3%A9al_aka_Shobak_Castle_2431.jpg",
        image_attribution="Photo by Dick Osseman, CC BY-SA 4.0, via Wikimedia Commons",
    ),
    "udhruh_fort": Landmark(
        id="udhruh_fort",
        site=SiteId.udhruh,
        name_en="Udhruh Fort",
        name_ar="حصن أذرح",
        description_en=(
            "The remains of a Roman legionary fortress east of Petra, rebuilt in 303-304 AD "
            "as recorded in an inscription on its west gate, once home to the Legio VI "
            "Ferrata. The site was later reoccupied for an Ottoman-era fort tied to the Hajj "
            "route, and ongoing surveys have traced watchtowers linking it to Petra."
        ),
        description_ar=(
            "بقايا حصن روماني شرق البتراء، أُعيد بناؤه عام 303-304م بحسب نقش على بوابته "
            "الغربية، وكان مقراً لفرقة الليجيو السادسة فيراتا. أُعيد استخدام الموقع لاحقاً "
            "كحصن عثماني مرتبط بطريق الحج، وكشفت المسوحات الأثرية عن أبراج مراقبة تربطه "
            "بالبتراء."
        ),
        image_url="https://commons.wikimedia.org/wiki/Special:FilePath/Udhruh_(Ottoman_Fort).jpg",
        image_attribution="Photo by Bashar Tabbah, CC BY-SA 4.0, via Wikimedia Commons",
    ),
}
