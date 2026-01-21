/**
 * Mocks the Gemini Interpretation Agent with Device-Aware Logic.
 * 
 * Devices:
 * - MOBILE: Concise, 2 lenses (Archetypes, Scientific), Themes, Actions.
 * - TABLET: Structured, Symbol Table, Reflection Prompts.
 * - DESKTOP: Comprehensive, Matrix, Integrated Insight, Creative Reframe.
 * 
 * Languages: English (en) / Macedonian (mk)
 */

const detectLanguage = (text) => {
    const cyrillicPattern = /[\u0400-\u04FF]/;
    return cyrillicPattern.test(text) ? 'mk' : 'en';
};

// HELPER: Generate Long Text (~7 sentences)
const generateLongText = (topic, lang) => {
    if (lang === 'mk') {
        return `Овој сон открива длабоки емоционални слоеви кои се поврзани со вашата моментална ситуација. Симболот на ${topic} често се појавува кога потсвеста се обидува да процесира промена или транзиција. Во нашата традиција, ова се смета за знак дека треба да обрнете внимание на вашите внатрешни инстинкти кои можеби сте ги игнорирале. Психолошки гледано, ова претставува конфликт помеѓу вашите свесни желби и несвесните стравови кои ве кочат. Вашата душа бара рамнотежа, а овој сон е само почеток на тој пат кон самооткривање. Обрнете внимание на луѓето околу вас, бидејќи тие може да бидат огледало на овие внатрешни состојби. Конечно, не плашете се од непознатото, туку прифатете го како дел од вашиот раст.`;
    }
    return `This dream reveals deep emotional layers connected to your current situation. The symbol of ${topic} often appears when the subconscious is trying to process change or transition. From an archetypal perspective, this is a sign that you need to pay attention to inner instincts you may have been ignoring. Psychologically speaking, this represents a conflict between your conscious desires and the subconscious fears holding you back. Your soul is seeking balance, and this dream is just the beginning of that path to self-discovery. Pay attention to the people around you, as they may be mirrors of these internal states. Finally, do not fear the unknown, but embrace it as a necessary part of your personal growth.`;
};

const MOCK_DATA = {
    en: {
        mobile: {
            summary: "A vivid narrative indicating a significant shift in your waking life's emotional landscape.",
            archetypes: "The Hero's Journey is active here. You are currently in the 'Departure' phase, leaving behind the known world. The central symbol acts as a Guide, urging you to trust your intuition despite the lack of clear direction. This aligns with the classic motif of the Night Sea Journey.",
            scientific: "From a cognitive perspective, your brain is engaging in 'Threat Simulation'. It is safely rehearsing scenarios of uncertainty to prepare you for real-world stressors. This process aids in memory consolidation and emotional regulation, lowering your cortisol response to similar future events.",
            themes: ["Transition", "Growth", "Uncertainty"],
            actions: ["Journal about recent changes.", "Practice mindfulness."]
        },
        tablet: {
            summary: "A vivid narrative indicating a significant shift in your waking life's emotional landscape.",
            archetypes: "The Hero's Journey is active here. You are currently in the 'Departure' phase, leaving behind the known world. The central symbol acts as a Guide, urging you to trust your intuition despite the lack of clear direction. This aligns with the classic motif of the Night Sea Journey.",
            scientific: "From a cognitive perspective, your brain is engaging in 'Threat Simulation'. It is safely rehearsing scenarios of uncertainty to prepare you for real-world stressors. This process aids in memory consolidation and emotional regulation, lowering your cortisol response to similar future events.",
            symbols: [
                { element: "Unknown Symbol", archetype: "The Shadow", meaning: "Hidden Potential" },
                { element: "Recurring Theme", archetype: "The Self", meaning: "Wholeness" }
            ],
            reflections: ["What are you leaving behind?", "What fears are surfacing?"]
        },
        desktop: {
            summary: "A vivid narrative indicating a significant shift in your waking life's emotional landscape.",
            archetypes: "The Hero's Journey is active here. You are currently in the 'Departure' phase, leaving behind the known world. The central symbol acts as a Guide, urging you to trust your intuition despite the lack of clear direction. This aligns with the classic motif of the Night Sea Journey.",
            scientific: "From a cognitive perspective, your brain is engaging in 'Threat Simulation'. It is safely rehearsing scenarios of uncertainty to prepare you for real-world stressors. This process aids in memory consolidation and emotional regulation, lowering your cortisol response to similar future events.",
            symbols: [
                { element: "Unknown Symbol", archetype: "The Shadow", meaning: "Hidden Potential" },
                { element: "Recurring Theme", archetype: "The Self", meaning: "Wholeness" }
            ],
            reflections: ["What are you leaving behind?", "What fears are surfacing?"]
        }
    },
    mk: {
        mobile: {
            summary: "Овој сон укажува на значителна промена во вашиот емоционален пејзаж.",
            archetypes: "Активен е архетипот на Патникот. Симболите сугерираат дека сте во фаза на транзиција, каде што старото 'Јас' умира за да се роди новото. Ова е класичен мотив на трансформација кој често се појавува во периоди на криза или големи одлуки. Вашата потсвет ве повикува на храброст.",
            scientific: "Од научна гледна точка, ова е процес на емоционална регулација. Вашиот мозок ги консолидира мемориите од претходниот ден и ги поврзува со постари искуства. Ова ви помага да ги процесирате стресните настани на безбеден начин, намалувајќи ја анксиозноста во будна состојба.",
            themes: ["Промена", "Раст", "Интуиција"],
            actions: ["Запишете ги вашите чувства.", "Медитирајте на симболите."]
        },
        tablet: {
            summary: "Овој сон укажува на значителна промена во вашиот емоционален пејзаж.",
            archetypes: "Активен е архетипот на Патникот. Симболите сугерираат дека сте во фаза на транзиција, каде што старото 'Јас' умира за да се роди новото. Ова е класичен мотив на трансформација кој често се појавува во периоди на криза или големи одлуки. Вашата потсвет ве повикува на храброст.",
            scientific: "Од научна гледна точка, ова е процес на емоционална регулација. Вашиот мозок ги консолидира мемориите од претходниот ден и ги поврзува со постари искуства. Ова ви помага да ги процесирате стресните настани на безбеден начин, намалувајќи ја анксиозноста во будна состојба.",
            symbols: [
                { element: "Непознат Симбол", archetype: "Сенката", meaning: "Скриен Потенцијал" },
                { element: "Повторлив Мотив", archetype: "Себството", meaning: "Целост" }
            ],
            reflections: ["Што оставате зад себе?", "Мислите ли дека сте подготвени за промена?"]
        },
        desktop: {
            summary: "Овој сон укажува на значителна промена во вашиот емоционален пејзаж.",
            archetypes: "Активен е архетипот на Патникот. Симболите сугерираат дека сте во фаза на транзиција, каде што старото 'Јас' умира за да се роди новото. Ова е класичен мотив на трансформација кој често се појавува во периоди на криза или големи одлуки. Вашата потсвет ве повикува на храброст.",
            scientific: "Од научна гледна точка, ова е процес на емоционална регулација. Вашиот мозок ги консолидира мемориите од претходниот ден и ги поврзува со постари искуства. Ова ви помага да ги процесирате стресните настани на безбеден начин, намалувајќи ја анксиозноста во будна состојба.",
            symbols: [
                { element: "Непознат Симбол", archetype: "Сенката", meaning: "Скриен Потенцијал" },
                { element: "Повторлив Мотив", archetype: "Себството", meaning: "Целост" }
            ],
            reflections: ["Што оставате зад себе?", "Мислите ли дека сте подготвени за промена?"]
        }
    }
};

export const interpretDream = async (text, model, deviceType = 'mobile', forcedLanguage = null) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Priority: Forced Language > Detected Language > Default 'en'
            let lang = forcedLanguage || detectLanguage(text);

            // Fallback: If lang is not 'mk' or 'en', default to 'en' (since we only mock those 2)
            // If user selected 'es' but we don't have 'es' data, show 'en'
            if (!MOCK_DATA[lang]) {
                console.warn(`Language ${lang} not supported in mock agent, falling back to English.`);
                lang = 'en';
            }

            // Dynamic generation to ensure length and variety based on input text keywords
            const words = text.split(" ");
            const topic = words[Math.floor(Math.random() * words.length)] || (lang === 'mk' ? "мистерија" : "mystery");

            const longArchetype = generateLongText(topic, lang);

            // Base Data Structure Selection
            // Use deviceType to pick mobile/tablet structure, currently mapping desktop->mobile for simplicity or update MOCK_DATA
            // Ensuring we have data for the specific device type, fallback to mobile if missing
            let deviceKey = deviceType;
            if (!MOCK_DATA[lang][deviceKey]) deviceKey = 'mobile';

            let data = { ...MOCK_DATA[lang][deviceKey] };

            // Inject the dynamic long text into the Archetypes section to ensure 7 sentences
            data.archetypes = longArchetype;

            resolve({
                transcription: text,
                interpretation: data,
                layout: deviceType,
                modelUsed: model,
                language: lang
            });
        }, 1500);
    });
};
