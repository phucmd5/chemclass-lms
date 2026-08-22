const apiKey = process.env.GEMINI_API_KEY;

async function listModelsDirectly() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log("Status:", res.status);
  if (data.models) {
    const supported = data.models
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name);
    console.log("Supported generateContent models:", supported);
  } else {
    console.log("Response data:", data);
  }
}

listModelsDirectly();
