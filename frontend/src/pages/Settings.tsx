import { useState } from 'react';

export default function Settings() {
  const [gptsovitsUrl, setGptsovitsUrl] = useState('http://localhost:9880');
  const [defaultLanguage, setDefaultLanguage] = useState('en_US');
  const [autoSave, setAutoSave] = useState(true);
  const [outputFormat, setOutputFormat] = useState('wav');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* GPT-SoVITS Connection */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          GPT-SoVITS 連接 (Connection)
        </h3>
        <label className="label">API 端點 (API Endpoint)</label>
        <input
          type="text"
          value={gptsovitsUrl}
          onChange={(e) => setGptsovitsUrl(e.target.value)}
          placeholder="http://localhost:9880"
          className="input"
        />
        <div className="flex items-center gap-2 mt-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-text-muted text-sm">已連接 (Connected)</span>
        </div>
      </div>

      {/* Default Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          預設設定 (Default Settings)
        </h3>

        <div className="space-y-4">
          <div>
            <label className="label">預設語言 (Default Language)</label>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
              className="input"
            >
              <option value="en_US">英語 (English)</option>
              <option value="zh_CN">中文 (Chinese)</option>
              <option value="ja_JP">日語 (Japanese)</option>
              <option value="ko_KR">韓語 (Korean)</option>
            </select>
          </div>

          <div>
            <label className="label">輸出格式 (Output Format)</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="input"
            >
              <option value="wav">WAV (未壓縮 Uncompressed)</option>
              <option value="mp3">MP3 (壓縮 Compressed)</option>
              <option value="flac">FLAC (無損 Lossless)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Auto Save */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          儲存 (Storage)
        </h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoSave}
            onChange={(e) => setAutoSave(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-text-secondary">
            自動儲存生成的音頻到輸出資料夾 (Auto-save generated audio to output folder)
          </span>
        </label>
      </div>

      {/* About */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">關於 (About)</h3>
        <div className="space-y-2 text-text-muted">
          <p>
            <span className="text-text-secondary">VocalAlchemy</span> v1.0.0
          </p>
          <p>
            由 (Powered by){' '}
            <span className="text-secondary">GPT-SoVITS-v2pro-20250604</span> 提供支援
          </p>
          <p className="text-sm">
            適用於遊戲開發和內容創作的 AI 角色語音系統。
            (AI Character Voice System for game development and content creation.)
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="btn-primary">儲存設定 (Save Settings)</button>
      </div>
    </div>
  );
}
