export interface MtSection {
  title: string;
  level: number;
  content: string;
  subsections: MtSection[];
}

export interface MtObject {
  rawContent: string;
  sections: MtSection[];
  concepts: string[];
  summary: string;
  references: string[];
  searchIndex: string;
  fileName?: string;
  fileType?: string;
}

function extractSections(text: string): MtSection[] {
  const lines = text.split("\n");
  const sections: MtSection[] = [];
  const course: MtSection[] = [];

  for (const line of lines) {
    const h6 = line.match(/^######\s+(.+)/);
    const h5 = line.match(/^#####\s+(.+)/);
    const h4 = line.match(/^####\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);

    const match = h1 || h2 || h3 || h4 || h5 || h6;
    const level = h1 ? 1 : h2 ? 2 : h3 ? 3 : h4 ? 4 : h5 ? 5 : h6 ? 6 : 0;

    if (match && level > 0) {
      const section: MtSection = {
        title: match[1].trim(),
        level,
        content: "",
        subsections: [],
      };

      while (course.length > 0 && course[course.length - 1].level >= level) {
        course.pop();
      }

      if (course.length === 0) {
        sections.push(section);
      } else {
        course[course.length - 1].subsections.push(section);
      }
      course.push(section);
    } else if (course.length > 0) {
      course[course.length - 1].content += line + "\n";
    }
  }

  return sections;
}

function extractConcepts(text: string): string[] {
  const concepts = new Set<string>();

  const boldMatches = text.matchAll(/\*\*([^*]{3,40})\*\*/g);
  for (const m of boldMatches) concepts.add(m[1].trim());

  const backtickMatches = text.matchAll(/`([^`]{2,30})`/g);
  for (const m of backtickMatches) concepts.add(m[1].trim());

  const definitionMatches = text.matchAll(/^([A-Z][a-zA-Z\s]{2,30})(?:\s*[:—]\s*|\s+is\s+|\s+refers\s+to\s+)/gm);
  for (const m of definitionMatches) {
    const term = m[1].trim();
    if (term.length > 2 && term.length < 40) concepts.add(term);
  }

  return Array.from(concepts).slice(0, 50);
}

function extractReferences(text: string): string[] {
  const refs: string[] = [];

  const urlMatches = text.matchAll(/https?:\/\/[^\s)>\]"]+/g);
  for (const m of urlMatches) refs.push(m[0]);

  const citationMatches = text.matchAll(/\[(\d+)\]\s+[A-Z][^[\n]{10,120}/g);
  for (const m of citationMatches) refs.push(m[0].trim());

  return [...new Set(refs)].slice(0, 30);
}

function generateSummary(text: string): string {
  const sentences = text
    .replace(/#+\s+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`[^`]+`/g, "")
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 30);

  return sentences.slice(0, 3).join(". ") + (sentences.length > 0 ? "." : "");
}

function buildSearchIndex(text: string, concepts: string[]): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3);

  const wordFreq = new Map<string, number>();
  for (const w of words) wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);

  const sorted = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([w]) => w);

  return [...new Set([...concepts.map(c => c.toLowerCase()), ...sorted])].join(" ");
}

export function transformToMt(rawContent: string, fileName?: string, fileType?: string): MtObject {
  const sections = extractSections(rawContent);
  const concepts = extractConcepts(rawContent);
  const references = extractReferences(rawContent);
  const summary = generateSummary(rawContent);
  const searchIndex = buildSearchIndex(rawContent, concepts);

  return {
    rawContent,
    sections,
    concepts,
    summary,
    references,
    searchIndex,
    fileName,
    fileType,
  };
}

export function parseTextContent(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}
