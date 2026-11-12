# LabLens demo video: shot-by-shot script (target 2:50, hard limit 3:00)

**Setup before recording**
- A desktop Chrome with Gemini Nano downloaded (the status chip reads *Gemini Nano ready on this device*).
- The live URL is installed as a PWA.
- History is cleared: Help → *Delete all data on this device*.
- Have a printout or phone photo of `public/samples/en-cbc-anaemia.png` ready, and the Wi-Fi toggle visible in the OS tray.
- Record at 1080p. Use a voice-over (English). Add burned-in English subtitles too, to be safe.
- Narration is in *italics*. On-screen text overlays are in **bold**.

| # | Time | Shot | Narration / overlay |
|---|---|---|---|
| 1 | 0:00–0:12 | **Hook.** Close-up of a phone showing a WhatsApp message containing a lab report photo; the patient's name and phone number are visible and highlighted | *"Every day, millions of Indians get lab reports like this on WhatsApp: a table of abbreviations, in English, with their name, phone number and hospital ID on top."* |
| 2 | 0:12–0:24 | **Privacy problem.** A blurred generic chatbot upload box, with a red outline around the name/phone/ID area of the report | *"Pasting that into a chatbot sends your identity and your health data to a server. LabLens fixes that with hybrid AI."* **Overlay: LabLens · Firebase AI Logic · Gemini Nano + Gemini** |
| 3 | 0:24–0:38 | LabLens home in Chrome. Point at the green chip *Gemini Nano ready on this device*. Toggle the language buttons briefly | *"LabLens runs Gemini Nano inside Chrome through the Firebase AI Logic hybrid SDK, and falls back to Gemini in the cloud only when it has to."* |
| 4 | 0:38–0:50 | **Wi-Fi OFF.** Click the OS Wi-Fi icon and turn it off. The LabLens status changes to *Offline* | *"Watch: I'm turning the Wi-Fi off."* **Overlay: OFFLINE** |
| 5 | 0:50–1:12 | **On-device run.** Click *Choose file*, then pick `en-cbc-anaemia.png`. The steps animate (Read → Remove personal details → Check values → Explain), each with a green *Processed on device* badge. The report opens with Haemoglobin *Low*, the range bar and *"Talk to your doctor about…"* | *"Nano reads the photo on the device. LabLens's tested rules, not the AI, compare each value with the report's own range. Every answer is badged: processed on device."* |
| 6 | 1:12–1:22 | Open the *Privacy log* tab. Every entry shows *Stayed on this device* | *"The privacy log proves it: nothing left this laptop."* |
| 7 | 1:22–1:30 | **Wi-Fi ON.** Toggle the Wi-Fi back on. The status reads *Online* | *"Now back online."* |
| 8 | 1:30–1:58 | **Cloud fallback with redaction.** Click the *Kidney panel (urgent value)* sample (PDF). The red urgent banner appears for potassium 6.8. Open *What was removed before AI* to show the `[NAME] × 2`, `[ID]` and `[PHONE]` chips. Expand *View the redacted text*. Click *Run deeper analysis*: it gets a blue *Processed in cloud* badge. Go to the Privacy log and expand *Exactly what was sent*, which shows `[NAME]` placeholders and no name or phone number | *"For a long report, LabLens asks Gemini in the cloud for a deeper analysis. Only after redaction: names, phone and hospital IDs are replaced on the device, and the log shows exactly what was sent. Critical values trigger an urgent banner."* |
| 9 | 1:58–2:20 | **Hindi/Marathi switch.** On the report, click **हिन्दी**: the value explanations switch instantly, and the summary regenerates with a cloud badge. Click **मराठी**. Briefly show *On-device only* turned on, with the summary falling back to the *LabLens rules* badge | *"One tap for Hindi or Marathi. The value-by-value explanations are translated on the device. Nano can't write Hindi yet, so only the short narrative uses the cloud, on minimised data. Flip 'On-device only' and nothing leaves at all."* |
| 10 | 2:20–2:40 | **History trend.** Go to *History* and click *Load the sample diabetes series*. The HbA1c chart shows 7.6 → 7.0 → 6.4 with the normal band shaded. Switch the test to LDL | *"Reports are saved on your device, with optional Google sign-in sync of the redacted results to Firestore. Repeated tests become a trend, so you can see whether things are improving."* |
| 11 | 2:40–2:52 | **Close.** Quick montage: the camera button on a phone (cloud path with the masking dialog), the doctor-question checklist, the installed-PWA icon | *"LabLens: private by design, in the languages people actually speak, built with Firebase AI Logic, App Check and Remote Config. Assistive, not diagnostic: always talk to your doctor."* **Overlay: the live URL · github.com/madhavzanwar/firebase-hc** |

**Backup shot** (if Nano is unavailable on the recording machine): record step 5 on the cloud fallback path instead. Say so honestly in the narration ("on this laptop Nano isn't available, so the SDK falls back to the cloud"), and show the e2e on-device test output from `docs/qa-artifacts/e2e.txt`.
