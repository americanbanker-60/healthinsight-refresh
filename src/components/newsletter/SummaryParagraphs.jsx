import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// Extract first N sentences from text
function getFirstNSentences(text, n = 4) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, n).join(" ").trim();
}

export default function SummaryParagraphs({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const preview = getFirstNSentences(text, 4);
  const isTruncated = preview.length < text.trim().length - 20;

  return (
    <div>
      <p className="text-slate-700 leading-relaxed text-sm">
        {expanded ? text.trim() : preview}
      </p>
      {isTruncated && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" />Show less</>
          ) : (
            <><ChevronDown className="w-3 h-3" />Read full summary</>
          )}
        </button>
      )}
    </div>
  );
}