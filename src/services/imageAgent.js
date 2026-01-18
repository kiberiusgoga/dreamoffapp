/**
 * Mocks the Gemini Image Generation Agent.
 * Returns a URL to a high-quality abstract/surreal image.
 */

const IMAGES = [
    "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=800", // Abstract Nebula
    "https://images.unsplash.com/photo-1530538987395-032d1800fdd4?auto=format&fit=crop&q=80&w=800", // Liquid Gold
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=800", // Misty Landscape
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=800", // Abstract Paint
    "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&q=80&w=800"  // Geometry
];

export const generateDreamImage = async (text) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const randomImage = IMAGES[Math.floor(Math.random() * IMAGES.length)];
            resolve(randomImage);
        }, 2500);
    });
};
