// What one dream costs, from measured consumption and rates you supply.
//
//   node scripts/estimate-cost.mjs --in 0.30 --out 2.50 --image 0.003 --dreams 500
//
//   --in      USD per 1M input tokens        (Gemini)
//   --out     USD per 1M output tokens       (Gemini — thinking bills at this rate)
//   --image   USD per image                  (Hugging Face)
//   --dreams  dreams per month, for the monthly line
//   --chat    chat turns per dream           (default 2)
//
// Rates are not hardcoded on purpose: they change, and a number baked into a
// script gets trusted long after it stopped being true. Check them at
//   https://ai.google.dev/pricing
//   https://huggingface.co/docs/inference-providers/pricing

// ── Measured, not estimated ──────────────────────────────────────────────────
// Taken from one real dream: 111 characters of Macedonian, Jungian model,
// interpretation + image + two chat turns. Token counts come from Gemini's own
// usageMetadata; thinking is total minus prompt minus visible output.
const MEASURED = {
    interpret:     { input: 278,  visible: 923, thinking: 1539, seconds: 14.8 },
    imagePrompt:   { input: 103,  visible:  39, thinking:  679, seconds:  5.1 },
    // Chat grows as the transcript does; this is the average of turns 1 and 2.
    // It plateaus once the 12-turn context cap starts dropping older messages.
    chatTurn:      { input: 1039, visible: 150, thinking:  824, seconds:  6.6 },
    // One SDXL call per dream, ~930 kB JPEG.
    imageSeconds: 10.6
};

function arg(name, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    if (i === -1 || i === process.argv.length - 1) return fallback;
    const value = Number(process.argv[i + 1]);
    return Number.isFinite(value) ? value : fallback;
}

const inRate    = arg('in', null);
const outRate   = arg('out', null);
const imageRate = arg('image', null);
const perMonth  = arg('dreams', 500);
const chatTurns = arg('chat', 2);

if (inRate === null || outRate === null || imageRate === null) {
    console.log(`
Usage: node scripts/estimate-cost.mjs --in <usd/1M> --out <usd/1M> --image <usd> [--dreams N] [--chat N]

Fill in today's rates from:
  https://ai.google.dev/pricing
  https://huggingface.co/docs/inference-providers/pricing

Consumption is already measured; only the rates are missing.
`);
    process.exit(1);
}

const usd = (n) => '$' + (n < 0.01 ? n.toFixed(6) : n.toFixed(4));

function tally(label, calls) {
    const input = calls.reduce((s, c) => s + c.n * c.call.input, 0);
    const output = calls.reduce((s, c) => s + c.n * (c.call.visible + c.call.thinking), 0);
    const thinking = calls.reduce((s, c) => s + c.n * c.call.thinking, 0);
    const seconds = calls.reduce((s, c) => s + c.n * c.call.seconds, 0);
    return { label, input, output, thinking, seconds };
}

const minimum = tally('interpretation only', [
    { n: 1, call: MEASURED.interpret }
]);

const withImage = tally('interpretation + image', [
    { n: 1, call: MEASURED.interpret },
    { n: 1, call: MEASURED.imagePrompt }
]);

const full = tally(`+ ${chatTurns} chat turn${chatTurns === 1 ? '' : 's'}`, [
    { n: 1, call: MEASURED.interpret },
    { n: 1, call: MEASURED.imagePrompt },
    { n: chatTurns, call: MEASURED.chatTurn }
]);

const scenarios = [
    { ...minimum, images: 0 },
    { ...withImage, images: 1, seconds: withImage.seconds + MEASURED.imageSeconds },
    { ...full, images: 1, seconds: full.seconds + MEASURED.imageSeconds }
];

console.log(`\nRates: input $${inRate}/1M, output $${outRate}/1M, image $${imageRate} each\n`);
console.log('  scenario                 input    output  thinking     Gemini      image      TOTAL   wait');
console.log('  ' + '-'.repeat(95));

for (const s of scenarios) {
    const gemini = (s.input / 1e6) * inRate + (s.output / 1e6) * outRate;
    const image = s.images * imageRate;
    console.log(
        '  ' + s.label.padEnd(24)
        + String(s.input).padStart(6) + String(s.output).padStart(10) + String(s.thinking).padStart(10)
        + usd(gemini).padStart(11) + usd(image).padStart(11) + usd(gemini + image).padStart(11)
        + (s.seconds.toFixed(0) + 's').padStart(7)
    );
}

const last = scenarios[scenarios.length - 1];
const perDream = (last.input / 1e6) * inRate + (last.output / 1e6) * outRate + last.images * imageRate;

console.log('  ' + '-'.repeat(95));
console.log(`\n  At ${perMonth} dreams a month: ${usd(perDream * perMonth)} — ${usd(perDream)} each\n`);

const thinkingCost = (last.thinking / 1e6) * outRate;
const thinkingShare = Math.round((thinkingCost / perDream) * 100);
console.log(`  Of that, ${usd(thinkingCost)} per dream (${thinkingShare}%) is reasoning you never see.`);
console.log(`  Switching to a model without a thinking budget, or capping it, is the\n  single biggest lever on this number.\n`);
