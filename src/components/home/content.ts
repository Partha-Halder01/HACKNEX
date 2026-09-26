// All landing-page text in one place (English + Bengali). Numbers come from the
// project itself: IPCC Tier 1 = 283.1 t C/ha; live test at Sajnekhali forest.
export type HomeLang = 'en' | 'bn'

export const HOME_TEXT = {
  en: {
    nav: { dive: 'The dive', how: 'How it works', trust: 'Why trust it', cta: 'Open live dashboard' },
    hero: {
      eyebrow: 'MANGROVELENS · SUNDARBANS · SENTINEL-2 · AI',
      title1: 'SEE THE FOREST.',
      title2: 'MEASURE THE CHANGE.',
      title3: 'UNDERSTAND THE CARBON.',
      sub: 'SATELLITE MONITORING OF MANGROVES AND THE BLUE CARBON THEY HOLD',
      primary: 'Open live dashboard',
      secondary: 'Scroll to dive',
    },
    labels: {
      canopy: ['MANGROVE CANOPY', 'above-ground biomass'],
      water: ['TIDAL WATER', 'twice a day'],
      roots: ['STILT ROOTS', 'trap mud and leaves'],
      carbon: ['STORED BLUE CARBON', 'buried in the sediment'],
    },
    above: {
      step: '01 · ABOVE THE WATER',
      title: 'THE FOREST WE CAN SEE FROM SPACE',
      body: 'Every few days the Sentinel-2 satellite photographs the Sundarbans in 10-metre detail. Our AI reads those photos and maps where mangrove forest stands — and where it is growing or shrinking.',
      chips: ['10 m detail', 'photos every ~5 days', '2019 → today'],
    },
    surface: { title: 'BELOW THE SURFACE', sub: 'where most of the carbon hides' },
    roots: {
      step: '02 · THE ROOTS',
      title: 'A NET THAT CATCHES MUD — AND CARBON',
      body: 'Stilt roots slow the tide. Mud and fallen leaves settle between them and are buried, layer on layer, for centuries.',
      chips: ['Trees: 74.2 t C/ha', 'Roots: 28.9 t C/ha'],
    },
    carbon: {
      step: '03 · BLUE CARBON',
      number: '283 t',
      unit: 'of carbon in every hectare of mangrove',
      body: '≈ 1,038 t CO₂ — as much as about 519 people in India emit in a year. Most of it (64%) sits in the soil, not the trees.',
      source: 'IPCC 2013 Wetlands Supplement, Tier 1',
    },
    gauge: ['Canopy', 'Surface', 'Roots', 'Sediment'],
    why: {
      eyebrow: 'THE PROBLEM',
      title: 'A GIANT CARBON STORE, WATCHED BY TOO FEW EYES',
      cards: [
        ['Forest changes quietly', 'Erosion, cyclones and clearing change the mangrove edge every year — often unnoticed until it is gone.'],
        ['Carbon claims are hard to trust', 'Numbers are often given without saying how sure they are, or how they were measured.'],
        ['Data rarely reaches villages', 'Satellite maps stay with experts, in English, in formats that panchayats cannot use.'],
      ],
    },
    how: {
      eyebrow: 'HOW IT WORKS',
      title: 'FROM A SATELLITE PHOTO TO A PLAIN ANSWER',
      steps: [
        ['Satellite photos', 'Cloud-free Sentinel-2 photos of the same dry-season months (Jan–Mar) each year, processed on Google Earth Engine.'],
        ['AI forest map', 'A Random Forest model, trained on the scientific CGMD mangrove map (1984–2023), marks every 10 m pixel as mangrove or not.'],
        ['Change & carbon', 'Gain, loss and uncertain change; carbon from IPCC Tier 1 factors with a ± range; 5-year what-if scenarios.'],
        ['A plain answer', '“The forest here grew / shrank”, how sure we are, in Bengali and English — shareable on WhatsApp or as PDF.'],
      ],
    },
    trust: {
      eyebrow: 'WHY TRUST IT',
      title: 'HONEST ABOUT WHAT IT KNOWS — AND WHAT IT DOESN’T',
      stats: [
        ['93.5%', 'agreement with the scientific map on a year the model never saw (2023)'],
        ['−2%', 'difference from the reference forest area at Sajnekhali'],
        ['🟢🟡🔴', 'every result says how sure it is — and says “don’t trust this” when needed'],
        ['0', 'carbon-credit claims — estimates for monitoring and planning only'],
      ],
      note: 'It also warns when it can be wrong: near villages, where trees and fields can look like mangrove, and when photos are from different seasons.',
    },
    cta: {
      title: 'PICK ANY PLACE IN THE SUNDARBANS',
      sub: 'Choose a spot and two years. Get the forest, the carbon and a clear answer in about two minutes.',
      button: 'Open live dashboard',
    },
    footer: '© 2026 MangroveLens · Satellite data: Copernicus Sentinel-2 via Google Earth Engine · Reference map: CGMD-AFCC30 · Carbon factors: IPCC 2013 Wetlands Supplement · Opening footage: AI-generated illustration (Google Gemini)',
    loading: 'Loading the dive',
  },
  bn: {
    nav: { dive: 'ডুব', how: 'কীভাবে কাজ করে', trust: 'কেন বিশ্বাস করবেন', cta: 'লাইভ ড্যাশবোর্ড খুলুন' },
    hero: {
      eyebrow: 'MANGROVELENS · সুন্দরবন · সেন্টিনেল-২ · AI',
      title1: 'বন দেখুন।',
      title2: 'পরিবর্তন মাপুন।',
      title3: 'কার্বন বুঝুন।',
      sub: 'উপগ্রহ দিয়ে ম্যানগ্রোভ বন ও তার জমা ব্লু কার্বনের খোঁজ',
      primary: 'লাইভ ড্যাশবোর্ড খুলুন',
      secondary: 'নিচে স্ক্রোল করে ডুব দিন',
    },
    labels: {
      canopy: ['ম্যানগ্রোভের ছাউনি', 'মাটির উপরের বায়োমাস'],
      water: ['জোয়ারের জল', 'দিনে দুবার'],
      roots: ['ঠেসমূল', 'কাদা ও পাতা আটকায়'],
      carbon: ['জমা ব্লু কার্বন', 'কাদার নিচে চাপা'],
    },
    above: {
      step: '০১ · জলের উপরে',
      title: 'যে বন মহাকাশ থেকে দেখা যায়',
      body: 'কয়েক দিন পরপর সেন্টিনেল-২ উপগ্রহ ১০ মিটার খুঁটিনাটিতে সুন্দরবনের ছবি তোলে। আমাদের AI সেই ছবি দেখে বলে কোথায় ম্যানগ্রোভ বন আছে — আর কোথায় বাড়ছে বা কমছে।',
      chips: ['১০ মিটার খুঁটিনাটি', 'প্রায় ৫ দিনে একবার ছবি', '২০১৯ → আজ'],
    },
    surface: { title: 'জলের নিচে', sub: 'যেখানে বেশিরভাগ কার্বন লুকিয়ে থাকে' },
    roots: {
      step: '০২ · শিকড়',
      title: 'কাদা — আর কার্বন — ধরার জাল',
      body: 'ঠেসমূল জোয়ারের জলের গতি কমায়। শিকড়ের ফাঁকে কাদা আর ঝরা পাতা জমে, স্তরে স্তরে চাপা পড়ে থাকে শত শত বছর।',
      chips: ['গাছে: ৭৪.২ টন কার্বন/হেক্টর', 'শিকড়ে: ২৮.৯ টন কার্বন/হেক্টর'],
    },
    carbon: {
      step: '০৩ · ব্লু কার্বন',
      number: '২৮৩ টন',
      unit: 'কার্বন প্রতি হেক্টর ম্যানগ্রোভে',
      body: '≈ ১,০৩৮ টন CO₂ — প্রায় ৫১৯ জন ভারতীয়ের এক বছরের নিঃসরণের সমান। বেশিরভাগ (৬৪%) থাকে মাটিতে, গাছে নয়।',
      source: 'IPCC ২০১৩ জলাভূমি নির্দেশিকা, টিয়ার ১',
    },
    gauge: ['ছাউনি', 'জলতল', 'শিকড়', 'কাদা'],
    why: {
      eyebrow: 'সমস্যা',
      title: 'বিশাল কার্বন ভাণ্ডার, কিন্তু নজর রাখার চোখ কম',
      cards: [
        ['বন চুপচাপ বদলায়', 'ভাঙন, ঝড় আর গাছ কাটায় প্রতি বছর বনের কিনারা বদলায় — প্রায়ই হারিয়ে যাওয়ার আগে কেউ টের পায় না।'],
        ['কার্বনের দাবি যাচাই কঠিন', 'প্রায়ই সংখ্যা দেওয়া হয়, কিন্তু কতটা নিশ্চিত বা কীভাবে মাপা, তা বলা হয় না।'],
        ['তথ্য গ্রামে পৌঁছায় না', 'উপগ্রহ মানচিত্র বিশেষজ্ঞদের কাছেই থাকে, ইংরেজিতে, পঞ্চায়েতের ব্যবহারের অযোগ্য রূপে।'],
      ],
    },
    how: {
      eyebrow: 'কীভাবে কাজ করে',
      title: 'উপগ্রহের ছবি থেকে সহজ উত্তর',
      steps: [
        ['উপগ্রহ ছবি', 'প্রতি বছরের একই শুকনো মাসের (জানু–মার্চ) মেঘমুক্ত সেন্টিনেল-২ ছবি, Google Earth Engine-এ তৈরি।'],
        ['AI বনের মানচিত্র', 'বৈজ্ঞানিক CGMD ম্যানগ্রোভ মানচিত্র (১৯৮৪–২০২৩) থেকে শেখা Random Forest মডেল প্রতি ১০ মিটার জায়গা ম্যানগ্রোভ কি না চিহ্নিত করে।'],
        ['পরিবর্তন ও কার্বন', 'বৃদ্ধি, ক্ষতি ও অনিশ্চিত পরিবর্তন; IPCC টিয়ার ১ দিয়ে কার্বন, ± পরিসর সহ; আগামী ৫ বছরের সম্ভাব্য চিত্র।'],
        ['সহজ উত্তর', '“এখানকার বন বেড়েছে / কমেছে”, কতটা নিশ্চিত — বাংলা ও ইংরেজিতে, WhatsApp বা PDF-এ শেয়ার করা যায়।'],
      ],
    },
    trust: {
      eyebrow: 'কেন বিশ্বাস করবেন',
      title: 'কী জানে আর কী জানে না — দুটোই সৎভাবে বলে',
      stats: [
        ['৯৩.৫%', 'মডেল যে বছর দেখেনি (২০২৩), সেই বছরের বৈজ্ঞানিক মানচিত্রের সঙ্গে মিল'],
        ['−২%', 'সজনেখালিতে রেফারেন্স বনের এলাকার সঙ্গে পার্থক্য'],
        ['🟢🟡🔴', 'প্রতিটি ফলাফল বলে কতটা নিশ্চিত — দরকারে বলে “এটা বিশ্বাস করবেন না”'],
        ['০', 'কার্বন ক্রেডিটের দাবি — শুধু পর্যবেক্ষণ ও পরিকল্পনার জন্য আনুমানিক হিসাব'],
      ],
      note: 'ভুল হতে পারে এমন জায়গাতেও সতর্ক করে: গ্রামের কাছে (গাছপালা ও খেত ম্যানগ্রোভের মতো দেখায়), আর দুই তারিখ আলাদা মৌসুমে হলে।',
    },
    cta: {
      title: 'সুন্দরবনের যেকোনো জায়গা বেছে নিন',
      sub: 'একটা জায়গা আর দুটো বছর বাছুন। প্রায় দুই মিনিটে পাবেন বন, কার্বন আর পরিষ্কার উত্তর।',
      button: 'লাইভ ড্যাশবোর্ড খুলুন',
    },
    footer: '© ২০২৬ MangroveLens · উপগ্রহ তথ্য: Copernicus Sentinel-2, Google Earth Engine · রেফারেন্স মানচিত্র: CGMD-AFCC30 · কার্বন ফ্যাক্টর: IPCC ২০১৩ · শুরুর দৃশ্য: AI দিয়ে তৈরি চিত্র (Google Gemini)',
    loading: 'ডুবের দৃশ্য লোড হচ্ছে',
  },
} as const
