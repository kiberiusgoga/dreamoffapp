import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isAdsenseConfigured } from '../services/adsense';

/**
 * Reachable signed out, deliberately: a privacy notice behind a login is not
 * a privacy notice, and AdSense requires a publicly accessible one.
 *
 * The text below describes what this application actually does — it was
 * written from the code, not from a template. The operator still has to fill
 * in the identity and contact details marked below, and have the result read
 * by someone qualified before relying on it.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-2">
            <h2 className="text-accent text-xs uppercase tracking-[0.2em] font-bold">{title}</h2>
            <div className="text-sm text-gray-400 leading-relaxed space-y-2">{children}</div>
        </section>
    );
}

export default function PrivacyScreen() {
    const navigate = useNavigate();
    const adsEnabled = isAdsenseConfigured();

    return (
        <div className="min-h-screen bg-background text-primary font-sans">
            <div className="max-w-2xl mx-auto px-5 py-10 space-y-8 animate-fade-in">

                <button
                    onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-surface/60 border border-border/20 rounded-xl text-sm text-gray-400 hover:text-primary hover:border-border/40 transition-all duration-200 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
                    <span className="font-medium">Back</span>
                </button>

                <header className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-surface border border-border/30 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-accent" />
                    </div>
                    <h1 className="text-3xl font-serif text-primary">Privacy</h1>
                    <p className="text-sm text-gray-500 italic">
                        A dream diary holds unusually personal writing. This page says plainly what
                        happens to it.
                    </p>
                </header>

                <div className="rounded-xl border border-dashed border-border/30 bg-surface/40 p-4">
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                        <span className="text-accent font-bold uppercase tracking-wider">Before launch:</span>{' '}
                        replace the bracketed placeholders with the operator&rsquo;s legal name, address
                        and contact address, and have this reviewed by someone qualified in your
                        jurisdiction. It describes the software accurately; it is not legal advice.
                    </p>
                </div>

                <Section title="Who holds this data">
                    <p>
                        DreamOff is operated by <strong className="text-gray-300">[operator legal name]</strong>,{' '}
                        <strong className="text-gray-300">[registered address]</strong>. For anything on this
                        page, write to <strong className="text-gray-300">[contact email]</strong>.
                    </p>
                </Section>

                <Section title="What is stored">
                    <p>When you create an account: your name, your email address, and your password.</p>
                    <p>
                        The password is never stored as you typed it. It is hashed with bcrypt, which is
                        one-way — nobody with access to the database can read it back, including the
                        operator.
                    </p>
                    <p>
                        For each dream you record: the text you wrote or dictated, the interpretation
                        returned for it, any generated image, the framework and language you chose, and
                        any conversation you have about that dream.
                    </p>
                </Section>

                <Section title="Where your dreams are sent">
                    <p>
                        This is the part worth reading twice. Asking for an interpretation sends the text
                        of that dream to <strong className="text-gray-300">Google</strong> (the Gemini
                        API). Generating an image sends a description derived from it to{' '}
                        <strong className="text-gray-300">Hugging Face</strong>. Continuing the
                        conversation about a dream sends that dream, its interpretation and the recent
                        messages to Google as well.
                    </p>
                    <p>
                        Those companies process the text under their own terms, and their handling of it
                        is outside this application&rsquo;s control. A dream you never ask to have
                        interpreted is never sent anywhere.
                    </p>
                </Section>

                <Section title="Staying signed in">
                    <p>
                        Signing in stores a token in your browser&rsquo;s local storage so you are not
                        asked again on every visit. It expires, and signing out removes it. It is not a
                        tracking cookie and it is not shared.
                    </p>
                    <p>
                        Your language preference is stored in the same place. Nothing else about you is
                        kept in the browser.
                    </p>
                </Section>

                <Section title="Advertising">
                    {adsEnabled ? (
                        <>
                            <p>
                                This site shows advertising through Google AdSense. Google may set cookies
                                and use device identifiers to select and measure ads, under its own privacy
                                terms.
                            </p>
                            <p>
                                Your dreams and your account details are never sent to the ad network.
                            </p>
                        </>
                    ) : (
                        <p>
                            No advertising is currently served, and no ad network script is loaded. If that
                            changes, this section will describe what the network receives — which will not
                            include your dreams or your account details.
                        </p>
                    )}
                </Section>

                <Section title="What you can do">
                    <p>
                        <strong className="text-gray-300">Take a copy.</strong> Profile &rarr; Export my
                        data gives you a JSON file with your account details and every dream, including
                        interpretations and conversations.
                    </p>
                    <p>
                        <strong className="text-gray-300">Delete everything.</strong> Profile &rarr; Delete
                        account removes your account, every dream, and every generated image from the
                        server. It asks for your password first, and it cannot be undone.
                    </p>
                    <p>
                        Deleting a single dream from its own screen removes that dream and its image the
                        same way.
                    </p>
                </Section>

                <Section title="How long it is kept">
                    <p>
                        Until you delete it. There is no automatic expiry, and deleted records are removed
                        rather than flagged as hidden.
                    </p>
                    <p className="text-gray-500">
                        Backups, if the operator keeps any, may hold a copy for a short period after
                        deletion. State that period here once your backup policy is settled:{' '}
                        <strong className="text-gray-300">[backup retention]</strong>.
                    </p>
                </Section>

                <footer className="pt-6 border-t border-border/20">
                    <p className="text-[11px] text-gray-600">
                        Last updated <strong className="text-gray-500">[date]</strong>. Material changes
                        will be announced in the app before they take effect.
                    </p>
                </footer>
            </div>
        </div>
    );
}
