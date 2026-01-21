export const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'mk', label: 'Македонски' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
    { code: 'ru', label: 'Русский' },
    { code: 'zh', label: '中文' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'ar', label: 'العربية' },
    { code: 'hi', label: 'हिन्दी' }
];

export const translations = {
    en: {
        appTitle: "DreamOff",
        subtitle: "Enter the Royal Road to the Unconscious",
        home: "Home",
        add: "Add",
        journal: "Journal",
        profile: "Profile",
        record: "Record Dream",
        write: "Write Dream",
        archive: "Dream Archive",
        models: "Psych. Models",
        dailyWisdom: "Daily Wisdom",
        dailyQuote: "\"The dream is the small hidden door in the deepest and most intimate sanctum of the soul...\" — C.G. Jung",

        // Add Dream
        describeDream: "Describe your dream...",
        listening: "Listening...",
        interpret: "Interpret Dream",
        processing: "Consulting the Oracle...",
        selectModel: "Select Interpretation Framework",

        // Archive
        searchPlaceholder: "Search dreams...",
        noDreams: "No dreams recorded yet.",

        // Detail
        back: "Back",
        visualManifestation: "Visual Manifestation",
        analysis: "Analysis",
        transcription: "Transcription",
        oracleChat: "Oracle Chat",
        askQuestion: "Ask a question...",

        // Profile
        settings: "Settings",
        language: "Language",
        theme: "Theme",
        notifications: "Notifications",
        about: "About DreamOff",
        version: "Version 1.0.0 (Baroque)"
    },
    mk: {
        appTitle: "DreamOff",
        subtitle: "Влезете во кралскиот пат кон несвесното",
        home: "Дома",
        add: "Нов Сон",
        journal: "Дневник",
        profile: "Профил",
        record: "Сними Сон",
        write: "Запиши Сон",
        archive: "Архива",
        models: "Псих. Модели",
        dailyWisdom: "Дневна Мудрост",
        dailyQuote: "„Сонот е мала скриена врата во најдлабокото и најинтимното светилиште на душата...“ — К.Г. Јунг",

        describeDream: "Опишете го вашиот сон...",
        listening: "Слушам...",
        interpret: "Толкувај",
        processing: "Се консултира Оракулот...",
        selectModel: "Избери Рамка за Толкување",

        searchPlaceholder: "Пребарај соништа...",
        noDreams: "Сè уште нема запишани соништа.",

        back: "Назад",
        visualManifestation: "Визуелна Манифестација",
        analysis: "Анализа",
        transcription: "Транскрипција",
        oracleChat: "Оракул Чет",
        askQuestion: "Постави прашање...",

        settings: "Поставки",
        language: "Јазик",
        theme: "Тема",
        notifications: "Известувања",
        about: "За DreamOff",
        version: "Верзија 1.0.0 (Барок)"
    },
    // Adding fallbacks for other languages to English for now to save space, 
    // but in a real app these would be fully populated. 
    // I will auto-fill a few key ones for demo purposes.
    es: {
        appTitle: "DreamOff",
        subtitle: "El Camino Real al Inconsciente",
        home: "Inicio",
        add: "Añadir",
        journal: "Diario",
        profile: "Perfil",
        record: "Grabar Sueño",
        write: "Escribir Sueño",
        archive: "Archivo",
        models: "Modelos Psic.",
        dailyWisdom: "Sabiduría Diaria",
        interpret: "Interpretar",
        settings: "Ajustes",
        language: "Idioma"
    },
    fr: {
        appTitle: "DreamOff",
        home: "Accueil",
        add: "Ajouter",
        journal: "Journal",
        profile: "Profil",
        record: "Enregistrer",
        write: "Écrire",
        interpret: "Interpréter",
        language: "Langue"
    },
    de: {
        appTitle: "DreamOff",
        home: "Start",
        add: "Hinzufügen",
        journal: "Tagebuch",
        profile: "Profil",
        record: "Aufnehmen",
        write: "Schreiben",
        interpret: "Deuten",
        language: "Sprache"
    },
    it: {
        appTitle: "DreamOff",
        home: "Home",
        add: "Aggiungi",
        journal: "Diario",
        profile: "Profilo",
        record: "Registra",
        write: "Scrivi",
        interpret: "Interpretare",
        language: "Lingua"
    },
    ru: {
        appTitle: "DreamOff",
        home: "Главная",
        add: "Добавить",
        journal: "Журнал",
        profile: "Профиль",
        record: "Записать",
        write: "Написать",
        interpret: "Толковать",
        language: "Язык"
    },
    zh: {
        appTitle: "DreamOff",
        home: "首页",
        add: "添加",
        journal: "日记",
        profile: "个人资料",
        record: "录音",
        write: "写作",
        interpret: "解梦",
        language: "语言"
    },
    tr: {
        appTitle: "DreamOff",
        home: "Ana Sayfa",
        add: "Ekle",
        journal: "Günlük",
        profile: "Profil",
        record: "Kaydet",
        write: "Yaz",
        interpret: "Yorumla",
        language: "Dil"
    },
    ar: {
        appTitle: "DreamOff",
        home: "الرئيسية",
        add: "إضافة",
        journal: "مذكرة",
        profile: "الملف الشخصي",
        record: "تسجيل",
        write: "كتابة",
        interpret: "تفسير",
        language: "لغة"
    },
    hi: {
        appTitle: "DreamOff",
        home: "होम",
        add: "जोड़ें",
        journal: "पत्रिका",
        profile: "प्रोफाइल",
        record: "रिकॉर्ड",
        write: " लिखें",
        interpret: "व्याख्या करें",
        language: "भाषा"
    }
};

export const t = (lang, key) => {
    // Basic fallback logic
    return translations[lang]?.[key] || translations['en'][key] || key;
};
