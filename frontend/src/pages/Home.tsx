import {
  CharacterSelector,
  EmotionSelector,
  ScriptInput,
  AdvancedParams,
  GenerateButton,
  AudioPreview,
} from '../components/synthesis';

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Character Selection */}
      <CharacterSelector />

      {/* Emotion & Style */}
      <EmotionSelector />

      {/* Script Input */}
      <ScriptInput />

      {/* Advanced Parameters */}
      <AdvancedParams />

      {/* Generate Button */}
      <div className="flex justify-center py-4">
        <GenerateButton />
      </div>

      {/* Audio Preview */}
      <AudioPreview />
    </div>
  );
}
