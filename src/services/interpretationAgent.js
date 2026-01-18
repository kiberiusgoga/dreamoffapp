/**
 * Mocks the Gemini Interpretation Agent.
 * Returns structured JSON responses based on the selected model.
 */

const RESPONSES = {
    jung: [
        "The image of the {symbol} represents your Shadow self seeking integration. This dream invites you to embrace the rejected parts of your psyche to achieve wholeness.",
        "The appearance of {symbol} is a classic Archetype of transformation. Your unconscious is preparing you for a significant shift in your waking life.",
        "This dream is a mandala of the soul. The {symbol} signifies the center, the Self, urging you to find balance between order and chaos."
    ],
    freud: [
        "This dream is a manifest expression of a latent wish. The {symbol} likely serves as a screen memory for early childhood desires that have been repressed.",
        "We can observe a conflict between the Id and the Super-Ego here. The {symbol} represents a forbidden drive that your Ego is trying to censor.",
        "The presence of {symbol} suggests an unconscious anxiety related to parental figures or unresolved oedipal tensions."
    ],
    cbt: [
        "Your brain is consolidating memories from yesterday. The {symbol} appears to be connected to a stressful event you processed recently.",
        "This dream reflects your current cognitive schemas. You might be catastrophizing about {symbol}, and your mind is running simulations to prepare.",
        "From a neuroscience perspective, this is emotional regulation in action. The {symbol} is merely a random firing of neurons associated with recent tasks."
    ],
    balkan: [
        "According to tradition, seeing a {symbol} in a dream means sudden changes are coming to your family. Be cautious with money.",
        "The old books say: If you dream of {symbol}, expect a letter or news from a distant relative soon.",
        "A {symbol} is a sign of good health but warns against envy from neighbors. Keep your secrets close."
    ],
    spiritual: [
        "Your vibration is shifting. The {symbol} indicates that your third eye is opening to new intuitive possibilities.",
        "This is a message from your spirit guides. The {symbol} represents a block in your heart chakra that is ready to be released.",
        "You are traveling through the astral plane. The {symbol} is a totem showing you the path to higher consciousness."
    ]
};

export const interpretDream = async (text, model) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // 1. Extract a dummy symbol for flavor
            const words = text.split(" ");
            const randomWord = words[Math.floor(Math.random() * words.length)] || "mystery";

            // 2. Select response template
            const templates = RESPONSES[model] || RESPONSES['jung'];
            const template = templates[Math.floor(Math.random() * templates.length)];

            // 3. Construct result
            const interpretation = template.replace("{symbol}", randomWord.toUpperCase());

            resolve({
                transcription: text,
                interpretation: interpretation,
                modelUsed: model
            });
        }, 2000); // Simulate network delay
    });
};
