/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RepoFileTree, Citation, RepoAnalysis, DataFlowGraph } from '../types';

// Helper to ensure we always get the freshest key from the environment
// immediately before a call.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || "" });

export interface InfographicResult {
    imageData: string | null;
    citations: Citation[];
}

export async function generateRepoAnalysis(
  repoName: string,
  fileTree: RepoFileTree[]
): Promise<RepoAnalysis> {
  const ai = getAiClient();
  const limitedTree = fileTree.slice(0, 400).map(f => f.path).join('\n');

  const prompt = `You are a world-class CTO and Software Architect.
  Analyze the following repository structure and generate a comprehensive technical report.
  
  REPO NAME: ${repoName}
  FILE STRUCTURE:
  ${limitedTree}
  
  Your report MUST include:
  1. FEATURES SUGGESTIONS: 3-5 innovative features that would naturally fit this codebase.
  2. GAP DETECTION: Identify 3-5 critical gaps (e.g., missing tests, docs, security, scalability bottlenecks).
  3. ROADMAP: A 3-phase development roadmap (MVP, Growth, Scale).
  4. ENGINEERING GUIDE: A concise technical onboarding summary for new developers.

  OUTPUT FORMAT: JSON only.
  SCHEMA:
  {
    "features": [{"title": "string", "description": "string", "priority": "High" | "Medium" | "Low"}],
    "gaps": [{"title": "string", "description": "string", "impact": "string"}],
    "roadmap": [{"phase": "string", "tasks": ["string"]}],
    "guide": [{"title": "string", "content": "string"}]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    return JSON.parse(text) as RepoAnalysis;
  } catch (error) {
    console.error("Gemini Repo Analysis failed:", error);
    throw error;
  }
}

export async function generateInfographic(
  repoName: string, 
  fileTree: RepoFileTree[], 
  style: string, 
  is3D: boolean = false,
  language: string = "English"
): Promise<string | null> {
  const ai = getAiClient();
  // Summarize architecture for the image prompt
  const limitedTree = fileTree.slice(0, 150).map(f => f.path).join(', ');
  
  let styleGuidelines = "";
  let dimensionPrompt = "";

  if (is3D) {
      // OVERRIDE standard styles for a specific "Tabletop Model" look
      styleGuidelines = `VISUAL STYLE: Photorealistic Miniature Diorama. The data flow should look like a complex, glowing 3D printed physical model sitting on a dark, reflective executive desk.`;
      dimensionPrompt = `PERSPECTIVE & RENDER: Isometric view with TILT-SHIFT depth of field (blurry foreground/background) to make it look like a small, tangible object on a table. Cinematic volumetric lighting. Highly detailed, 'octane render' style.`;
  } else {
      // Standard 2D styles or Custom
      switch (style) {
          case "Hand-Drawn Blueprint":
              styleGuidelines = `VISUAL STYLE: Technical architectural blueprint. Dark blue background with white/light blue hand-drawn lines. Looks like a sketch on drafting paper.`;
              break;
          case "Corporate Minimal":
              styleGuidelines = `VISUAL STYLE: Clean, corporate, minimalist. White background, lots of whitespace. Use a limited, professional color palette (greys, navy blues).`;
              break;
          case "Neon Cyberpunk":
              styleGuidelines = `VISUAL STYLE: Dark mode cyberpunk. Black background with glowing neon pink, cyan, and violet lines and nodes. High contrast, futuristic look.`;
              break;
          case "Modern Data Flow":
              styleGuidelines = `VISUAL STYLE: Replicate "Androidify Data Flow" aesthetic but optimized for high-visibility DARK MODE. Deep navy background (#050c1a). Vibrant, high-contrast neon blue and cyan curved arrows with INCREASED LINE THICKNESS (bold strokes). Ensure text labels on arrows are readable, centered perfectly on the lines, and use a distinct glow or background pill for maximum clarity. DATABASE NODES: Represent using a distinct cylinder or stacked disks icon for clear identification.`;
              break;
          default:
              // Handle custom style string
              if (style && style !== "Custom") {
                  styleGuidelines = `VISUAL STYLE: ${style}.`;
              } else {
                  styleGuidelines = `VISUAL STYLE: Replicate "Androidify Data Flow" aesthetic. Light blue (#eef8fe) solid background. Colorful, flat vector icons. Smooth, bright blue curved arrows.`;
              }
              break;
      }
      dimensionPrompt = "Perspective: Clean 2D flat diagrammatic view straight-on. No 3D effects.";
  }

  const baseStylePrompt = `
  STRICT VISUAL STYLE GUIDELINES:
  ${styleGuidelines}
  - LAYOUT: Distinct Left-to-Right flow.
  - CENTRAL CONTAINER: Group core logic inside a clearly defined central area.
  - ICONS: Use relevant technical icons (databases, servers, code files, users).
  - TYPOGRAPHY: Highly readable technical font. Text MUST be in ${language}.
  `;

  const prompt = `Create a highly detailed technical logical data flow diagram infographic for GitHub repository : "${repoName}".
  
  ${baseStylePrompt}
  ${dimensionPrompt}
  
  Repository Context: ${limitedTree}...
  
  Diagram Content Requirements:
  1. Title exactly: "${repoName} Data Flow" (Translated to ${language} if not English)
  2. Visually map the likely data flow based on the provided file structure.
  3. Ensure the "Input -> Processing -> Output" structure is clear.
  4. Add short, clear text labels to connecting arrows indicating data type (e.g., "JSON", "Auth Token").
  5. IMPORTANT: All text labels and explanations in the image must be written in ${language}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini infographic generation failed:", error);
    throw error;
  }
}

export async function generateRepoGraph(
  repoName: string,
  fileTree: RepoFileTree[]
): Promise<DataFlowGraph> {
  const ai = getAiClient();
  const limitedTree = fileTree.slice(0, 200).map(f => f.path).join('\n');

  const prompt = `Analyze the following repository structure and generate a logical data flow graph.
  Focus on the architectural relationship between components, services, and databases.
  
  REPO NAME: ${repoName}
  FILE STRUCTURE:
  ${limitedTree}
  
  OUTPUT FORMAT: JSON only.
  Each node MUST have an "id", a "label", and a "group" (number).
  Each link MUST have "source" and "target" IDs, and a "value" (importance score 1-10).
  Groups: 1:Users, 2:Frontend, 3:API/Controllers, 4:Business Logic/Services, 5:Databases/Storage, 6:External APIs.
  
  SCHEMA:
  {
    "nodes": [{"id": "string", "label": "string", "group": number}],
    "links": [{"source": "string", "target": "string", "value": number}]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    return JSON.parse(text) as DataFlowGraph;
  } catch (error) {
    console.error("Gemini Repo Graph generation failed:", error);
    // Fallback to a very simple graph if AI fails
    return {
      nodes: [{ id: 'root', label: repoName, group: 1 }],
      links: []
    };
  }
}

export async function askRepoQuestion(question: string, infographicBase64: string, fileTree: RepoFileTree[]): Promise<string> {
  const ai = getAiClient();
  // Provide context about the file structure to supplement the image
  const limitedTree = fileTree.slice(0, 300).map(f => f.path).join('\n');
  
  const prompt = `You are a senior software architect reviewing a project.
  
  Attached is an architectural infographic of the project.
  Here is the actual file structure of the repository:
  ${limitedTree}
  
  User Question: "${question}"
  
  Using BOTH the visual infographic and the file structure as context, answer the user's question. 
  If they ask about optimization, suggest specific areas based on the likely bottlenecks visible in standard architectures like this.
  Keep answers concise, technical, and helpful.`;

  try {
    const response = await ai.models.generateContent({
       model: 'gemini-3-pro-preview',
       contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: infographicBase64
            }
          },
          { text: prompt }
        ]
      }
    });

    return response.text || "I couldn't generate an answer at this time.";
  } catch (error) {
    console.error("Gemini Q&A failed:", error);
    throw error;
  }
}

export async function askNodeSpecificQuestion(
  nodeLabel: string, 
  question: string, 
  fileTree: RepoFileTree[]
): Promise<string> {
  const ai = getAiClient();
  const limitedTree = fileTree.slice(0, 300).map(f => f.path).join('\n');
  
  const prompt = `You are a senior software architect analyzing a repository.
  
  The user is asking about a specific node in the dependency graph labeled: "${nodeLabel}".
  
  Repository File Structure Context (first 300 files):
  ${limitedTree}
  
  User Question: "${question}"
  
  Based on the node name "${nodeLabel}" and the file structure, explain what this component likely does, its responsibilities, and answer the specific question.
  Keep the response technical, concise, and helpful for a developer.`;

  try {
    const response = await ai.models.generateContent({
       model: 'gemini-3-pro-preview',
       contents: {
        parts: [
          { text: prompt }
        ]
      }
    });

    return response.text || "I couldn't generate an answer at this time.";
  } catch (error) {
    console.error("Gemini Node Q&A failed:", error);
    throw error;
  }
}

export async function generateArticleInfographic(
  url: string, 
  style: string, 
  onProgress?: (stage: string) => void,
  language: string = "English"
): Promise<InfographicResult> {
    const ai = getAiClient();
    // PHASE 1: Content Understanding & Structural Breakdown (The "Planner")
    if (onProgress) onProgress("RESEARCHING & ANALYZING CONTENT...");
    
    let structuralSummary = "";
    let citations: Citation[] = [];

    try {
        const analysisPrompt = `You are an expert Information Designer. Your goal is to extract the essential structure from a web page to create a clear, educational infographic.

        Analyze the content at this URL: ${url}
        
        TARGET LANGUAGE: ${language}.
        
        Provide a structured breakdown specifically designed for visual representation in ${language}:
        1. INFOGRAPHIC HEADLINE: The core topic in 5 words or less (in ${language}).
        2. KEY TAKEAWAYS: The 3 to 5 most important distinct points, steps, or facts (in ${language}). THESE WILL BE THE MAIN SECTIONS OF THE IMAGE.
        3. SUPPORTING DATA: Any specific numbers, percentages, or very short quotes that add credibility.
        4. VISUAL METAPHOR IDEA: Suggest ONE simple visual concept that best fits this content (e.g., "a roadmap with milestones", "a funnel", "three contrasting pillars", "a circular flowchart").
        
        Keep the output concise and focused purely on what should be ON the infographic. Ensure all content is in ${language}.`;

        // Switch to 'gemini-3-pro-image-preview' for research phase as requested.
        const analysisResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: analysisPrompt,
            config: {
                tools: [{ googleSearch: {} }],
                // Do NOT set responseMimeType or responseSchema when using tools
            }
        });
        structuralSummary = analysisResponse.text || "";

        // Extract citations from grounding metadata with Titles
        const chunks = analysisResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            chunks.forEach((chunk: any) => {
                if (chunk.web?.uri) {
                    citations.push({
                        uri: chunk.web.uri,
                        title: chunk.web.title || "" // Default to empty, handle in UI
                    });
                }
            });
            // Deduplicate citations based on URI
            const uniqueCitations = new Map();
            citations.forEach(c => uniqueCitations.set(c.uri, c));
            citations = Array.from(uniqueCitations.values());
        }

    } catch (e) {
        console.warn("Content analysis failed, falling back to direct URL prompt", e);
        structuralSummary = `Create an infographic about: ${url}. Translate text to ${language}.`;
    }

    // PHASE 2: Visual Synthesis (The "Artist")
    if (onProgress) onProgress("DESIGNING & RENDERING INFOGRAPHIC...");

    let styleGuidelines = "";
    switch (style) {
        case "Fun & Playful":
            styleGuidelines = `STYLE: Fun, playful, vibrant 2D vector illustrations. Use bright colors, rounded shapes, and a friendly tone.`;
            break;
        case "Clean Minimalist":
            styleGuidelines = `STYLE: Ultra-minimalist. Lots of whitespace, thin lines, limited color palette (1-2 accent colors max). Very sophisticated and airy.`;
            break;
        case "Dark Mode Tech":
            styleGuidelines = `STYLE: Dark mode technical aesthetic. Dark slate/black background with bright, glowing accent colors (cyan, lime green) for data points.`;
            break;
        case "Modern Editorial":
            styleGuidelines = `STYLE: Modern, flat vector illustration style. Clean, professional, and editorial (like a high-end tech magazine). Cohesive, mature color palette.`;
            break;
        default:
            // Custom style logic
             if (style && style !== "Custom") {
                styleGuidelines = `STYLE: Custom User Style: "${style}".`;
             } else {
                styleGuidelines = `STYLE: Modern, flat vector illustration style. Clean, professional, and editorial (like a high-end tech magazine). Cohesive, mature color palette.`;
             }
            break;
    }

    const imagePrompt = `Create a professional, high-quality educational infographic based strictly on this structured content plan:

    ${structuralSummary}

    VISUAL DESIGN RULES:
    - ${styleGuidelines}
    - LANGUAGE: The text within the infographic MUST be written in ${language}.
    - LAYOUT: MUST follow the "VISUAL METAPHOR IDEA" from the plan above if one was provided.
    - TYPOGRAPHY: Clean, highly readable sans-serif fonts. The "INFOGRAPHIC HEADLINE" must be prominent at the top.
    - CONTENT: Use the actual text from "KEY TAKEAWAYS" in the image. Do not use placeholder text like Lorem Ipsum.
    - GOAL: The image must be informative and readable as a standalone graphic.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [{ text: imagePrompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        let imageData = null;
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                    imageData = part.inlineData.data;
                    break;
                }
            }
        }
        return { imageData, citations };
    } catch (error) {
        console.error("Article infographic generation failed:", error);
        throw error;
    }
}

export async function editImageWithGemini(base64Data: string, mimeType: string, prompt: string): Promise<string | null> {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini image editing failed:", error);
    throw error;
  }
}
