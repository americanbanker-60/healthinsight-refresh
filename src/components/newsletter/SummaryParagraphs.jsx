import React from "react";

/**
 * Splits a long summary text into ~3-5 digestible paragraphs.
 * Strategy: split on sentence boundaries, then group into ~3 chunks.
 */
function chunkSentences(text, targetChunks = 4) {
  // Split into sentences
  const sentences = text
    .replace(/([.!?])\s+/g, "$1\n")
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 20);

  if (sentences.length <= targetChunks) {
    return sentences;
  }

  const perChunk = Math.ceil(sentences.length / targetChunks);
  const chunks = [];
  for (let i = 0; i < sentences.length; i += perChunk) {
    const group = sentences.slice(i, i + perChunk).join(" ");
    if (group.trim()) chunks.push(group.trim());
  }
  return chunks;
}

const CHUNK_LABELS = ["Context", "What Happened", "Financial & Strategic Backdrop", "PE Implications", "Risks & Outlook"];

export default function SummaryParagraphs({ text }) {
  if (!text) return null;

  // If the text already has newlines, respect them; otherwise auto-chunk
  const hasNaturalBreaks = (text.match(/\n/g) || []).length >= 2;
  
  let paragraphs;
  if (hasNaturalBreaks) {
    paragraphs = text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
  } else {
    paragraphs = chunkSentences(text, 4);
  }

  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex-shrink-0 w-1 rounded-full bg-blue-300 mt-1" />
          <div>
            {CHUNK_LABELS[i] && paragraphs.length > 1 && (
              <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide block mb-1">
                {CHUNK_LABELS[i]}
              </span>
            )}
            <p className="text-slate-700 leading-relaxed text-sm">{para}</p>
          </div>
        </div>
      ))}
    </div>
  );
}