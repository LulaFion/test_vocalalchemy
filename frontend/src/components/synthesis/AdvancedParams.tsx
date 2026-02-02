import { useState } from 'react';
import { useSynthesisStore } from '../../stores/synthesisStore';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

export default function AdvancedParams() {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    speed,
    topK,
    topP,
    temperature,
    freeze,
    pauseDuration,
    setSpeed,
    setTopK,
    setTopP,
    setTemperature,
    setFreeze,
    setPauseDuration,
    resetParams,
  } = useSynthesisStore();

  return (
    <div className="card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="text-lg font-semibold text-text-primary">
          進階參數 (Advanced Parameters)
        </h3>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-text-muted" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-6 space-y-6">
          {/* Speed and Pause Duration - side by side */}
          <div className="grid grid-cols-2 gap-6">
            {/* Speed */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="label mb-0">語速 (Speech Rate)</label>
                <span className="text-secondary">{speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-border rounded-full appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-primary
                           [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-text-muted text-xs mt-1">
                <span>0.5x 慢 (Slow)</span>
                <span>2.0x 快 (Fast)</span>
              </div>
            </div>

            {/* Pause Duration */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="label mb-0">句間停頓時長 (Pause)</label>
                <span className="text-secondary">{pauseDuration.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.1"
                value={pauseDuration}
                onChange={(e) => setPauseDuration(parseFloat(e.target.value))}
                className="w-full h-2 bg-border rounded-full appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-primary
                           [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-text-muted text-xs mt-1">
                <span>0s</span>
                <span>1.0s</span>
              </div>
            </div>
          </div>

          {/* GPT Sampling Parameters */}
          <div className="grid grid-cols-3 gap-6">
            {/* Top K */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="label mb-0">Top K</label>
                <span className="text-secondary">{topK}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full h-2 bg-border rounded-full appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-primary
                           [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-text-muted text-xs mt-1">
                <span>1 (死板)</span>
                <span>100 (語氣變化)</span>
              </div>
            </div>

            {/* Top P */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="label mb-0">Top P</label>
                <span className="text-secondary">{topP.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full h-2 bg-border rounded-full appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-primary
                           [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-text-muted text-xs mt-1">
                <span>0.1 (聲音乾淨)</span>
                <span>1.0 (特殊腔調)</span>
              </div>
            </div>

            {/* Temperature */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="label mb-0">情感的「溫度計」(Temperature)</label>
                <span className="text-secondary">{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-border rounded-full appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-primary
                           [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-text-muted text-xs mt-1">
                <span>0.1 (冷靜)</span>
                <span>1.0 (加戲)</span>
              </div>
            </div>
          </div>

          {/* Freeze checkbox */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="freeze"
              checked={freeze}
              onChange={(e) => setFreeze(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="freeze" className="text-text-secondary cursor-pointer">
              凍結 (相同輸入產生一致輸出) (Freeze)
            </label>
          </div>

          {/* Troubleshooting Tips */}
          <div className="bg-surface/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-text-primary mb-3">調整方案 (Troubleshooting Tips):</h4>
            <ul className="text-xs text-text-muted space-y-1.5">
              <li>聲音老是讀錯字、胡言亂語？ → 降低 溫度 (Temp) 至 0.4</li>
              <li>聲音聽起來像機器人、太無聊？ → 升高 溫度 (Temp) 至 0.9</li>
              <li>聲音有很多刺耳的電音、雜質？ → 降低 Top-P 或 Top-K</li>
              <li>聲音完全不像參考音訊的語氣？ → 升高 溫度，或換一段更強烈的情感種子</li>
            </ul>
          </div>

          {/* Reset button */}
          <button onClick={resetParams} className="btn-ghost text-sm">
            重置為預設值 (Reset to Defaults)
          </button>
        </div>
      )}
    </div>
  );
}
