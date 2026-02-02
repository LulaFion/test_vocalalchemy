import { useSynthesisStore } from '../../stores/synthesisStore';

const languages = [
  { id: 'en', label: '英語 (English)' },
  { id: 'zh', label: '中文 (Chinese Mandarin)' },
  { id: 'ja', label: '日語 (Japanese)' },
  { id: 'ko', label: '韓語 (Korean)' },
  { id: 'yue', label: '粵語 (Cantonese)' },
] as const;

export default function ScriptInput() {
  const { text, textLanguage, setText, setTextLanguage } = useSynthesisStore();

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="card">
      <div className="flex items-center gap-40 mb-4">
        <h3 className="text-lg font-semibold text-text-primary">文本輸入 (Script Input)</h3>

        {/* Language Selector */}
        <select
          value={textLanguage}
          onChange={(e) => setTextLanguage(e.target.value as typeof textLanguage)}
          className="input w-24 py-1.5 text-sm"
        >
          {languages.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Text Area */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="輸入您想要合成的文本... (Enter the text you want to synthesize...)"
        rows={6}
        className="textarea font-mono"
      />

      {/* Character/Word count */}
      <div className="flex justify-end gap-4 mt-2 text-text-muted text-sm">
        <span>{wordCount} 詞 (words)</span>
        <span>{charCount} 字符 (characters)</span>
      </div>
    </div>
  );
}
